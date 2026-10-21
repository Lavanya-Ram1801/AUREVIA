import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { sendMail } from '../services/emailService.js';
import { notify } from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, conflict, unauthorized } from '../utils/httpError.js';
import { publicUser } from '../utils/serialize.js';
import { clearSessionCookie, randomToken, setSessionCookie, sha256, signSession } from '../utils/token.js';

const BCRYPT_ROUNDS = 12;
// Pre-computed hash used to equalise timing when the account does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, avatarUrl } = req.body as {
    name: string; email: string; password: string; role: 'STUDENT' | 'INSTRUCTOR'; avatarUrl?: string | null;
  };
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // role is restricted to STUDENT | INSTRUCTOR by the validator; ADMIN can never be self-assigned.
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, avatarUrl: avatarUrl || null },
  });
  await notify(user.id, 'SYSTEM', 'Welcome to AUREVIA', 'Your account is ready. Explore the course catalog to get started.', '/courses');
  setSessionCookie(res, signSession(user.id, user.tokenVersion));
  res.status(201).json({ data: { user: publicUser(user) } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password');
  if (!user.isActive) throw unauthorized('This account has been deactivated');
  setSessionCookie(res, signSession(user.id, user.tokenVersion));
  res.json({ data: { user: publicUser(user) } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    // Invalidates every JWT previously issued for this user (session invalidation).
    await prisma.user.update({ where: { id: req.user.id }, data: { tokenVersion: { increment: 1 } } });
  }
  clearSessionCookie(res);
  res.json({ data: { ok: true } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: { user: publicUser(req.user!) } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findUnique({ where: { email } });
  let devLink: string | undefined;
  if (user && user.isActive) {
    const token = randomToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const link = `${env.CLIENT_ORIGIN}/reset-password?token=${token}`;
    const result = await sendMail({
      to: user.email,
      subject: 'Reset your AUREVIA password',
      text: `Hi ${user.name},\n\nUse this link to reset your password (valid for 1 hour):\n${link}\n\nIf you did not request this, you can ignore this email.`,
    });
    // Development fallback only: expose the link when no email provider is configured and not in production.
    if (!result.delivered && !env.isProd) devLink = link;
  }
  // Same response whether or not the account exists (prevents account enumeration).
  res.json({ data: { message: 'If an account exists for that email, a reset link has been sent.', devLink } });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  res.json({ data: { message: 'Password updated. You can now sign in.' } });
});
