import { Award } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, QueryBoundary } from '../../components/dashboard';
import { Badge, ButtonLink, EmptyState, Skeleton } from '../../components/ui';
import { ProgressBar, Thumbnail } from '../../components/visual';
import { useMyEnrollments } from '../../services/queries';
import { cn, formatDuration, timeAgo } from '../../utils/format';

const TABS = [['all', 'All'], ['progress', 'In progress'], ['done', 'Completed']] as const;

export default function MyLearning() {
  const q = useMyEnrollments();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('all');
  const items = (q.data ?? []).filter((e) => (tab === 'all' ? true : tab === 'done' ? e.progress.completed : !e.progress.completed));

  return (
    <>
      <PageHeader title="My learning" subtitle="Every course you're enrolled in, with your saved progress." actions={<ButtonLink to="/courses" variant="secondary">Explore courses</ButtonLink>} />
      <div role="tablist" aria-label="Filter courses" className="mb-6 inline-flex rounded-xl border border-[var(--border)] p-1">
        {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('min-h-[40px] rounded-lg px-4 text-sm font-semibold', tab === k ? 'bg-violet text-white' : 'hover:bg-violet/10')}>{label}</button>)}
      </div>
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} skeleton={<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64" />)}</div>}>
        {items.length === 0 ? (
          <EmptyState title={q.data?.length ? 'Nothing in this tab yet' : 'No enrolled courses yet'} message={q.data?.length ? 'Switch tabs to see your other courses.' : 'Enroll in a course and it will show up here.'} action={!q.data?.length ? <ButtonLink to="/courses">Browse courses</ButtonLink> : undefined} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((e) => (
              <article key={e.id} className="surface overflow-hidden">
                <div className="h-36"><Thumbnail src={e.course.thumbnailUrl} title={e.course.title} /></div>
                <div className="space-y-3 p-5">
                  <div className="flex gap-2"><Badge>{e.course.category.name}</Badge>{e.progress.completed && <Badge tone="green">Completed</Badge>}</div>
                  <h2 className="text-lg font-bold leading-snug"><Link to={`/courses/${e.course.slug}`} className="hover:text-violet">{e.course.title}</Link></h2>
                  <p className="text-sm text-subtle">by {e.course.instructor.name} · {formatDuration(e.course.durationMinutes)}</p>
                  <ProgressBar percent={e.progress.percent} />
                  <p className="text-xs text-subtle">{e.progress.completedLessons}/{e.progress.totalLessons} lessons · last active {timeAgo(e.lastAccessedAt)}</p>
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink to={`/learn/${e.courseId}`}>{e.progress.percent === 0 ? 'Start' : e.progress.completed ? 'Review' : 'Continue'}</ButtonLink>
                    {e.certificateId && <ButtonLink to={`/certificates/${e.certificateId}`} variant="gold"><Award className="h-4 w-4" aria-hidden />Certificate</ButtonLink>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
