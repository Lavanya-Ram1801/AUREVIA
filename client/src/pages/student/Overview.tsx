import { useQuery } from '@tanstack/react-query';
import { Award, BookOpen, CheckCircle2, Flame, PlayCircle, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CourseCard } from '../../components/CourseCard';
import { CHART, PageHeader, Panel, QueryBoundary, shortDay, StatCard } from '../../components/dashboard';
import { Avatar, Badge, ButtonLink, EmptyState, Skeleton } from '../../components/ui';
import { ProgressBar, ProgressRing, Thumbnail } from '../../components/visual';
import { useAuth } from '../../hooks/useAuth';
import { get } from '../../services/api';
import type { StudentDashboard } from '../../types';
import { formatDuration, timeAgo } from '../../utils/format';

export default function StudentOverview() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['dashboard', 'student'], queryFn: () => get<StudentDashboard>('/dashboard/student') });
  const d = q.data;
  const goalMinutes = (d?.goals.weeklyGoalHours ?? 0) * 60;
  const goalPct = d && goalMinutes ? Math.min(100, Math.round((d.goals.weeklyMinutes / goalMinutes) * 100)) : 0;

  return (
    <>
      <PageHeader title={`Welcome back, ${user?.name.split(' ')[0] ?? 'learner'}`} subtitle={d?.goals.learningGoal ? `Your goal: ${d.goals.learningGoal}` : 'Pick up where you left off.'} actions={<ButtonLink to="/courses" variant="secondary">Explore courses</ButtonLink>} />
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}
        skeleton={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}>
        {d && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={BookOpen} label="Enrolled courses" value={d.stats.enrolled} />
              <StatCard icon={PlayCircle} label="In progress" value={d.stats.inProgress} />
              <StatCard icon={CheckCircle2} label="Completed" value={d.stats.completed} tone="green" />
              <StatCard icon={Award} label="Certificates earned" value={d.stats.certificates} tone="gold" />
            </div>

            {d.stats.enrolled === 0 ? (
              <EmptyState title="You haven't enrolled in a course yet" message="Your progress, activity and recommendations will appear here once you start learning." action={<ButtonLink to="/courses">Browse the catalog</ButtonLink>} />
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <Panel title="Continue learning" className="lg:col-span-2">
                  {d.continueLearning ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="h-28 w-full overflow-hidden rounded-xl sm:w-44"><Thumbnail src={d.continueLearning.course.thumbnailUrl} title={d.continueLearning.course.title} /></div>
                      <div className="flex-1">
                        <Badge>{d.continueLearning.course.category.name}</Badge>
                        <h3 className="mt-1 text-lg font-bold">{d.continueLearning.course.title}</h3>
                        <p className="text-sm text-subtle">{d.continueLearning.progress.completedLessons} of {d.continueLearning.progress.totalLessons} lessons done</p>
                        <ProgressBar percent={d.continueLearning.progress.percent} className="mt-3" />
                      </div>
                      <ButtonLink to={`/learn/${d.continueLearning.courseId}`}>Resume</ButtonLink>
                    </div>
                  ) : <p className="text-subtle">Every enrolled course is complete. Nice work. Find something new below.</p>}
                </Panel>
                <Panel title="Overall progress">
                  <div className="flex items-center gap-4"><ProgressRing percent={d.stats.overallProgress} size={96} stroke={9} label={`Overall progress ${d.stats.overallProgress}%`} />
                    <p className="text-sm text-subtle">Average completion across your {d.stats.enrolled} enrolled course{d.stats.enrolled === 1 ? '' : 's'}.</p></div>
                </Panel>

                <Panel title="Weekly learning activity" className="lg:col-span-2" action={<span className="text-xs text-subtle">Minutes of completed lessons, last 7 days</span>}>
                  <div className="h-60" role="img" aria-label="Bar chart of minutes learned per day over the last seven days">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d.weeklyActivity.map((w) => ({ ...w, day: shortDay(w.date) }))}>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 12 }} tickLine={false} axisLine={false} width={32} />
                        <Tooltip cursor={{ fill: 'rgba(118,87,255,.08)' }} formatter={(v) => [`${String(v)} min`, 'Learned']} />
                        <Bar dataKey="minutes" fill={CHART.violet} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
                <Panel title="Weekly goal" action={<Target className="h-5 w-5 text-gold" aria-hidden />}>
                  <p className="text-3xl font-extrabold">{formatDuration(d.goals.weeklyMinutes)}<span className="text-base font-medium text-subtle"> / {d.goals.weeklyGoalHours}h</span></p>
                  <ProgressBar percent={goalPct} className="mt-3" />
                  <p className="mt-2 text-sm text-subtle">{goalPct >= 100 ? 'Goal reached this week. 🎉' : `${100 - goalPct}% to go. Change your goal in Profile Settings.`}</p>
                </Panel>

                <Panel title="Recently accessed" className="lg:col-span-2">
                  <ul className="divide-y divide-[var(--border)]">
                    {d.recentCourses.map((e) => (
                      <li key={e.id} className="flex items-center gap-4 py-3">
                        <ProgressRing percent={e.progress.percent} size={48} stroke={5} />
                        <div className="min-w-0 flex-1"><Link to={`/learn/${e.courseId}`} className="block truncate font-semibold hover:text-violet">{e.course.title}</Link><p className="text-xs text-subtle">Last active {timeAgo(e.lastAccessedAt)}</p></div>
                        {e.progress.completed && <Badge tone="green">Completed</Badge>}
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel title="Recent activity" action={<Flame className="h-5 w-5 text-gold" aria-hidden />}>
                  {d.recentActivity.length === 0 ? <p className="text-sm text-subtle">Complete a lesson to start your activity feed.</p> : (
                    <ul className="space-y-3 text-sm">{d.recentActivity.map((a, i) => <li key={i}><span className="font-semibold">Completed</span> {a.title}<br /><span className="text-xs text-subtle">{a.course} · {timeAgo(a.at)}</span></li>)}</ul>
                  )}
                </Panel>
              </div>
            )}

            {d.recommended.length > 0 && (
              <section aria-labelledby="rec">
                <h2 id="rec" className="mb-4 text-lg font-bold">Recommended for you</h2>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{d.recommended.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}</div>
              </section>
            )}
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4 text-sm text-subtle"><Avatar name={user?.name ?? '?'} src={user?.avatarUrl} size={40} />
              <span>{user?.name} · {user?.email} · <span className="capitalize">{user?.role.toLowerCase()}</span></span><Link to="/settings" className="ml-auto font-semibold text-violet">Edit profile</Link></div>
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
