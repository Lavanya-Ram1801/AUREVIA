import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { AuthProvider } from '../hooks/useAuth';
import { ThemeProvider } from '../hooks/useTheme';
import type { CourseCardData, User } from '../types';

export const student: User = {
  id: 'u1', email: 'sam@example.test', name: 'Sam Student', role: 'STUDENT', avatarUrl: null, isActive: true, bio: null, learningGoal: null,
  weeklyGoalHours: 3, emailNotifs: true, theme: 'system', createdAt: '2026-01-01T00:00:00.000Z',
};

type Handler = (url: URL, init: RequestInit) => { status?: number; body: unknown };
/** Replaces global fetch. Keys are "METHOD /path" (path without the /api/v1 prefix). Records every call. */
export function mockApi(routes: Record<string, Handler | unknown>) {
  const calls: { method: string; path: string; search: URLSearchParams; body: unknown }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init.method ?? 'GET').toUpperCase();
    const path = url.pathname.replace(/^\/api\/v1/, '');
    calls.push({ method, path, search: url.searchParams, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const route = routes[`${method} ${path}`];
    if (route === undefined) return new Response(JSON.stringify({ error: { message: `No mock for ${method} ${path}` } }), { status: 404 });
    const out = typeof route === 'function' ? (route as Handler)(url, init) : { body: route };
    return new Response(JSON.stringify(out.body), { status: out.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn };
}

export function renderApp(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider><ToastProvider><MemoryRouter initialEntries={[route]}><AuthProvider>{ui}</AuthProvider></MemoryRouter></ToastProvider></ThemeProvider>
    </QueryClientProvider>,
  );
}

export const makeCourse = (over: Partial<CourseCardData> = {}): CourseCardData => ({
  id: 'c1', slug: 'modern-js', title: 'Modern JavaScript', shortDescription: 'Learn the language of the web properly.', thumbnailUrl: null, level: 'BEGINNER', status: 'PUBLISHED',
  priceCents: 0, currency: 'USD', isFree: true, durationMinutes: 90, lessonCount: 6, category: { id: 'cat1', name: 'Web Development', slug: 'web-development' },
  instructor: { id: 'i1', name: 'Maya Iyer', avatarUrl: null, bio: null }, rating: 0, reviewCount: 0, enrollmentCount: 3, isEnrolled: false, isDemo: true, createdAt: '2026-01-01T00:00:00.000Z', ...over,
});
