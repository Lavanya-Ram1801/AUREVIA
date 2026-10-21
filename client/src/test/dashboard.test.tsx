import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardLayout } from '../layouts/DashboardLayout';
import StudentOverview from '../pages/student/Overview';
import type { StudentDashboard, User } from '../types';
import { GuestOnly, RequireAuth } from '../routes/guards';
import { mockApi, renderApp, student } from './utils';

const empty: StudentDashboard = {
  stats: { enrolled: 0, inProgress: 0, completed: 0, overallProgress: 0, certificates: 0 }, weeklyActivity: [], goals: { weeklyGoalHours: 3, weeklyMinutes: 0, learningGoal: null },
  continueLearning: null, recentCourses: [], recommended: [], recentActivity: [],
};
const base = { 'GET /auth/me': { data: { user: student } }, 'GET /notifications': { data: { items: [], unread: 0 } } };

describe('Student dashboard', () => {
  it('shows a labelled empty state for new users', async () => {
    mockApi({ ...base, 'GET /dashboard/student': { data: empty } });
    renderApp(<StudentOverview />);
    expect(await screen.findByText(/you haven't enrolled in a course yet/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /welcome back, sam/i })).toBeInTheDocument();
  });

  it('renders real numbers from the API', async () => {
    mockApi({ ...base, 'GET /dashboard/student': { data: { ...empty, stats: { enrolled: 4, inProgress: 3, completed: 1, overallProgress: 42, certificates: 1 } } } });
    renderApp(<StudentOverview />);
    expect(await screen.findByText('Enrolled courses')).toBeInTheDocument();
    expect(screen.getByText('Certificates earned')).toBeInTheDocument();
  });

  it('shows an error state with retry when the dashboard fails to load', async () => {
    mockApi({ ...base, 'GET /dashboard/student': () => ({ status: 500, body: { error: { message: 'Database unavailable' } } }) });
    renderApp(<StudentOverview />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/database unavailable/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('Navigation & route guards', () => {
  const tree = (
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route element={<RequireAuth roles={['ADMIN']} />}><Route path="/admin" element={<p>admin area</p>} /></Route>
      <Route element={<RequireAuth />}><Route element={<DashboardLayout />}><Route path="/dashboard" element={<p>student area</p>} /></Route></Route>
      <Route element={<GuestOnly />}><Route path="/register" element={<p>register page</p>} /></Route>
    </Routes>
  );

  it('redirects guests to login', async () => {
    mockApi({ 'GET /auth/me': () => ({ status: 401, body: { error: { message: 'Unauthorized' } } }) });
    renderApp(tree, { route: '/dashboard' });
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('keeps students out of admin routes', async () => {
    mockApi({ ...base });
    renderApp(tree, { route: '/admin' });
    expect(await screen.findByText('student area')).toBeInTheDocument();
    expect(screen.queryByText('admin area')).not.toBeInTheDocument();
  });

  it('shows the full student sidebar', async () => {
    mockApi({ ...base });
    renderApp(tree, { route: '/dashboard' });
    const nav = (await screen.findAllByRole('navigation', { name: /dashboard/i }))[0]!;
    for (const label of ['Overview', 'My Learning', 'Explore Courses', 'Certificates', 'Wishlist', 'Profile Settings']) expect(nav).toHaveTextContent(label);
    expect(screen.getAllByRole('button', { name: /logout/i }).length).toBeGreaterThan(0);
  });

  it('shows role-specific navigation for instructors', async () => {
    const instructor: User = { ...student, role: 'INSTRUCTOR', name: 'Ines Instructor' };
    mockApi({ 'GET /auth/me': { data: { user: instructor } }, 'GET /notifications': { data: { items: [], unread: 0 } } });
    renderApp(tree, { route: '/dashboard' });
    const nav = (await screen.findAllByRole('navigation', { name: /dashboard/i }))[0]!;
    for (const label of ['My Courses', 'Create Course', 'Student Progress']) expect(nav).toHaveTextContent(label);
  });
});
