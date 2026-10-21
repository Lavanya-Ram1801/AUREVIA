import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';

export const app = createApp();
export const PASSWORD = 'Passw0rd-Test';

export async function resetDb() {
  const tables = ['PasswordResetToken', 'LessonNote', 'Notification', 'Certificate', 'Wishlist', 'Review', 'LessonProgress', 'Enrollment', 'Lesson', 'CourseSection', 'Course', 'Category', 'NewsletterSubscriber', 'User'];
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

export async function makeUser(role: Role, email: string, name = 'Test User') {
  return prisma.user.create({ data: { email, name, role, passwordHash: await bcrypt.hash(PASSWORD, 4) } });
}

/** Returns a supertest agent that is already logged in (keeps the session cookie). */
export async function loginAgent(email: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  return agent;
}

/** Published course with 1 section and `lessons` lessons. */
export async function makeCourse(instructorId: string, opts: { title?: string; lessons?: number; priceCents?: number; status?: 'DRAFT' | 'PUBLISHED' } = {}) {
  const category = await prisma.category.upsert({ where: { slug: 'general' }, create: { name: 'General', slug: 'general' }, update: {} });
  const title = opts.title ?? 'Sample Course Title';
  return prisma.course.create({
    data: {
      title, slug: `${title.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`,
      shortDescription: 'A short description for tests', description: 'A longer description for the test course, long enough to be valid.',
      instructorId, categoryId: category.id, priceCents: opts.priceCents ?? 0, status: opts.status ?? 'PUBLISHED', publishedAt: new Date(),
      sections: { create: [{ title: 'Section 1', position: 0, lessons: { create: Array.from({ length: opts.lessons ?? 2 }, (_, i) => ({ title: `Lesson ${i + 1}`, position: i, content: 'Body', durationMinutes: 5 })) } }] },
    },
    include: { sections: { include: { lessons: { orderBy: { position: 'asc' } } } } },
  });
}
