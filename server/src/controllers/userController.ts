import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, conflict, unauthorized } from '../utils/httpError.js';
import { publicUser } from '../utils/serialize.js';
import { clearSessionCookie, setSessionCookie, signSession } from '../utils/token.js';

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = { ...body };
  if ('avatarUrl' in body) data.avatarUrl = body.avatarUrl || null;
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ data: { user: publicUser(user) } });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const ok = await bcrypt.compare(currentPassword, req.user!.passwordHash);
  if (!ok) throw unauthorized('Current password is incorrect');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  // Re-issue a session for this device; all other sessions are invalidated.
  setSessionCookie(res, signSession(user.id, user.tokenVersion));
  res.json({ data: { message: 'Password updated' } });
});

/**
 * Account deletion rules:
 *  - Requires the current password.
 *  - Admin accounts cannot be self-deleted (prevents lock-out).
 *  - Instructors who still own courses must unpublish/transfer them first (courses are not silently destroyed).
 *  - Everything else owned by the user (enrollments, progress, notes, reviews, wishlist, certificates, notifications)
 *    is deleted via cascading relations.
 */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body as { password: string };
  const user = req.user!;
  if (!(await bcrypt.compare(password, user.passwordHash))) throw unauthorized('Password is incorrect');
  if (user.role === 'ADMIN') throw badRequest('Admin accounts cannot be self-deleted. Ask another admin.');
  const owned = await prisma.course.count({ where: { instructorId: user.id } });
  if (owned > 0) throw conflict('Delete or hand over your courses before deleting your account.');
  await prisma.user.delete({ where: { id: user.id } });
  clearSessionCookie(res);
  res.json({ data: { ok: true } });
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
  ]);
  res.json({ data: { items, unread } });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { read: true } });
  res.json({ data: { ok: true } });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } });
  res.json({ data: { ok: true } });
});

export const subscribeNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  await prisma.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: {} });
  res.status(201).json({ data: { message: 'Thanks for subscribing!' } });
});
