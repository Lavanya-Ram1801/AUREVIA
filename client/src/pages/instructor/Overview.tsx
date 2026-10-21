import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, FileEdit, GraduationCap, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART, PageHeader, Panel, QueryBoundary, shortDay, StatCard } from '../../components/dashboard';
import { Avatar, ButtonLink, EmptyState, Skeleton } from '../../components/ui';
import { get } from '../../services/api';
import type { InstructorDashboard } from '../../types';
import { timeAgo } from '../../utils/format';

export default function InstructorOverview() {
  const q = useQuery({ queryKey: ['dashboard', 'instructor'], queryFn: () => get<InstructorDashboard>('/dashboard/instructor') });
  const d = q.data;
  return (
    <>
      <PageHeader title="Instructor overview" subtitle="How your courses are performing, from live enrollment data." actions={<ButtonLink to="/instructor/courses/new">Create course</ButtonLink>} />
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} skeleton={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard icon={BookOpen} label="Courses created" value={d.stats.totalCourses} />
              <StatCard icon={CheckCircle2} label="Published" value={d.stats.published} tone="green" />
              <StatCard icon={FileEdit} label="Drafts" value={d.stats.drafts} tone="gold" />
              <StatCard icon={GraduationCap} label="Enrollments" value={d.stats.totalEnrollments} />
              <StatCard icon={Percent} label="Completion rate" value={d.stats.completionRate} suffix="%" tone="green" />
            </div>
            {d.stats.totalCourses === 0 ? (
              <EmptyState title="You haven't created a course yet" message="Create your first course, add lessons, then publish it to start enrolling learners." action={<ButtonLink to="/instructor/courses/new">Create your first course</ButtonLink>} />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="New enrollments" action={<span className="text-xs text-subtle">Last 14 days</span>}>
                  <div className="h-60" role="img" aria-label="Area chart of new enrollments per day over the last 14 days">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={d.engagement.map((e) => ({ ...e, day: shortDay(e.date) }))}>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
                        <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip />
                        <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke={CHART.violet} fill={CHART.violet} fillOpacity={0.18} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel title="Enrollments vs completions by course">
                  <div className="h-60" role="img" aria-label="Bar chart comparing enrollments and completions for each course">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d.perCourse.map((c) => ({ ...c, name: c.title.length > 16 ? `${c.title.slice(0, 15)}…` : c.title }))}>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip cursor={{ fill: 'rgba(118,87,255,.08)' }} />
                        <Legend />
                        <Bar dataKey="enrollments" name="Enrollments" fill={CHART.violet} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completions" name="Completions" fill={CHART.gold} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel title="Recent enrollment activity" className="lg:col-span-2" action={<Link to="/instructor/students" className="text-sm font-semibold text-violet">Student progress →</Link>}>
                  {d.recentEnrollments.length === 0 ? <p className="text-sm text-subtle">No one has enrolled yet.</p> : (
                    <ul className="divide-y divide-[var(--border)]">
                      {d.recentEnrollments.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 py-3 text-sm"><Avatar name={r.student.name} src={r.student.avatarUrl} /><span className="flex-1"><span className="font-semibold">{r.student.name}</span> enrolled in {r.course.title}</span><span className="text-xs text-subtle">{timeAgo(r.at)}</span></li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            )}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
