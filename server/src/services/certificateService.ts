import { prisma } from '../config/db.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { certificateCode } from '../utils/token.js';
import { computeProgress } from './progressService.js';

/** Issues a certificate only if the backend verifies 100% persisted completion. Idempotent per user+course. */
export async function issueCertificate(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { course: true, user: true },
  });
  if (!enrollment) throw forbidden('You are not enrolled in this course');

  const existing = await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) return { certificate: existing, created: false };

  const progress = await computeProgress(enrollment.id, courseId);
  if (!progress.completed) {
    throw badRequest(`Complete all lessons first (${progress.completedLessons}/${progress.totalLessons} done)`);
  }

  try {
    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateId: certificateCode(),
        studentName: enrollment.user.name,
        courseTitle: enrollment.course.title,
      },
    });
    return { certificate, created: true };
  } catch {
    const raced = await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
    if (raced) return { certificate: raced, created: false };
    throw conflict('Could not issue certificate, please retry');
  }
}

export async function verifyCertificate(code: string) {
  const cert = await prisma.certificate.findUnique({ where: { certificateId: code } });
  if (!cert) throw notFound('Certificate not found');
  return { certificateId: cert.certificateId, studentName: cert.studentName, courseTitle: cert.courseTitle, issuedAt: cert.issuedAt, valid: true };
}
