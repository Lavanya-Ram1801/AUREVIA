import type { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { instructorSelect } from '../services/courseService.js';
import { notify, notifyByEmail } from '../services/notificationService.js';
import { computeProgress, setLessonState } from '../services/progressService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forbidden, HttpError, notFound } from '../utils/httpError.js';
import { canManage, findCourseByIdOrSlug } from './courseController.js';

export const enroll = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course || course.status !== 'PUBLISHED') throw notFound('Course not found');
  if (course.instructorId === req.user!.id) throw forbidden('You cannot enroll in your own course (use Preview)');
  if (course.priceCents > 0) {
    // No payment provider is integrated. Never grant access to paid content without provider confirmation.
    throw new HttpError(402, 'This is a paid course. Checkout is not configured in this deployment.');
  }
  const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: course.id } } });
  if (existing) throw new HttpError(409, 'You are already enrolled in this course', { enrollmentId: existing.id });

  const enrollment = await prisma.$transaction(async (tx) => {
    const created = await tx.enrollment.create({ data: { userId: req.user!.id, courseId: course.id } });
    await notify(req.user!.id, 'ENROLLMENT', 'Enrollment confirmed', `You are now enrolled in "${course.title}".`, `/learn/${course.id}`, tx);
    // A saved course that gets enrolled no longer needs to be on the wishlist.
    await tx.wishlist.deleteMany({ where: { userId: req.user!.id, courseId: course.id } });
    return created;
  });
  void notifyByEmail(req.user!.id, 'Enrollment confirmed', `You are enrolled in "${course.title}". Happy learning!`);
  res.status(201).json({ data: enrollment });
});

async function listWithProgress(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { lastAccessedAt: 'desc' },
    include: { course: { include: { instructor: { select: instructorSelect }, category: true } } },
  });
  return Promise.all(
    enrollments.map(async (e) => {
      const progress = await computeProgress(e.id, e.courseId);
      const cert = await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId: e.courseId } } });
      return {
        id: e.id,
        courseId: e.courseId,
        lastLessonId: e.lastLessonId,
        lastAccessedAt: e.lastAccessedAt,
        completedAt: e.completedAt,
        enrolledAt: e.createdAt,
        progress,
        certificateId: cert?.certificateId ?? null,
        course: {
          id: e.course.id, slug: e.course.slug, title: e.course.title, thumbnailUrl: e.course.thumbnailUrl, level: e.course.level,
          durationMinutes: e.course.durationMinutes, category: { name: e.course.category.name, slug: e.course.category.slug },
          instructor: e.course.instructor, status: e.course.status,
        },
      };
    }),
  );
}
export { listWithProgress };

export const myEnrollments = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await listWithProgress(req.user!.id) });
});

async function ownEnrollment(req: Request) {
  const e = await prisma.enrollment.findUnique({ where: { id: req.params.id! } });
  if (!e || e.userId !== req.user!.id) throw notFound('Enrollment not found'); // do not reveal others' enrollments
  return e;
}

export const getEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const e = await ownEnrollment(req);
  res.json({ data: { ...e, progress: await computeProgress(e.id, e.courseId) } });
});

export const getEnrollmentProgress = asyncHandler(async (req: Request, res: Response) => {
  const e = await ownEnrollment(req);
  const rows = await prisma.lessonProgress.findMany({ where: { enrollmentId: e.id }, select: { lessonId: true, completed: true, bookmarked: true, completedAt: true } });
  res.json({ data: { summary: await computeProgress(e.id, e.courseId), lessons: rows } });
});

/** Learning player payload. Only enrolled students, the owning instructor, or admins can read lesson content. */
export const getLearning = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course) throw notFound('Course not found');
  const manager = canManage(req.user!, course);
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: course.id } } });
  if (!enrollment && !manager) throw forbidden('Enroll in this course to access its lessons');
  if (course.status !== 'PUBLISHED' && !manager) throw forbidden('This course is not currently available');

  const sections = await prisma.courseSection.findMany({
    where: { courseId: course.id },
    orderBy: { position: 'asc' },
    include: { lessons: { where: manager && !enrollment ? {} : { isPublished: true }, orderBy: { position: 'asc' } } },
  });
  const lessonIds = sections.flatMap((s) => s.lessons.map((l) => l.id));
  const [progress, notes] = await Promise.all([
    enrollment ? prisma.lessonProgress.findMany({ where: { enrollmentId: enrollment.id, lessonId: { in: lessonIds } } }) : [],
    prisma.lessonNote.findMany({ where: { userId: req.user!.id, lessonId: { in: lessonIds } } }),
  ]);
  const pMap = new Map(progress.map((p) => [p.lessonId, p]));
  const nMap = new Map(notes.map((n) => [n.lessonId, n.content]));

  res.json({
    data: {
      course: { id: course.id, title: course.title, slug: course.slug },
      enrollmentId: enrollment?.id ?? null,
      isPreview: !enrollment,
      lastLessonId: enrollment?.lastLessonId ?? null,
      summary: enrollment ? await computeProgress(enrollment.id, course.id) : null,
      sections: sections.map((s) => ({
        id: s.id, title: s.title, position: s.position,
        lessons: s.lessons.map((l) => ({
          id: l.id, title: l.title, position: l.position, content: l.content, videoUrl: l.videoUrl,
          resourceUrl: l.resourceUrl, resourceName: l.resourceName, durationMinutes: l.durationMinutes, isPublished: l.isPublished,
          completed: pMap.get(l.id)?.completed ?? false, bookmarked: pMap.get(l.id)?.bookmarked ?? false, note: nMap.get(l.id) ?? '',
        })),
      })),
    },
  });
});

async function lessonAccess(req: Request) {
  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.id! }, include: { section: { include: { course: true } } } });
  if (!lesson) throw notFound('Lesson not found');
  const course = lesson.section.course;
  const manager = canManage(req.user!, course);
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user!.id, courseId: course.id } } });
  if (!enrollment && !manager) throw forbidden('Enroll in this course to access its lessons');
  if (enrollment && (!lesson.isPublished || course.status !== 'PUBLISHED')) throw notFound('Lesson not found');
  return { lesson, course, enrollment };
}

export const updateProgress = asyncHandler(async (req: Request, res: Response) => {
  const { lesson, enrollment } = await lessonAccess(req);
  if (!enrollment) throw forbidden('Progress is only tracked for enrolled students');
  const summary = await setLessonState(enrollment, lesson.id, req.body as { completed?: boolean; bookmarked?: boolean });
  res.json({ data: { summary } });
});

export const visitLesson = asyncHandler(async (req: Request, res: Response) => {
  const { lesson, enrollment } = await lessonAccess(req);
  if (enrollment) {
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lesson.id, lastAccessedAt: new Date() } });
  }
  res.json({ data: { ok: true } });
});

export const saveNote = asyncHandler(async (req: Request, res: Response) => {
  const { lesson } = await lessonAccess(req);
  const { content } = req.body as { content: string };
  if (content.trim() === '') {
    await prisma.lessonNote.deleteMany({ where: { userId: req.user!.id, lessonId: lesson.id } });
    return res.json({ data: { content: '' } });
  }
  const note = await prisma.lessonNote.upsert({
    where: { userId_lessonId: { userId: req.user!.id, lessonId: lesson.id } },
    create: { userId: req.user!.id, lessonId: lesson.id, content },
    update: { content },
  });
  res.json({ data: { content: note.content } });
});
