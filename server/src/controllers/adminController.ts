import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { notify } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { publicUser } from '../utils/serialize.js';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { q, role, active, page, pageSize } = req.query as unknown as { q?: string; role?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'; active?: 'true' | 'false'; page: number; pageSize: number };
  const where: Prisma.UserWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
    ...(role ? { role } : {}),
    ...(active ? { isActive: active === 'true' } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { enrollments: true, coursesTaught: true } } } }),
    prisma.user.count({ where }),
  ]);
  res.json({ data: rows.map((u) => ({ ...publicUser(u), enrollmentCount: u._count.enrollments, courseCount: u._count.coursesTaught })), meta: { page, pageSize, total } });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id! }, include: { _count: { select: { enrollments: true, coursesTaught: true, certificates: true, reviews: true } } } });
  if (!u) throw notFound('User not found');
  res.json({ data: { ...publicUser(u), counts: u._count } });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id! } });
  if (!target) throw notFound('User not found');
  const { role, isActive } = req.body as { role?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'; isActive?: boolean };
  // Prevent admins from locking themselves (or the platform) out.
  if (target.id === req.user!.id && ((role && role !== 'ADMIN') || isActive === false)) {
    throw badRequest('You cannot demote or deactivate your own account');
  }
  const data: Prisma.UserUpdateInput = {};
  if (role) data.role = role;
  if (isActive !== undefined) {
    data.isActive = isActive;
    if (!isActive) data.tokenVersion = { increment: 1 }; // ends active sessions immediately
  }
  if (role && role !== target.role) data.tokenVersion = { increment: 1 };
  const updated = await prisma.user.update({ where: { id: target.id }, data });
  if (role && role !== target.role) {
    await notify(target.id, 'SYSTEM', 'Your role was updated', `Your account role is now ${role.toLowerCase()}.`);
  }
  res.json({ data: publicUser(updated) });
});

export const listAdminCourses = asyncHandler(async (req: Request, res: Response) => {
  const { q, status, page, pageSize } = req.query as unknown as { q?: string; status?: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'; page: number; pageSize: number };
  const where: Prisma.CourseWhereInput = {
    ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
    ...(status ? { status } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.course.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { instructor: { select: { id: true, name: true } }, category: true, _count: { select: { enrollments: true, reviews: true } } } }),
    prisma.course.count({ where }),
  ]);
  res.json({
    data: rows.map((c) => ({ id: c.id, slug: c.slug, title: c.title, status: c.status, level: c.level, createdAt: c.createdAt, instructor: c.instructor, category: c.category.name, enrollmentCount: c._count.enrollments, reviewCount: c._count.reviews })),
    meta: { page, pageSize, total },
  });
});

/** Moderation: admins can force-unpublish (or re-publish) any course. */
export const moderateCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id! } });
  if (!course) throw notFound('Course not found');
  const { status } = req.body as { status: 'PUBLISHED' | 'UNPUBLISHED' };
  if (status === 'PUBLISHED') {
    const lessons = await prisma.lesson.count({ where: { isPublished: true, section: { courseId: course.id } } });
    if (lessons === 0) throw badRequest('Course has no published lessons');
  }
  const updated = await prisma.course.update({ where: { id: course.id }, data: { status, ...(status === 'PUBLISHED' ? { publishedAt: course.publishedAt ?? new Date() } : {}) } });
  await notify(course.instructorId, 'COURSE_UPDATE', 'Course status changed by an admin', `"${course.title}" is now ${status.toLowerCase()}.`, `/instructor/courses/${course.id}`);
  res.json({ data: updated });
});
