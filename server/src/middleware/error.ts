import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'Route not found'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: { message: 'A record with these details already exists' } });
    if (err.code === 'P2025') return res.status(404).json({ error: { message: 'Record not found' } });
  }
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body too large' } });
  }
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON body' } });
  }
  // Log only the message + route (never request bodies, cookies or tokens).
  if (!env.isTest) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error(`[error] ${req.method} ${req.path}: ${msg}`);
  }
  res.status(500).json({ error: { message: 'Internal server error' } });
}
