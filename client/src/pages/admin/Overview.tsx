import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileEdit, GraduationCap, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART, PageHeader, Panel, QueryBoundary, shortDay, StatCard } from '../../components/dashboard';
import { Badge, Skeleton } from '../../components/ui';
import { get } from '../../services/api';
import type { AdminDashboard } from '../../types';
import { formatDate } from '../../utils/format';
import { STATUS_TONE } from '../instructor/MyCourses';

export default function AdminOverview() {
  const q = useQuery({ queryKey: ['dashboard', 'admin'], queryFn: () => get<AdminDashboard>('/dashboard/admin') });
  const d = q.data;
  return (
    <>
      <PageHeader title="Admin overview" subtitle="Platform activity computed from live data." />
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} skeleton={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Registered users" value={d.stats.users} />
              <StatCard icon={GraduationCap} label="Students" value={d.stats.students} />
              <StatCard icon={UserCog} label="Instructors" value={d.stats.instructors} tone="gold" />
              <StatCard icon={GraduationCap} label="Enrollments" value={d.stats.enrollments} tone="green" />
              <StatCard icon={BookOpen} label="Total courses" value={d.stats.courses} />
              <StatCard icon={BookOpen} label="Published" value={d.stats.published} tone="green" />
              <StatCard icon={FileEdit} label="Draft / unpublished" value={d.stats.drafts} tone="gold" />
              <StatCard icon={UserCog} label="Admins" value={d.stats.admins} />
            </div>
            <Panel title="Platform activity" action={<span className="text-xs text-subtle">Last 14 days</span>}>
              <div className="h-64" role="img" aria-label="Line chart of daily registrations and enrollments over the last 14 days">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.activity.map((a) => ({ ...a, day: shortDay(a.date) }))}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip /><Legend />
                    <Line type="monotone" dataKey="registrations" name="Registrations" stroke={CHART.violet} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke={CHART.gold} strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Recent registrations" action={<Link to="/admin/users" className="text-sm font-semibold text-violet">Manage users →</Link>}>
                <ul className="divide-y divide-[var(--border)] text-sm">
                  {d.recentUsers.map((u) => <li key={u.id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate font-semibold">{u.name}</span><span className="text-xs text-subtle">{u.email} · {formatDate(u.createdAt)}</span></span><Badge tone={u.isActive ? 'violet' : 'red'} className="capitalize">{u.isActive ? u.role.toLowerCase() : 'deactivated'}</Badge></li>)}
                </ul>
              </Panel>
              <Panel title="Recent courses" action={<Link to="/admin/courses" className="text-sm font-semibold text-violet">Moderate →</Link>}>
                <ul className="divide-y divide-[var(--border)] text-sm">
                  {d.recentCourses.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate font-semibold">{c.title}</span><span className="text-xs text-subtle">by {c.instructor.name} · {formatDate(c.createdAt)}</span></span><Badge tone={STATUS_TONE[c.status]}>{c.status.toLowerCase()}</Badge></li>)}
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
