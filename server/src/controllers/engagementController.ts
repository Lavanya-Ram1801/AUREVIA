import type { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { instructorSelect, lessonCounts, ratingStats, shapeCourseCard } from '../services/courseService.js';
import { issueCertificate, verifyCertificate } from '../services/certificateService.js';
import { notify } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forbidden, notFound } from '../utils/httpError.js';
import { findCourseByIdOrSlug } from './courseController.js';

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course || course.status !== 'PUBLISHED') throw notFound('Course not found');
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const [items, total, stats] = await Promise.all([
    prisma.review.findMany({
      where: { courseId: course.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.review.count({ where: { courseId: course.id } }),
    ratingStats([course.id]),
  ]);
  res.json({ data: items, meta: { page, pageSize, total, average: stats.get(course.id)?.avg ?? 0 } });
});

/** Create or edit the caller's single review for a course. Only enrolled students may review. */
export const upsertReview = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course || course.status !== 'PUBLISHED') throw notFound('Course not found');
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: course.id } } });
  if (!enrollment) throw forbidden('Only enrolled students can review this course');
  const { rating, comment } = req.body as { rating: number; comment?: string | null };
  const review = await prisma.review.upsert({
    where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
    create: { userId: req.user!.id, courseId: course.id, rating, comment: comment || null },
    update: { rating, comment: comment || null },
  });
  res.status(201).json({ data: review });
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course) throw notFound('Course not found');
  // Users can only delete their own review; admins may moderate any review via ?userId=.
  const targetUserId = req.user!.role === 'ADMIN' && typeof req.query.userId === 'string' ? req.query.userId : req.user!.id;
  await prisma.review.deleteMany({ where: { courseId: course.id, userId: targetUserId } });
  res.json({ data: { ok: true } });
});

export const addWishlist = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course || course.status !== 'PUBLISHED') throw notFound('Course not found');
  await prisma.wishlist.upsert({
    where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
    create: { userId: req.user!.id, courseId: course.id },
    update: {},
  });
  res.status(201).json({ data: { wishlisted: true } });
});

export const removeWishlist = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course) throw notFound('Course not found');
  await prisma.wishlist.deleteMany({ where: { userId: req.user!.id, courseId: course.id } });
  res.json({ data: { wishlisted: false } });
});

export const listWishlist = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user!.id, course: { status: 'PUBLISHED' } },
    orderBy: { createdAt: 'desc' },
    include: { course: { include: { instructor: { select: instructorSelect }, category: true, _count: { select: { enrollments: true } } } } },
  });
  const ids = items.map((i) => i.courseId);
  const [lc, rs] = await Promise.all([lessonCounts(ids), ratingStats(ids)]);
  res.json({ data: items.map((i) => shapeCourseCard(i.course, lc.get(i.courseId) ?? 0, rs.get(i.courseId), new Set())) });
});

export const generateCertificate = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course) throw notFound('Course not found');
  const { certificate, created } = await issueCertificate(req.user!.id, course.id);
  if (created) {
    await notify(req.user!.id, 'CERTIFICATE', 'Certificate issued', `Your certificate for "${course.title}" is ready.`, `/certificates/${certificate.certificateId}`);
  }
  res.status(created ? 201 : 200).json({ data: certificate });
});

export const myCertificates = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.certificate.findMany({ where: { userId: req.user!.id }, orderBy: { issuedAt: 'desc' } });
  res.json({ data: items });
});

export const verifyCertificateHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await verifyCertificate(req.params.certificateId!) });
});
