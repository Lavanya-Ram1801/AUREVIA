import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from '../components/ui';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { GuestOnly, RequireAuth } from './guards';

const L = (f: () => Promise<{ default: React.ComponentType }>) => lazy(f);
const Landing = L(() => import('../pages/Landing'));
const Courses = L(() => import('../pages/Courses'));
const CourseDetail = L(() => import('../pages/CourseDetail'));
const Login = L(() => import('../pages/auth/Login'));
const Register = L(() => import('../pages/auth/Register'));
const Forgot = L(() => import('../pages/auth/ForgotPassword'));
const Reset = L(() => import('../pages/auth/ResetPassword'));
const Verify = L(() => import('../pages/Verify'));
const CertificateView = L(() => import('../pages/CertificateView'));
const NotFound = L(() => import('../pages/NotFound'));
const Learn = L(() => import('../pages/Learn'));
const StudentOverview = L(() => import('../pages/student/Overview'));
const MyLearning = L(() => import('../pages/student/MyLearning'));
const Certificates = L(() => import('../pages/student/Certificates'));
const Wishlist = L(() => import('../pages/student/Wishlist'));
const Settings = L(() => import('../pages/Settings'));
const InstructorOverview = L(() => import('../pages/instructor/Overview'));
const InstructorCourses = L(() => import('../pages/instructor/MyCourses'));
const CourseEditor = L(() => import('../pages/instructor/CourseEditor'));
const StudentProgress = L(() => import('../pages/instructor/StudentProgress'));
const AdminOverview = L(() => import('../pages/admin/Overview'));
const AdminUsers = L(() => import('../pages/admin/Users'));
const AdminCourses = L(() => import('../pages/admin/Courses'));

export function AppRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<PublicLayout overlayHeader />}><Route index element={<Landing />} /></Route>
        <Route element={<PublicLayout />}>
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:slug" element={<CourseDetail />} />
          <Route path="verify" element={<Verify />} />
          <Route path="verify/:certificateId" element={<Verify />} />
          <Route element={<GuestOnly />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<Forgot />} />
            <Route path="reset-password" element={<Reset />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="certificates/:certificateId" element={<CertificateView />} />
        <Route element={<RequireAuth />}><Route path="learn/:courseId" element={<Learn />} /></Route>

        <Route element={<RequireAuth />}>
          <Route element={<DashboardLayout />}>
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route element={<RequireAuth roles={['STUDENT']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<StudentOverview />} />
            <Route path="dashboard/learning" element={<MyLearning />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="wishlist" element={<Wishlist />} />
          </Route>
        </Route>
        <Route element={<RequireAuth roles={['INSTRUCTOR', 'ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="instructor" element={<InstructorOverview />} />
            <Route path="instructor/courses" element={<InstructorCourses />} />
            <Route path="instructor/courses/new" element={<CourseEditor />} />
            <Route path="instructor/courses/:id" element={<CourseEditor />} />
            <Route path="instructor/students" element={<StudentProgress />} />
          </Route>
        </Route>
        <Route element={<RequireAuth roles={['ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="admin" element={<AdminOverview />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/courses" element={<AdminCourses />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
