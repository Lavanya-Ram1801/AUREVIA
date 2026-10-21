import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { instructorSelect, lessonCounts, ratingStats, shapeCourseCard, uniqueSlug } from '../services/courseService.js';
import { notify } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';

const cardInclude = {
  instructor: { select: instructorSelect },
  category: true,
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseInclude;

export async function findCourseByIdOrSlug(idOrSlug: string) {
  return prisma.course.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
}

export function canManage(user: { id: string; role: string }, course: { instructorId: string }) {
  return user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && course.instructorId === user.id);
}

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const counts = await prisma.course.groupBy({ by: ['categoryId'], where: { status: 'PUBLISHED' }, _count: { _all: true } });
  const m = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  res.json({ data: cats.map((c) => ({ ...c, courseCount: m.get(c.id) ?? 0 })) });
});

export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  const { q, category, level, price, sort, page, pageSize } = req.query as unknown as {
    q?: string; category?: string; level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; price?: 'free' | 'paid';
    sort: 'newest' | 'popular' | 'rating'; page: number; pageSize: number;
  };

  const where: Prisma.CourseWhereInput = {
    status: 'PUBLISHED',
    ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { shortDescription: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
    ...(category ? { category: { OR: [{ slug: category }, { id: category }] } } : {}),
    ...(level ? { level } : {}),
    ...(price === 'free' ? { priceCents: 0 } : price === 'paid' ? { priceCents: { gt: 0 } } : {}),
  };

  let rows;
  let total: number;
  if (sort === 'rating') {
    // Rating is derived from reviews, so rank in memory over the matching ids, then page.
    const all = await prisma.course.findMany({ where, select: { id: true, createdAt: true } });
    total = all.length;
    const stats = await ratingStats(all.map((c) => c.id));
    const ordered = all
      .sort((a, b) => {
        const ra = stats.get(a.id); const rb = stats.get(b.id);
        return (rb?.avg ?? 0) - (ra?.avg ?? 0) || (rb?.count ?? 0) - (ra?.count ?? 0) || b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice((page - 1) * pageSize, page * pageSize)
      .map((c) => c.id);
    const found = await prisma.course.findMany({ where: { id: { in: ordered } }, include: cardInclude });
    rows = ordered.map((id) => found.find((f) => f.id === id)!).filter(Boolean);
  } else {
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      sort === 'popular' ? { enrollments: { _count: 'desc' } } : { createdAt: 'desc' };
    [total, rows] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: cardInclude }),
    ]);
  }

  const ids = rows.map((r) => r.id);
  const [lessons, stats, enrolled] = await Promise.all([
    lessonCounts(ids),
    ratingStats(ids),
    req.user
      ? prisma.enrollment.findMany({ where: { userId: req.user.id, courseId: { in: ids } }, select: { courseId: true } })
      : Promise.resolve([]),
  ]);
  const enrolledIds = new Set(enrolled.map((e) => e.courseId));
  res.json({
    data: rows.map((c) => shapeCourseCard(c, lessons.get(c.id) ?? 0, stats.get(c.id), enrolledIds)),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const base = await findCourseByIdOrSlug(req.params.id!);
  if (!base) throw notFound('Course not found');
  const isManager = req.user ? canManage(req.user, base) : false;
  if (base.status !== 'PUBLISHED' && !isManager) throw notFound('Course not found');

  const course = await prisma.course.findUniqueOrThrow({
    where: { id: base.id },
    include: {
      ...cardInclude,
      sections: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            where: isManager ? {} : { isPublished: true },
            orderBy: { position: 'asc' },
            select: { id: true, title: true, position: true, durationMinutes: true, isPublished: true, videoUrl: true },
          },
        },
      },
    },
  });

  const [lessons, stats, enrollment, wished, myReview, related] = await Promise.all([
    lessonCounts([course.id]),
    ratingStats([course.id]),
    req.user ? prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId: course.id } } }) : null,
    req.user ? prisma.wishlist.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId: course.id } } }) : null,
    req.user ? prisma.review.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId: course.id } } }) : null,
    prisma.course.findMany({
      where: { status: 'PUBLISHED', categoryId: course.categoryId, id: { not: course.id } },
      include: cardInclude,
      orderBy: { enrollments: { _count: 'desc' } },
      take: 3,
    }),
  ]);

  const relatedIds = related.map((r) => r.id);
  const [rl, rs] = await Promise.all([lessonCounts(relatedIds), ratingStats(relatedIds)]);
  const none = new Set<string>();
  const card = shapeCourseCard(course, lessons.get(course.id) ?? 0, stats.get(course.id), enrollment ? new Set([course.id]) : none);

  res.json({
    data: {
      ...card,
      description: course.description,
      outcomes: course.outcomes,
      prerequisites: course.prerequisites,
      // Lesson bodies/video URLs are never sent here; only the learning endpoint (enrolled users) serves content.
      sections: course.sections.map((s) => ({
        id: s.id, title: s.title, position: s.position,
        lessons: s.lessons.map((l) => ({ id: l.id, title: l.title, position: l.position, durationMinutes: l.durationMinutes, isPublished: l.isPublished, hasVideo: Boolean(l.videoUrl) })),
      })),
      enrollmentId: enrollment?.id ?? null,
      isWishlisted: Boolean(wished),
      myReview,
      canManage: isManager,
      related: related.map((r) => shapeCourseCard(r, rl.get(r.id) ?? 0, rs.get(r.id), none)),
    },
  });
});

export const myCourses = asyncHandler(async (req: Request, res: Response) => {
  const rows = await prisma.course.findMany({
    where: req.user!.role === 'ADMIN' ? {} : { instructorId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    include: cardInclude,
  });
  const ids = rows.map((r) => r.id);
  const [lessons, stats] = await Promise.all([lessonCounts(ids), ratingStats(ids)]);
  res.json({ data: rows.map((c) => shapeCourseCard(c, lessons.get(c.id) ?? 0, stats.get(c.id), new Set())) });
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown> & { title: string; categoryId: string; thumbnailUrl?: string | null };
  const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!category) throw badRequest('Validation failed', { categoryId: 'Category does not exist' });
  const slug = await uniqueSlug(body.title);
  const course = await prisma.course.create({
    data: {
      title: body.title,
      shortDescription: body.shortDescription as string,
      description: body.description as string,
      categoryId: body.categoryId,
      level: body.level as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
      thumbnailUrl: body.thumbnailUrl || null,
      outcomes: body.outcomes as string[],
      prerequisites: body.prerequisites as string[],
      priceCents: body.priceCents as number,
      durationMinutes: body.durationMinutes as number,
      slug,
      instructorId: req.user!.id, // never taken from the request body
      status: 'DRAFT',
    },
  });
  res.status(201).json({ data: course });
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course) throw notFound('Course not found');
  if (!canManage(req.user!, course)) throw forbidden('You can only edit your own courses');
  const body = req.body as Record<string, unknown>;
  if (typeof body.categoryId === 'string') {
    const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!cat) throw badRequest('Validation failed', { categoryId: 'Category does not exist' });
  }
  const data: Prisma.CourseUncheckedUpdateInput = {};
  for (const k of ['title', 'shortDescription', 'description', 'categoryId', 'level', 'outcomes', 'prerequisites', 'priceCents', 'durationMinutes'] as const) {
    if (k in body) (data as Record<string, unknown>)[k] = body[k];
  }
  if ('thumbnailUrl' in body) data.thumbnailUrl = (body.thumbnailUrl as string) || null;
  const updated = await prisma.course.update({ where: { id: course.id }, data });
  if (course.status === 'PUBLISHED') {
    const enrolled = await prisma.enrollment.findMany({ where: { courseId: course.id }, select: { userId: true } });
    await prisma.notification.createMany({
      data: enrolled.map((e) => ({ userId: e.userId, type: 'COURSE_UPDATE' as const, title: 'Course updated', message: `"${updated.title}" has new updates.`, link: `/learn/${course.id}` })),
    });
  }
  res.json({ data: updated });
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await findCourseByIdOrSlug(req.params.id!);
  if (!course) throw notFound('Course not found');
  if (!canManage(req.user!, course)) throw forbidden('You can only delete your own courses');
  if (req.user!.role !== 'ADMIN') {
    const enrolled = await prisma.enrollment.count({ where: { courseId: course.id } });
    if (enrolled > 0) throw badRequest('This course has enrolled students. Unpublish it instead of deleting.');
  }
  await prisma.course.delete({ where: { id: course.id } });
  res.json({ data: { ok: true } });
});

export const setPublished = (publish: boolean) =>
  asyncHandler(async (req: Request, res: Response) => {
    const course = await findCourseByIdOrSlug(req.params.id!);
    if (!course) throw notFound('Course not found');
    if (!canManage(req.user!, course)) throw forbidden('You can only publish your own courses');
    if (publish) {
      const lessons = await prisma.lesson.count({ where: { isPublished: true, section: { courseId: course.id } } });
      if (lessons === 0) throw badRequest('Add at least one published lesson before publishing.');
    }
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: publish ? { status: 'PUBLISHED', publishedAt: course.publishedAt ?? new Date() } : { status: 'UNPUBLISHED' },
    });
    if (publish && course.status !== 'PUBLISHED') {
      const wished = await prisma.wishlist.findMany({ where: { courseId: course.id }, select: { userId: true } });
      for (const w of wished) {
        await notify(w.userId, 'COURSE_UPDATE', 'A saved course is now live', `"${updated.title}" is now available.`, `/courses/${updated.slug}`);
      }
    }
    res.json({ data: updated });
  });
