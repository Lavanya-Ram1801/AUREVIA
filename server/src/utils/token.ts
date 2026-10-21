import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'aurevia_session';

export interface JwtPayload {
  sub: string;
  tv: number;
}

export function signSession(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, tv: tokenVersion } satisfies JwtPayload, env.JWT_SECRET, {
    expiresIn: `${env.JWT_EXPIRES_IN_HOURS}h`,
  });
}

export function verifySession(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'object' && typeof decoded.sub === 'string' && typeof decoded.tv === 'number') {
      return { sub: decoded.sub, tv: decoded.tv };
    }
    return null;
  } catch {
    return null;
  }
}

const cookieBase = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
});

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, { ...cookieBase(), maxAge: env.JWT_EXPIRES_IN_HOURS * 3600 * 1000 });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieBase());
}

export const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('hex');
export const certificateCode = () => `AUR-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
