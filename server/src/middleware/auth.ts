import type { NextFunction, Request, Response } from 'express';
import type { Role, User } from '@prisma/client';
import { prisma } from '../config/db.js';
import { forbidden, unauthorized } from '../utils/httpError.js';
import { COOKIE_NAME, verifySession } from '../utils/token.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

async function loadUser(req: Request): Promise<User | null> {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) return null;
  return user;
}

/** Requires a valid session. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await loadUser(req);
    if (!user) return next(unauthorized());
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attaches the user when a valid session exists, otherwise continues anonymously. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await loadUser(req);
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
