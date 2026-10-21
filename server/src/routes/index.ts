import { Router } from 'express';
import * as admin from '../controllers/adminController.js';
import * as auth from '../controllers/authController.js';
import * as course from '../controllers/courseController.js';
import * as curriculum from '../controllers/curriculumController.js';
import * as dash from '../controllers/dashboardController.js';
import * as engage from '../controllers/engagementController.js';
import * as learning from '../controllers/learningController.js';
import * as user from '../controllers/userController.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { authLimiter, resetLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as s from '../validators/schemas.js';

const r = Router();

// ---- Auth
r.post('/auth/register', authLimiter, validate(s.registerSchema), auth.register);
r.post('/auth/login', authLimiter, validate(s.loginSchema), auth.login);
r.post('/auth/logout', optionalAuth, auth.logout);
r.get('/auth/me', requireAuth, auth.me);
r.post('/auth/forgot-password', resetLimiter, validate(s.forgotSchema), auth.forgotPassword);
r.post('/auth/reset-password', resetLimiter, validate(s.resetSchema), auth.resetPassword);

// ---- Account
r.patch('/users/me', requireAuth, validate(s.profileSchema), user.updateProfile);
r.post('/users/me/password', requireAuth, authLimiter, validate(s.changePasswordSchema), user.changePassword);
r.post('/users/me/delete', requireAuth, authLimiter, validate(s.deleteAccountSchema), user.deleteAccount);
r.get('/notifications', requireAuth, user.listNotifications);
r.post('/notifications/read-all', requireAuth, user.markAllNotificationsRead);
r.post('/notifications/:id/read', requireAuth, user.markNotificationRead);
r.post('/newsletter', authLimiter, validate(s.newsletterSchema), user.subscribeNewsletter);

// ---- Courses (public catalog)
r.get('/categories', course.listCategories);
r.get('/courses', optionalAuth, validate(s.courseListQuery, 'query'), course.listCourses);
r.get('/courses/mine', requireAuth, requireRole('INSTRUCTOR', 'ADMIN'), course.myCourses);
r.get('/courses/:id', optionalAuth, course.getCourse);

// ---- Course management (instructor/admin; ownership enforced in controllers)
const staff = [requireAuth, requireRole('INSTRUCTOR', 'ADMIN')];
r.post('/courses', ...staff, validate(s.courseCreateSchema), course.createCourse);
r.patch('/courses/:id', ...staff, validate(s.courseUpdateSchema), course.updateCourse);
r.delete('/courses/:id', ...staff, course.deleteCourse);
r.post('/courses/:id/publish', ...staff, course.setPublished(true));
r.post('/courses/:id/unpublish', ...staff, course.setPublished(false));

r.get('/courses/:id/curriculum', ...staff, curriculum.getCurriculum);
r.post('/courses/:id/sections', ...staff, validate(s.sectionSchema), curriculum.createSection);
r.post('/courses/:id/sections/reorder', ...staff, validate(s.reorderSchema), curriculum.reorderSections);
r.patch('/sections/:sectionId', ...staff, validate(s.sectionUpdateSchema), curriculum.updateSection);
r.delete('/sections/:sectionId', ...staff, curriculum.deleteSection);
r.post('/sections/:sectionId/lessons', ...staff, validate(s.lessonSchema), curriculum.createLesson);
r.post('/sections/:sectionId/lessons/reorder', ...staff, validate(s.reorderSchema), curriculum.reorderLessons);
r.patch('/lessons/:lessonId', ...staff, validate(s.lessonUpdateSchema), curriculum.updateLesson);
r.delete('/lessons/:lessonId', ...staff, curriculum.deleteLesson);

// ---- Enrollment & learning
r.post('/courses/:id/enroll', requireAuth, requireRole('STUDENT', 'INSTRUCTOR'), learning.enroll);
r.get('/courses/:id/learn', requireAuth, learning.getLearning);
r.get('/enrollments/me', requireAuth, learning.myEnrollments);
r.get('/enrollments/:id', requireAuth, learning.getEnrollment);
r.get('/enrollments/:id/progress', requireAuth, learning.getEnrollmentProgress);
r.post('/lessons/:id/progress', requireAuth, validate(s.progressSchema), learning.updateProgress);
r.post('/lessons/:id/visit', requireAuth, learning.visitLesson);
r.post('/lessons/:id/notes', requireAuth, validate(s.noteSchema), learning.saveNote);

// ---- Reviews, wishlist
r.get('/courses/:id/reviews', validate(s.paginationQuery, 'query'), engage.listReviews);
r.post('/courses/:id/reviews', requireAuth, validate(s.reviewSchema), engage.upsertReview);
r.delete('/courses/:id/reviews', requireAuth, engage.deleteReview);
r.get('/wishlist', requireAuth, engage.listWishlist);
r.post('/courses/:id/wishlist', requireAuth, engage.addWishlist);
r.delete('/courses/:id/wishlist', requireAuth, engage.removeWishlist);

// ---- Certificates
r.get('/certificates/me', requireAuth, engage.myCertificates);
r.get('/certificates/verify/:certificateId', engage.verifyCertificateHandler);
r.post('/courses/:id/certificate', requireAuth, engage.generateCertificate);

// ---- Dashboards
r.get('/dashboard/student', requireAuth, dash.studentDashboard);
r.get('/dashboard/instructor', ...staff, dash.instructorDashboard);
r.get('/dashboard/instructor/students', ...staff, validate(s.paginationQuery, 'query'), dash.instructorStudents);
r.get('/dashboard/admin', requireAuth, requireRole('ADMIN'), dash.adminDashboard);

// ---- Admin
const adminOnly = [requireAuth, requireRole('ADMIN')];
r.get('/admin/users', ...adminOnly, validate(s.adminUsersQuery, 'query'), admin.listUsers);
r.get('/admin/users/:id', ...adminOnly, admin.getUser);
r.patch('/admin/users/:id', ...adminOnly, validate(s.adminUserUpdateSchema), admin.updateUser);
r.get('/admin/courses', ...adminOnly, validate(s.adminCoursesQuery, 'query'), admin.listAdminCourses);
r.patch('/admin/courses/:id', ...adminOnly, validate(s.adminCourseUpdateSchema), admin.moderateCourse);

export default r;
