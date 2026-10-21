import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/db.js';
import { app, loginAgent, makeUser, PASSWORD, resetDb } from './helpers.js';

describe('auth', () => {
  beforeEach(resetDb);

  it('registers a student and never returns the password hash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Ada Lovelace', email: 'ada@example.com', password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('ada@example.com');
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenVersion/);
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);
  });

  it('rejects admin self-assignment on public sign-up', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Mallory', email: 'm@example.com', password: PASSWORD, role: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it('rejects weak passwords and duplicate emails', async () => {
    const weak = await request(app).post('/api/v1/auth/register').send({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'short' });
    expect(weak.status).toBe(400);
    await makeUser('STUDENT', 'dup@example.com');
    const dup = await request(app).post('/api/v1/auth/register').send({ name: 'Dup User', email: 'DUP@example.com', password: PASSWORD });
    expect(dup.status).toBe(409);
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    await makeUser('STUDENT', 'a@example.com');
    const ok = await request(app).post('/api/v1/auth/login').send({ email: 'a@example.com', password: PASSWORD });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'Wrong-Password1' });
    expect(bad.status).toBe(401);
  });

  it('protects /auth/me and serves it to a logged-in user', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    await makeUser('STUDENT', 'a@example.com');
    const agent = await loginAgent('a@example.com');
    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('a@example.com');
  });

  it('invalidates the session on logout (even if the old cookie is replayed)', async () => {
    await makeUser('STUDENT', 'a@example.com');
    const agent = await loginAgent('a@example.com');
    const cookie = (await request(app).post('/api/v1/auth/login').send({ email: 'a@example.com', password: PASSWORD })).headers['set-cookie'];
    await agent.post('/api/v1/auth/logout').expect(200);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
    const replay = await request(app).get('/api/v1/auth/me').set('Cookie', cookie ?? []);
    expect(replay.status).toBe(401);
  });

  it('resets a password with a single-use token', async () => {
    await makeUser('STUDENT', 'a@example.com');
    const forgot = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'a@example.com' });
    expect(forgot.status).toBe(200);
    const token = new URL(forgot.body.data.devLink as string).searchParams.get('token')!;
    const reset = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'New-Passw0rd-1' });
    expect(reset.status).toBe(200);
    expect((await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'Another-Passw0rd-1' })).status).toBe(400);
    expect((await request(app).post('/api/v1/auth/login').send({ email: 'a@example.com', password: 'New-Passw0rd-1' })).status).toBe(200);
  });

  it('does not reveal whether an email exists on forgot-password', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.devLink).toBeUndefined();
  });
});
