import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/db.js';
import { app, loginAgent, makeCourse, makeUser, resetDb } from './helpers.js';

describe('courses', () => {
  beforeEach(resetDb);

  it('lists only published courses and supports search, filter, sort and pagination', async () => {
    const ins = await makeUser('INSTRUCTOR', 'i@example.com');
    await makeCourse(ins.id, { title: 'Alpha JavaScript Basics' });
    await makeCourse(ins.id, { title: 'Beta Python Basics', priceCents: 1000 });
    await makeCourse(ins.id, { title: 'Hidden Draft Course', status: 'DRAFT' });

    const all = await request(app).get('/api/v1/courses');
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(2);

    const search = await request(app).get('/api/v1/courses').query({ q: 'python' });
    expect(search.body.data.map((c: { title: string }) => c.title)).toEqual(['Beta Python Basics']);

    const free = await request(app).get('/api/v1/courses').query({ price: 'free' });
    expect(free.body.meta.total).toBe(1);

    const paged = await request(app).get('/api/v1/courses').query({ pageSize: 1, page: 2, sort: 'rating' });
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.meta.totalPages).toBe(2);
  });

  it('lets an instructor create, then publish (only with a lesson), but hides lesson bodies from the public detail', async () => {
    const ins = await makeUser('INSTRUCTOR', 'i@example.com');
    const cat = await prisma.category.create({ data: { name: 'Cat', slug: 'cat' } });
    const agent = await loginAgent('i@example.com');
    const created = await agent.post('/api/v1/courses').send({ title: 'My First Course', shortDescription: 'Short description here', description: 'x'.repeat(40), categoryId: cat.id, level: 'BEGINNER' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('DRAFT');
    expect(created.body.data.instructorId).toBe(ins.id);
    const id = created.body.data.id as string;

    expect((await agent.post(`/api/v1/courses/${id}/publish`)).status).toBe(400); // no lessons yet
    const section = await agent.post(`/api/v1/courses/${id}/sections`).send({ title: 'Intro' });
    await agent.post(`/api/v1/sections/${section.body.data.id}/lessons`).send({ title: 'Welcome', content: 'Secret body' });
    expect((await agent.post(`/api/v1/courses/${id}/publish`)).status).toBe(200);

    const detail = await request(app).get(`/api/v1/courses/${id}`);
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.body)).not.toContain('Secret body');
  });

  it('forbids students from creating courses and instructors from editing others\' courses', async () => {
    const a = await makeUser('INSTRUCTOR', 'a@example.com');
    await makeUser('INSTRUCTOR', 'b@example.com');
    await makeUser('STUDENT', 's@example.com');
    const course = await makeCourse(a.id);

    const student = await loginAgent('s@example.com');
    expect((await student.post('/api/v1/courses').send({})).status).toBe(403);

    const other = await loginAgent('b@example.com');
    expect((await other.patch(`/api/v1/courses/${course.id}`).send({ title: 'Hijacked title' })).status).toBe(403);
    expect((await other.post(`/api/v1/courses/${course.id}/unpublish`)).status).toBe(403);
    expect((await other.delete(`/api/v1/courses/${course.id}`)).status).toBe(403);
    expect((await other.post(`/api/v1/sections/${course.sections[0]!.id}/lessons`).send({ title: 'Injected lesson' })).status).toBe(403);

    const owner = await loginAgent('a@example.com');
    expect((await owner.post(`/api/v1/courses/${course.id}/unpublish`)).status).toBe(200);
  });

  it('hides unpublished courses from the public but not from the owner', async () => {
    const a = await makeUser('INSTRUCTOR', 'a@example.com');
    const draft = await makeCourse(a.id, { status: 'DRAFT' });
    expect((await request(app).get(`/api/v1/courses/${draft.id}`)).status).toBe(404);
    const owner = await loginAgent('a@example.com');
    expect((await owner.get(`/api/v1/courses/${draft.id}`)).status).toBe(200);
  });
});
