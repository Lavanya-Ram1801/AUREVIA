import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Courses from '../pages/Courses';
import CourseDetail from '../pages/CourseDetail';
import type { CourseDetail as CourseDetailData } from '../types';
import { makeCourse, mockApi, renderApp, student } from './utils';

const unauth = () => ({ status: 401, body: { error: { message: 'Unauthorized' } } });
const categories = { data: [{ id: 'cat1', name: 'Web Development', slug: 'web-development', description: null, icon: 'code' }] };

describe('Course catalog', () => {
  it('shows skeletons, then courses from the API', async () => {
    mockApi({ 'GET /auth/me': unauth, 'GET /categories': categories, 'GET /courses': { data: [makeCourse()], meta: { page: 1, pageSize: 9, total: 1, totalPages: 1 } } });
    renderApp(<Courses />);
    expect(await screen.findByRole('link', { name: 'Modern JavaScript' })).toBeInTheDocument();
    expect(screen.getByText('1 course found')).toBeInTheDocument();
  });

  it('sends the debounced search term to the API', async () => {
    const api = mockApi({ 'GET /auth/me': unauth, 'GET /categories': categories, 'GET /courses': { data: [makeCourse()], meta: { page: 1, pageSize: 9, total: 1, totalPages: 1 } } });
    renderApp(<Courses />);
    await userEvent.type(await screen.findByLabelText('Search'), 'react');
    await waitFor(() => expect(api.calls.some((c) => c.path === '/courses' && c.search.get('q') === 'react')).toBe(true), { timeout: 2000 });
  });

  it('shows an empty state with a working Clear filters action', async () => {
    const api = mockApi({ 'GET /auth/me': unauth, 'GET /categories': categories, 'GET /courses': { data: [], meta: { page: 1, pageSize: 9, total: 0, totalPages: 0 } } });
    renderApp(<Courses />, { route: '/courses?level=ADVANCED' });
    expect(await screen.findByText(/no courses match your search/i)).toBeInTheDocument();
    expect(api.calls.some((c) => c.path === '/courses' && c.search.get('level') === 'ADVANCED')).toBe(true);
    await userEvent.click(screen.getAllByRole('button', { name: /clear filters/i })[0]!);
    await waitFor(() => expect(api.calls.filter((c) => c.path === '/courses').some((c) => !c.search.get('level'))).toBe(true));
  });

  it('shows an error state with retry when the API fails', async () => {
    mockApi({ 'GET /auth/me': unauth, 'GET /categories': categories, 'GET /courses': () => ({ status: 500, body: { error: { message: 'Server exploded' } } }) });
    renderApp(<Courses />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/server exploded/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('Enrollment flow', () => {
  const detail = (over: Partial<CourseDetailData> = {}): CourseDetailData => ({
    ...makeCourse(), description: 'A long description of the course that is clearly more than thirty characters.', outcomes: ['Write modern JS'], prerequisites: [],
    sections: [{ id: 's1', title: 'Foundations', position: 0, lessons: [{ id: 'l1', title: 'Values and types', position: 0, durationMinutes: 10, isPublished: true, hasVideo: false }] }],
    enrollmentId: null, isWishlisted: false, myReview: null, canManage: false, related: [], ...over,
  });

  it('enrolls a signed-in student in a free course', async () => {
    const api = mockApi({
      'GET /auth/me': { data: { user: student } },
      'GET /courses/modern-js': { data: detail() },
      'GET /courses/c1/reviews': { data: [], meta: { page: 1, pageSize: 10, total: 0, average: 0 } },
      'POST /courses/c1/enroll': () => ({ status: 201, body: { data: { id: 'e1' } } }),
    });
    renderApp(<Routes><Route path="/courses/:slug" element={<CourseDetail />} /></Routes>, { route: '/courses/modern-js' });
    await userEvent.click(await screen.findByRole('button', { name: /enroll for free/i }));
    await waitFor(() => expect(api.calls.some((c) => c.method === 'POST' && c.path === '/courses/c1/enroll')).toBe(true));
    expect(await screen.findByText(/you're in!/i)).toBeInTheDocument();
  });

  it('asks guests to sign in instead of enrolling', async () => {
    const api = mockApi({ 'GET /auth/me': unauth, 'GET /courses/modern-js': { data: detail() }, 'GET /courses/c1/reviews': { data: [], meta: { page: 1, pageSize: 10, total: 0, average: 0 } } });
    renderApp(<Routes><Route path="/courses/:slug" element={<CourseDetail />} /><Route path="/login" element={<p>login page</p>} /></Routes>, { route: '/courses/modern-js' });
    await userEvent.click(await screen.findByRole('button', { name: /sign in to enroll/i }));
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(api.calls.some((c) => c.path.endsWith('/enroll'))).toBe(false);
  });

  it('disables enrollment for paid courses (no payment provider configured)', async () => {
    mockApi({ 'GET /auth/me': { data: { user: student } }, 'GET /courses/modern-js': { data: detail({ priceCents: 4900, isFree: false }) }, 'GET /courses/c1/reviews': { data: [], meta: { page: 1, pageSize: 10, total: 0, average: 0 } } });
    renderApp(<Routes><Route path="/courses/:slug" element={<CourseDetail />} /></Routes>, { route: '/courses/modern-js' });
    expect(await screen.findByRole('button', { name: /checkout unavailable/i })).toBeDisabled();
  });

  it('offers Continue learning when already enrolled', async () => {
    mockApi({ 'GET /auth/me': { data: { user: student } }, 'GET /courses/modern-js': { data: detail({ enrollmentId: 'e1', isEnrolled: true }) }, 'GET /courses/c1/reviews': { data: [], meta: { page: 1, pageSize: 10, total: 0, average: 0 } } });
    renderApp(<Routes><Route path="/courses/:slug" element={<CourseDetail />} /></Routes>, { route: '/courses/modern-js' });
    expect(await screen.findByRole('link', { name: /continue learning/i })).toHaveAttribute('href', '/learn/c1');
  });
});
