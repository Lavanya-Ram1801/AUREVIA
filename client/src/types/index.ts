export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

export interface User {
  id: string; email: string; name: string; role: Role; avatarUrl: string | null; isActive: boolean;
  bio: string | null; learningGoal: string | null; weeklyGoalHours: number; emailNotifs: boolean; theme: 'light' | 'dark' | 'system'; createdAt: string;
}
export interface Category { id: string; name: string; slug: string; description: string | null; icon: string | null; courseCount?: number }
export interface InstructorLite { id: string; name: string; avatarUrl: string | null; bio: string | null }
export interface CourseCardData {
  id: string; slug: string; title: string; shortDescription: string; thumbnailUrl: string | null; level: Level; status: CourseStatus;
  priceCents: number; currency: string; isFree: boolean; durationMinutes: number; lessonCount: number;
  category: { id: string; name: string; slug: string }; instructor: InstructorLite; rating: number; reviewCount: number;
  enrollmentCount: number; isEnrolled: boolean; isDemo: boolean; createdAt: string;
}
export interface LessonLite { id: string; title: string; position: number; durationMinutes: number; isPublished: boolean; hasVideo: boolean }
export interface SectionLite { id: string; title: string; position: number; lessons: LessonLite[] }
export interface Review { id: string; rating: number; comment: string | null; createdAt: string; user: { id: string; name: string; avatarUrl: string | null } }
export interface CourseDetail extends CourseCardData {
  description: string; outcomes: string[]; prerequisites: string[]; sections: SectionLite[]; enrollmentId: string | null;
  isWishlisted: boolean; myReview: { rating: number; comment: string | null } | null; canManage: boolean; related: CourseCardData[];
}
export interface ProgressSummary { totalLessons: number; completedLessons: number; percent: number; completed: boolean }
export interface EnrollmentItem {
  id: string; courseId: string; lastLessonId: string | null; lastAccessedAt: string; completedAt: string | null; enrolledAt: string;
  progress: ProgressSummary; certificateId: string | null;
  course: { id: string; slug: string; title: string; thumbnailUrl: string | null; level: Level; durationMinutes: number; category: { name: string; slug: string }; instructor: InstructorLite; status: CourseStatus };
}
export interface PlayerLesson {
  id: string; title: string; position: number; content: string; videoUrl: string | null; resourceUrl: string | null; resourceName: string | null;
  durationMinutes: number; isPublished: boolean; completed: boolean; bookmarked: boolean; note: string;
}
export interface PlayerData {
  course: { id: string; title: string; slug: string }; enrollmentId: string | null; isPreview: boolean; lastLessonId: string | null;
  summary: ProgressSummary | null; sections: { id: string; title: string; position: number; lessons: PlayerLesson[] }[];
}
export interface Certificate { id: string; certificateId: string; studentName: string; courseTitle: string; issuedAt: string; courseId: string }
export interface Notification { id: string; type: string; title: string; message: string; link: string | null; read: boolean; createdAt: string }
export interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages?: number } }

export interface StudentDashboard {
  stats: { enrolled: number; inProgress: number; completed: number; overallProgress: number; certificates: number };
  weeklyActivity: { date: string; lessons: number; minutes: number }[];
  goals: { weeklyGoalHours: number; weeklyMinutes: number; learningGoal: string | null };
  continueLearning: EnrollmentItem | null;
  recentCourses: EnrollmentItem[];
  recommended: CourseCardData[];
  recentActivity: { type: string; title: string; course: string; at: string }[];
}
export interface InstructorDashboard {
  stats: { totalCourses: number; published: number; drafts: number; totalEnrollments: number; completionRate: number };
  engagement: { date: string; enrollments: number }[];
  perCourse: { id: string; title: string; status: CourseStatus; enrollments: number; completions: number }[];
  recentEnrollments: { id: string; at: string; student: { id: string; name: string; avatarUrl: string | null }; course: { id: string; title: string } }[];
}
export interface StudentProgressRow {
  enrollmentId: string; lastAccessedAt: string; completedAt: string | null; progress: ProgressSummary;
  student: { id: string; name: string; email: string; avatarUrl: string | null }; course: { id: string; title: string };
}
export interface AdminDashboard {
  stats: { users: number; students: number; instructors: number; admins: number; courses: number; published: number; drafts: number; enrollments: number };
  activity: { date: string; registrations: number; enrollments: number }[];
  recentUsers: { id: string; name: string; email: string; role: Role; createdAt: string; isActive: boolean }[];
  recentCourses: { id: string; title: string; status: CourseStatus; createdAt: string; instructor: { name: string } }[];
}
export interface AdminUserRow extends User { enrollmentCount: number; courseCount: number }
export interface AdminCourseRow {
  id: string; slug: string; title: string; status: CourseStatus; level: Level; createdAt: string;
  instructor: { id: string; name: string }; category: string; enrollmentCount: number; reviewCount: number;
}
export interface EditableLesson {
  id: string; title: string; position: number; content: string; videoUrl: string | null; resourceUrl: string | null; resourceName: string | null; durationMinutes: number; isPublished: boolean;
}
export interface EditableSection { id: string; title: string; position: number; lessons: EditableLesson[] }
export interface EditableCourse {
  id: string; slug: string; title: string; shortDescription: string; description: string; categoryId: string; level: Level; status: CourseStatus;
  thumbnailUrl: string | null; outcomes: string[]; prerequisites: string[]; priceCents: number; durationMinutes: number;
}
