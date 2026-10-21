import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, loginAgent, makeCourse, makeUser, resetDb } from './helpers.js';

describe('administration', () => {
  beforeEach(resetDb);

  it('rejects anonymous, student and instructor access to admin APIs', async () => {
    await makeUser('STUDENT', 's@example.com');
    await makeUser('INSTRUCTOR', 'i@example.com');
    expect((await request(app).get('/api/v1/admin/users')).status).toBe(401);
    for (const email of ['s@example.com', 'i@example.com']) {
      const agent = await loginAgent(email);
      expect((await agent.get('/api/v1/admin/users')).status).toBe(403);
      expect((await agent.get('/api/v1/dashboard/admin')).status).toBe(403);
      expect((await agent.get('/api/v1/admin/courses')).status).toBe(403);
    }
  });

  it('lets an admin list users, change roles and deactivate accounts (ending their session)', async () => {
    await makeUser('ADMIN', 'admin@example.com');
    const student = await makeUser('STUDENT', 's@example.com');
    const admin = await loginAgent('admin@example.com');
    const studentAgent = await loginAgent('s@example.com');

    const list = await admin.get('/api/v1/admin/users').query({ q: 's@example' });
    expect(list.body.data).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain('passwordHash');

    expect((await admin.patch(`/api/v1/admin/users/${student.id}`).send({ role: 'INSTRUCTOR' })).body.data.role).toBe('INSTRUCTOR');
    await admin.patch(`/api/v1/admin/users/${student.id}`).send({ isActive: false }).expect(200);
    expect((await studentAgent.get('/api/v1/auth/me')).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: 's@example.com', password: 'Passw0rd-Test' })).status).toBe(401);
  });

  it('prevents an admin from demoting or deactivating themselves', async () => {
    const adminUser = await makeUser('ADMIN', 'admin@example.com');
    const admin = await loginAgent('admin@example.com');
    expect((await admin.patch(`/api/v1/admin/users/${adminUser.id}`).send({ role: 'STUDENT' })).status).toBe(400);
    expect((await admin.patch(`/api/v1/admin/users/${adminUser.id}`).send({ isActive: false })).status).toBe(400);
  });

  it('lets an admin moderate (unpublish) any course', async () => {
    await makeUser('ADMIN', 'admin@example.com');
    const ins = await makeUser('INSTRUCTOR', 'i@example.com');
    const course = await makeCourse(ins.id);
    const admin = await loginAgent('admin@example.com');
    const res = await admin.patch(`/api/v1/admin/courses/${course.id}`).send({ status: 'UNPUBLISHED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('UNPUBLISHED');
    const dash = await admin.get('/api/v1/dashboard/admin');
    expect(dash.body.data.stats).toMatchObject({ users: 2, courses: 1, published: 0 });
  });
});
