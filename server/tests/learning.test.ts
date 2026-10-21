import { beforeEach, describe, expect, it } from 'vitest';
import { app, loginAgent, makeCourse, makeUser, resetDb } from './helpers.js';
import request from 'supertest';

describe('enrollment, progress and certificates', () => {
  beforeEach(resetDb);

  async function setup() {
    const ins = await makeUser('INSTRUCTOR', 'i@example.com');
    await makeUser('STUDENT', 's@example.com');
    const course = await makeCourse(ins.id, { lessons: 2 });
    const student = await loginAgent('s@example.com');
    return { course, student, lessons: course.sections[0]!.lessons };
  }

  it('enrolls once and rejects duplicate enrollment', async () => {
    const { course, student } = await setup();
    expect((await student.post(`/api/v1/courses/${course.id}/enroll`)).status).toBe(201);
    expect((await student.post(`/api/v1/courses/${course.id}/enroll`)).status).toBe(409);
    const mine = await student.get('/api/v1/enrollments/me');
    expect(mine.body.data).toHaveLength(1);
  });

  it('does not grant access to paid courses without a payment provider', async () => {
    const ins = await makeUser('INSTRUCTOR', 'i@example.com');
    await makeUser('STUDENT', 's@example.com');
    const paid = await makeCourse(ins.id, { priceCents: 2000 });
    const student = await loginAgent('s@example.com');
    expect((await student.post(`/api/v1/courses/${paid.id}/enroll`)).status).toBe(402);
  });

  it('blocks lesson content for non-enrolled users', async () => {
    const { course, student } = await setup();
    expect((await student.get(`/api/v1/courses/${course.id}/learn`)).status).toBe(403);
    expect((await request(app).get(`/api/v1/courses/${course.id}/learn`)).status).toBe(401);
  });

  it('tracks progress, persists it, and only issues a certificate at 100%', async () => {
    const { course, student, lessons } = await setup();
    await student.post(`/api/v1/courses/${course.id}/enroll`);

    const early = await student.post(`/api/v1/courses/${course.id}/certificate`);
    expect(early.status).toBe(400);

    const first = await student.post(`/api/v1/lessons/${lessons[0]!.id}/progress`).send({ completed: true });
    expect(first.body.data.summary).toMatchObject({ completedLessons: 1, totalLessons: 2, percent: 50, completed: false });
    expect((await student.post(`/api/v1/courses/${course.id}/certificate`)).status).toBe(400);

    // "reload": a fresh read from the database reflects the saved state
    const learn = await student.get(`/api/v1/courses/${course.id}/learn`);
    expect(learn.body.data.summary.percent).toBe(50);
    expect(learn.body.data.sections[0].lessons[0].completed).toBe(true);
    expect(learn.body.data.lastLessonId).toBe(lessons[0]!.id);

    const second = await student.post(`/api/v1/lessons/${lessons[1]!.id}/progress`).send({ completed: true });
    expect(second.body.data.summary).toMatchObject({ percent: 100, completed: true });

    const cert = await student.post(`/api/v1/courses/${course.id}/certificate`);
    expect(cert.status).toBe(201);
    const again = await student.post(`/api/v1/courses/${course.id}/certificate`);
    expect(again.status).toBe(200);
    expect(again.body.data.certificateId).toBe(cert.body.data.certificateId);

    const verify = await request(app).get(`/api/v1/certificates/verify/${cert.body.data.certificateId}`);
    expect(verify.status).toBe(200);
    expect(verify.body.data.valid).toBe(true);
    expect((await request(app).get('/api/v1/certificates/verify/AUR-NOPE')).status).toBe(404);
  });

  it('does not let another student read or change someone else\'s enrollment', async () => {
    const { course, student } = await setup();
    const enrolled = await student.post(`/api/v1/courses/${course.id}/enroll`);
    await makeUser('STUDENT', 'other@example.com');
    const other = await loginAgent('other@example.com');
    expect((await other.get(`/api/v1/enrollments/${enrolled.body.data.id}`)).status).toBe(404);
  });

  it('saves notes and validates reviews (enrolled only, one per user, edit in place)', async () => {
    const { course, student, lessons } = await setup();
    expect((await student.post(`/api/v1/courses/${course.id}/reviews`).send({ rating: 5 })).status).toBe(403);
    await student.post(`/api/v1/courses/${course.id}/enroll`);
    expect((await student.post(`/api/v1/lessons/${lessons[0]!.id}/notes`).send({ content: 'remember this' })).status).toBe(200);
    expect((await student.post(`/api/v1/courses/${course.id}/reviews`).send({ rating: 9 })).status).toBe(400);
    await student.post(`/api/v1/courses/${course.id}/reviews`).send({ rating: 4, comment: 'good' });
    await student.post(`/api/v1/courses/${course.id}/reviews`).send({ rating: 5, comment: 'better' });
    const list = await request(app).get(`/api/v1/courses/${course.id}/reviews`);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].rating).toBe(5);
  });

  it('wishlists and unwishlists a course', async () => {
    const { course, student } = await setup();
    await student.post(`/api/v1/courses/${course.id}/wishlist`);
    expect((await student.get('/api/v1/wishlist')).body.data).toHaveLength(1);
    await student.delete(`/api/v1/courses/${course.id}/wishlist`);
    expect((await student.get('/api/v1/wishlist')).body.data).toHaveLength(0);
  });

  it('shows empty student dashboard stats for a new user', async () => {
    await makeUser('STUDENT', 'new@example.com');
    const agent = await loginAgent('new@example.com');
    const res = await agent.get('/api/v1/dashboard/student');
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toMatchObject({ enrolled: 0, completed: 0, overallProgress: 0 });
    expect(res.body.data.weeklyActivity).toHaveLength(7);
  });
});
