import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { slugify } from '../utils/slug.js';

export const instructorSelect = { id: true, name: true, avatarUrl: true, bio: true } as const;

export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'course';
  let slug = base;
  let n = 1;
  while (await prisma.course.findUnique({ where: { slug }, select: { id: true } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function ratingStats(courseIds: string[]) {
  if (courseIds.length === 0) return new Map<string, { avg: number; count: number }>();
  const groups = await prisma.review.groupBy({
    by: ['courseId'],
    where: { courseId: { in: courseIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(groups.map((g) => [g.courseId, { avg: Number((g._avg.rating ?? 0).toFixed(2)), count: g._count.rating }]));
}

type CourseWithRels = Prisma.CourseGetPayload<{
  include: { instructor: { select: typeof instructorSelect }; category: true; _count: { select: { enrollments: true } } };
}>;

export function shapeCourseCard(
  c: CourseWithRels,
  lessonCount: number,
  rating: { avg: number; count: number } | undefined,
  enrolledIds: Set<string>,
) {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    shortDescription: c.shortDescription,
    thumbnailUrl: c.thumbnailUrl,
    level: c.level,
    status: c.status,
    priceCents: c.priceCents,
    currency: c.currency,
    isFree: c.priceCents === 0,
    durationMinutes: c.durationMinutes,
    lessonCount,
    category: { id: c.category.id, name: c.category.name, slug: c.category.slug },
    instructor: c.instructor,
    rating: rating?.avg ?? 0,
    reviewCount: rating?.count ?? 0,
    enrollmentCount: c._count.enrollments,
    isEnrolled: enrolledIds.has(c.id),
    isDemo: c.isDemo,
    createdAt: c.createdAt,
  };
}

export async function lessonCounts(courseIds: string[]) {
  if (courseIds.length === 0) return new Map<string, number>();
  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true, section: { courseId: { in: courseIds } } },
    select: { section: { select: { courseId: true } } },
  });
  const m = new Map<string, number>();
  for (const l of lessons) m.set(l.section.courseId, (m.get(l.section.courseId) ?? 0) + 1);
  return m;
}
