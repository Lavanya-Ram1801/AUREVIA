import type { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { canManage, findCourseByIdOrSlug } from './courseController.js';

async function ownedCourse(req: Request, courseIdOrSlug: string) {
  const course = await findCourseByIdOrSlug(courseIdOrSlug);
  if (!course) throw notFound('Course not found');
  if (!canManage(req.user!, course)) throw forbidden('You can only manage your own courses');
  return course;
}
async function ownedSection(req: Request, sectionId: string) {
  const section = await prisma.courseSection.findUnique({ where: { id: sectionId }, include: { course: true } });
  if (!section) throw notFound('Section not found');
  if (!canManage(req.user!, section.course)) throw forbidden('You can only manage your own courses');
  return section;
}
async function ownedLesson(req: Request, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { section: { include: { course: true } } } });
  if (!lesson) throw notFound('Lesson not found');
  if (!canManage(req.user!, lesson.section.course)) throw forbidden('You can only manage your own courses');
  return lesson;
}

/** Full editable curriculum (including drafts and lesson content) for the owner. */
export const getCurriculum = asyncHandler(async (req: Request, res: Response) => {
  const course = await ownedCourse(req, req.params.id!);
  const sections = await prisma.courseSection.findMany({
    where: { courseId: course.id },
    orderBy: { position: 'asc' },
    include: { lessons: { orderBy: { position: 'asc' } } },
  });
  res.json({ data: { course, sections } });
});

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const course = await ownedCourse(req, req.params.id!);
  const last = await prisma.courseSection.aggregate({ where: { courseId: course.id }, _max: { position: true } });
  const section = await prisma.courseSection.create({
    data: { courseId: course.id, title: (req.body as { title: string }).title, position: (last._max.position ?? -1) + 1 },
  });
  res.status(201).json({ data: section });
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await ownedSection(req, req.params.sectionId!);
  const body = req.body as { title?: string };
  const updated = await prisma.courseSection.update({ where: { id: section.id }, data: { ...(body.title ? { title: body.title } : {}) } });
  res.json({ data: updated });
});

export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await ownedSection(req, req.params.sectionId!);
  await prisma.courseSection.delete({ where: { id: section.id } });
  res.json({ data: { ok: true } });
});

export const reorderSections = asyncHandler(async (req: Request, res: Response) => {
  const course = await ownedCourse(req, req.params.id!);
  const { ids } = req.body as { ids: string[] };
  const existing = await prisma.courseSection.findMany({ where: { courseId: course.id }, select: { id: true } });
  if (ids.length !== existing.length || !ids.every((id) => existing.some((e) => e.id === id))) {
    throw badRequest('Reorder list must contain exactly this course\'s sections');
  }
  await prisma.$transaction(ids.map((id, position) => prisma.courseSection.update({ where: { id }, data: { position } })));
  res.json({ data: { ok: true } });
});

export const createLesson = asyncHandler(async (req: Request, res: Response) => {
  const section = await ownedSection(req, req.params.sectionId!);
  const body = req.body as { title: string; content: string; videoUrl?: string | null; resourceUrl?: string | null; resourceName?: string | null; durationMinutes: number; isPublished: boolean };
  const last = await prisma.lesson.aggregate({ where: { sectionId: section.id }, _max: { position: true } });
  const lesson = await prisma.lesson.create({
    data: {
      sectionId: section.id,
      title: body.title,
      content: body.content,
      videoUrl: body.videoUrl || null,
      resourceUrl: body.resourceUrl || null,
      resourceName: body.resourceName ?? null,
      durationMinutes: body.durationMinutes,
      isPublished: body.isPublished,
      position: (last._max.position ?? -1) + 1,
    },
  });
  res.status(201).json({ data: lesson });
});

export const updateLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await ownedLesson(req, req.params.lessonId!);
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of ['title', 'content', 'resourceName', 'durationMinutes', 'isPublished'] as const) if (k in body) data[k] = body[k];
  for (const k of ['videoUrl', 'resourceUrl'] as const) if (k in body) data[k] = (body[k] as string) || null;
  const updated = await prisma.lesson.update({ where: { id: lesson.id }, data });
  res.json({ data: updated });
});

export const deleteLesson = asyncHandler(async (req: Request, res: Response) => {
  const lesson = await ownedLesson(req, req.params.lessonId!);
  await prisma.lesson.delete({ where: { id: lesson.id } });
  res.json({ data: { ok: true } });
});

export const reorderLessons = asyncHandler(async (req: Request, res: Response) => {
  const section = await ownedSection(req, req.params.sectionId!);
  const { ids } = req.body as { ids: string[] };
  const existing = await prisma.lesson.findMany({ where: { sectionId: section.id }, select: { id: true } });
  if (ids.length !== existing.length || !ids.every((id) => existing.some((e) => e.id === id))) {
    throw badRequest('Reorder list must contain exactly this section\'s lessons');
  }
  await prisma.$transaction(ids.map((id, position) => prisma.lesson.update({ where: { id }, data: { position } })));
  res.json({ data: { ok: true } });
});
