import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const httpUrl = z
  .string()
  .trim()
  .url('Enter a valid URL')
  .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) URLs are allowed')
  .max(2048);
const optionalUrl = z.union([httpUrl, z.literal('')]).optional().nullable();
const stringList = z.array(z.string().trim().min(1).max(300)).max(20);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email,
    password: passwordRule,
    role: z.enum(['STUDENT', 'INSTRUCTOR']).default('STUDENT'),
    avatarUrl: optionalUrl,
  })
  .strict();

export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required').max(128) }).strict();
export const forgotSchema = z.object({ email }).strict();
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordRule }).strict();

export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    avatarUrl: optionalUrl,
    bio: z.string().trim().max(500).optional().nullable(),
    learningGoal: z.string().trim().max(200).optional().nullable(),
    weeklyGoalHours: z.number().int().min(1).max(60).optional(),
    emailNotifs: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(128), newPassword: passwordRule })
  .strict();

export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) }).strict();

export const courseListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  price: z.enum(['free', 'paid']).optional(),
  sort: z.enum(['newest', 'popular', 'rating']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
});

export const courseCreateSchema = z
  .object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
    shortDescription: z.string().trim().min(10, 'Short description must be at least 10 characters').max(200),
    description: z.string().trim().min(30, 'Description must be at least 30 characters').max(10000),
    categoryId: z.string().min(1, 'Choose a category'),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    thumbnailUrl: optionalUrl,
    outcomes: stringList.default([]),
    prerequisites: stringList.default([]),
    priceCents: z.number().int().min(0).max(1_000_000).default(0),
    durationMinutes: z.number().int().min(0).max(100_000).default(0),
  })
  .strict();

export const courseUpdateSchema = courseCreateSchema.partial().strict();

export const sectionSchema = z.object({ title: z.string().trim().min(2).max(120) }).strict();
export const sectionUpdateSchema = z
  .object({ title: z.string().trim().min(2).max(120).optional(), position: z.number().int().min(0).optional() })
  .strict();

export const lessonSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    content: z.string().max(50000).default(''),
    videoUrl: optionalUrl,
    resourceUrl: optionalUrl,
    resourceName: z.string().trim().max(120).optional().nullable(),
    durationMinutes: z.number().int().min(0).max(1000).default(0),
    isPublished: z.boolean().default(true),
  })
  .strict();
export const lessonUpdateSchema = lessonSchema
  .partial()
  .extend({ position: z.number().int().min(0).optional() })
  .strict();

export const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) }).strict();

export const progressSchema = z
  .object({ completed: z.boolean().optional(), bookmarked: z.boolean().optional() })
  .strict()
  .refine((v) => v.completed !== undefined || v.bookmarked !== undefined, 'Nothing to update');

export const noteSchema = z.object({ content: z.string().max(10000) }).strict();

export const reviewSchema = z
  .object({
    rating: z.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
    comment: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUsersQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const adminUserUpdateSchema = z
  .object({ role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']).optional(), isActive: z.boolean().optional() })
  .strict()
  .refine((v) => v.role !== undefined || v.isActive !== undefined, 'Nothing to update');

export const adminCourseUpdateSchema = z.object({ status: z.enum(['PUBLISHED', 'UNPUBLISHED']) }).strict();
export const adminCoursesQuery = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED']).optional(),
});

export const newsletterSchema = z.object({ email }).strict();
