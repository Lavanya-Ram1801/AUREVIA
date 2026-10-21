import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { notify } from './notificationService.js';

type Db = Prisma.TransactionClient | typeof prisma;

export interface ProgressSummary {
  totalLessons: number;
  completedLessons: number;
  percent: number;
  completed: boolean;
}

/** Progress = completed published lessons / total published lessons. Always computed from persisted data. */
export async function computeProgress(enrollmentId: string, courseId: string, db: Db = prisma): Promise<ProgressSummary> {
  const [totalLessons, completedLessons] = await Promise.all([
    db.lesson.count({ where: { isPublished: true, section: { courseId } } }),
    db.lessonProgress.count({
      where: { enrollmentId, completed: true, lesson: { isPublished: true, section: { courseId } } },
    }),
  ]);
  const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  return { totalLessons, completedLessons, percent, completed: totalLessons > 0 && completedLessons >= totalLessons };
}

/** Marks/unmarks a lesson, then updates enrollment completion + milestone notifications in one transaction. */
export async function setLessonState(
  enrollment: { id: string; courseId: string; userId: string; completedAt: Date | null },
  lessonId: string,
  patch: { completed?: boolean; bookmarked?: boolean },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    });
    const before = await computeProgress(enrollment.id, enrollment.courseId, tx);

    const completedAt =
      patch.completed === undefined ? undefined : patch.completed ? (existing?.completedAt ?? new Date()) : null;

    await tx.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        completed: patch.completed ?? false,
        bookmarked: patch.bookmarked ?? false,
        completedAt: patch.completed ? new Date() : null,
      },
      update: {
        ...(patch.completed !== undefined ? { completed: patch.completed, completedAt } : {}),
        ...(patch.bookmarked !== undefined ? { bookmarked: patch.bookmarked } : {}),
      },
    });

    const after = await computeProgress(enrollment.id, enrollment.courseId, tx);
    const course = await tx.course.findUnique({ where: { id: enrollment.courseId }, select: { title: true, id: true } });

    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: {
        lastLessonId: lessonId,
        lastAccessedAt: new Date(),
        completedAt: after.completed ? (enrollment.completedAt ?? new Date()) : null,
      },
    });

    if (patch.completed && course) {
      // Milestones: fire once when crossing a threshold upward.
      for (const m of [50]) {
        if (before.percent < m && after.percent >= m && !after.completed) {
          await notify(enrollment.userId, 'MILESTONE', 'Halfway there!', `You are ${after.percent}% through "${course.title}". Keep going!`, `/learn/${course.id}`, tx);
        }
      }
      if (after.completed && !enrollment.completedAt) {
        await notify(enrollment.userId, 'COMPLETION', 'Course completed', `You completed "${course.title}". Your certificate is ready to claim.`, `/certificates`, tx);
        await notify(enrollment.userId, 'CERTIFICATE', 'Certificate available', `You can now generate your certificate for "${course.title}".`, `/certificates`, tx);
      }
    }
    return after;
  });
}
