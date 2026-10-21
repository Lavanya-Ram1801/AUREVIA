import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10_000 : limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message } },
  });

export const authLimiter = make(15 * 60 * 1000, 20, 'Too many attempts. Please try again in a few minutes.');
export const resetLimiter = make(60 * 60 * 1000, 8, 'Too many password reset requests. Please try again later.');
export const generalLimiter = make(60 * 1000, 300, 'Too many requests. Please slow down.');
