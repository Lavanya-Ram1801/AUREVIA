import type { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { instructorSelect, lessonCounts, ratingStats, shapeCourseCard } from '../services/courseService.js';
import { computeProgress } from '../services/progressService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listWithProgress } from './learningController.js';

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(Date.now() - i * 86400000)));
  return out;
}

export const studentDashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const enrollments = await listWithProgress(user.id);
  const completed = enrollments.filter((e) => e.progress.completed);
  const inProgress = enrollments.filter((e) => !e.progress.completed);
  const overall = enrollments.length === 0 ? 0 : Math.round(enrollments.reduce((s, e) => s + e.progress.percent, 0) / enrollments.length);

  const days = lastDays(7);
  const since = new Date(`${days[0]}T00:00:00.000Z`);
  const done = await prisma.lessonProgress.findMany({
    where: { enrollment: { userId: user.id }, completed: true, completedAt: { gte: since } },
    select: { completedAt: true, lesson: { select: { title: true, durationMinutes: true, section: { select: { course: { select: { title: true } } } } } } },
    orderBy: { completedAt: 'desc' },
  });
  const buckets = new Map(days.map((d) => [d, { date: d, lessons: 0, minutes: 0 }]));
  for (const p of done) {
    const b = p.completedAt ? buckets.get(dayKey(p.completedAt)) : undefined;
    if (b) { b.lessons += 1; b.minutes += p.lesson.durationMinutes; }
  }
  const weeklyMinutes = [...buckets.values()].reduce((s, b) => s + b.minutes, 0);

  const enrolledCourseIds = enrollments.map((e) => e.courseId);
  const categorySlugs = [...new Set(enrollments.map((e) => e.course.category.slug))];
  const recs = await prisma.course.findMany({
    where: { status: 'PUBLISHED', id: { notIn: enrolledCourseIds }, instructorId: { not: user.id }, ...(categorySlugs.length ? { category: { slug: { in: categorySlugs } } } : {}) },
    include: { instructor: { select: instructorSelect }, category: true, _count: { select: { enrollments: true } } },
    orderBy: { enrollments: { _count: 'desc' } },
    take: 3,
  });
  const rids = recs.map((r) => r.id);
  const [lc, rs] = await Promise.all([lessonCounts(rids), ratingStats(rids)]);
  const certCount = await prisma.certificate.count({ where: { userId: user.id } });

  res.json({
    data: {
      stats: { enrolled: enrollments.length, inProgress: inProgress.length, completed: completed.length, overallProgress: overall, certificates: certCount },
      weeklyActivity: [...buckets.values()],
      goals: { weeklyGoalHours: user.weeklyGoalHours, weeklyMinutes, learningGoal: user.learningGoal },
      continueLearning: inProgress[0] ?? null,
      recentCourses: enrollments.slice(0, 4),
      recommended: recs.map((c) => shapeCourseCard(c, lc.get(c.id) ?? 0, rs.get(c.id), new Set())),
      recentActivity: done.slice(0, 6).map((p) => ({ type: 'LESSON_COMPLETED', title: p.lesson.title, course: p.lesson.section.course.title, at: p.completedAt })),
    },
  });
});

export const instructorDashboard = asyncHandler(async (req: Request, res: Response) => {
  const ownerFilter = req.user!.role === 'ADMIN' ? {} : { instructorId: req.user!.id };
  const courses = await prisma.course.findMany({
    where: ownerFilter,
    select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } },
  });
  const ids = courses.map((c) => c.id);
  const completedByCourse = await prisma.enrollment.groupBy({ by: ['courseId'], where: { courseId: { in: ids }, completedAt: { not: null } }, _count: { _all: true } });
  const cMap = new Map(completedByCourse.map((c) => [c.courseId, c._count._all]));
  const totalEnrollments = courses.reduce((s, c) => s + c._count.enrollments, 0);
  const totalCompleted = [...cMap.values()].reduce((s, n) => s + n, 0);

  const days = lastDays(14);
  const since = new Date(`${days[0]}T00:00:00.000Z`);
  const recentEnrollments = await prisma.enrollment.findMany({
    where: { courseId: { in: ids }, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const buckets = new Map(days.map((d) => [d, { date: d, enrollments: 0 }]));
  for (const e of recentEnrollments) { const b = buckets.get(dayKey(e.createdAt)); if (b) b.enrollments += 1; }

  const recent = await prisma.enrollment.findMany({
    where: { courseId: { in: ids } }, orderBy: { createdAt: 'desc' }, take: 8,
    include: { user: { select: { id: true, name: true, avatarUrl: true } }, course: { select: { id: true, title: true } } },
  });

  res.json({
    data: {
      stats: {
        totalCourses: courses.length,
        published: courses.filter((c) => c.status === 'PUBLISHED').length,
        drafts: courses.filter((c) => c.status !== 'PUBLISHED').length,
        totalEnrollments,
        completionRate: totalEnrollments === 0 ? 0 : Math.round((totalCompleted / totalEnrollments) * 100),
      },
      engagement: [...buckets.values()],
      perCourse: courses.map((c) => ({ id: c.id, title: c.title, status: c.status, enrollments: c._count.enrollments, completions: cMap.get(c.id) ?? 0 })),
      recentEnrollments: recent.map((r) => ({ id: r.id, at: r.createdAt, student: r.user, course: r.course })),
    },
  });
});

export const instructorStudents = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const where = { course: req.user!.role === 'ADMIN' ? {} : { instructorId: req.user!.id } };
  const [rows, total] = await Promise.all([
    prisma.enrollment.findMany({
      where, orderBy: { lastAccessedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } }, course: { select: { id: true, title: true } } },
    }),
    prisma.enrollment.count({ where }),
  ]);
  const data = await Promise.all(rows.map(async (r) => ({
    enrollmentId: r.id, student: r.user, course: r.course, lastAccessedAt: r.lastAccessedAt, completedAt: r.completedAt,
    progress: await computeProgress(r.id, r.courseId),
  })));
  res.json({ data, meta: { page, pageSize, total } });
});

export const adminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [users, students, instructors, admins, courses, published, enrollments] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: 'PUBLISHED' } }),
    prisma.enrollment.count(),
  ]);
  const days = lastDays(14);
  const since = new Date(`${days[0]}T00:00:00.000Z`);
  const [newUsers, newEnrollments, recentUsers, recentCourses] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.enrollment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true } }),
    prisma.course.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, title: true, status: true, createdAt: true, instructor: { select: { name: true } } } }),
  ]);
  const buckets = new Map(days.map((d) => [d, { date: d, registrations: 0, enrollments: 0 }]));
  for (const u of newUsers) { const b = buckets.get(dayKey(u.createdAt)); if (b) b.registrations += 1; }
  for (const e of newEnrollments) { const b = buckets.get(dayKey(e.createdAt)); if (b) b.enrollments += 1; }
  res.json({
    data: {
      stats: { users, students, instructors, admins, courses, published, drafts: courses - published, enrollments },
      activity: [...buckets.values()], recentUsers, recentCourses,
    },
  });
});
