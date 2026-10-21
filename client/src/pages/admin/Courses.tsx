import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader, Pager, QueryBoundary } from '../../components/dashboard';
import { useToast } from '../../components/Toast';
import { Badge, Button, ButtonLink, ConfirmDialog, EmptyState, Select, Skeleton } from '../../components/ui';
import { get, patch } from '../../services/api';
import type { AdminCourseRow, Paged } from '../../types';
import { formatDate, LEVEL_LABEL } from '../../utils/format';
import { STATUS_TONE } from '../instructor/MyCourses';

const PAGE_SIZE = 15;

export default function AdminCourses() {
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ course: AdminCourseRow; next: 'PUBLISHED' | 'UNPUBLISHED' } | null>(null);
  useEffect(() => { const t = window.setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => window.clearTimeout(t); }, [search]);

  const list = useQuery({ queryKey: ['admin-courses', q, status, page], queryFn: () => get<Paged<AdminCourseRow>>('/admin/courses', { q, status, page, pageSize: PAGE_SIZE }), placeholderData: (p) => p });
  const moderate = useMutation({
    mutationFn: (t: NonNullable<typeof target>) => patch(`/admin/courses/${t.course.id}`, { status: t.next }),
    onSuccess: () => { toast.success('Course status updated. The instructor was notified.'); setTarget(null); void qc.invalidateQueries({ queryKey: ['admin-courses'] }); void qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] }); },
    onError: (e) => { toast.error(e instanceof Error ? e.message : 'Could not update course'); setTarget(null); },
  });

  return (
    <>
      <PageHeader title="Course moderation" subtitle="Review every course on the platform and unpublish anything that breaks the rules." />
      <div className="surface mb-6 grid gap-4 p-4 md:grid-cols-3">
        <div className="md:col-span-2"><label htmlFor="course-q" className="mb-1.5 block text-sm font-semibold">Search by title</label>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden /><input id="course-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm" /></div></div>
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Any status</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="UNPUBLISHED">Unpublished</option></Select>
      </div>
      <QueryBoundary loading={list.isLoading} error={list.error} onRetry={() => void list.refetch()} skeleton={<Skeleton className="h-64" />}>
        {list.data && list.data.data.length === 0 ? <EmptyState title="No courses match" message="Try a different search or status." /> : (
          <>
            <div className="surface overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <caption className="sr-only">All courses</caption>
                <thead className="border-b border-[var(--border)] text-subtle"><tr>{['Course', 'Instructor', 'Status', 'Enrolled', 'Reviews', 'Created', 'Actions'].map((h) => <th key={h} scope="col" className="p-4 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {list.data?.data.map((c) => (
                    <tr key={c.id}>
                      <td className="p-4"><span className="block font-semibold">{c.title}</span><span className="text-xs text-subtle">{c.category} · {LEVEL_LABEL[c.level]}</span></td>
                      <td className="p-4">{c.instructor.name}</td>
                      <td className="p-4"><Badge tone={STATUS_TONE[c.status]}>{c.status.toLowerCase()}</Badge></td>
                      <td className="p-4">{c.enrollmentCount}</td><td className="p-4">{c.reviewCount}</td><td className="p-4 text-subtle">{formatDate(c.createdAt)}</td>
                      <td className="p-4"><div className="flex gap-2">
                        <ButtonLink to={`/learn/${c.id}`} variant="secondary" className="!min-h-[40px] !px-3" aria-label={`Preview ${c.title}`}><Eye className="h-4 w-4" aria-hidden /></ButtonLink>
                        {c.status === 'PUBLISHED'
                          ? <Button variant="ghost" className="!min-h-[40px] !px-3" onClick={() => setTarget({ course: c, next: 'UNPUBLISHED' })}>Unpublish</Button>
                          : <Button className="!min-h-[40px] !px-3" onClick={() => setTarget({ course: c, next: 'PUBLISHED' })}>Publish</Button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={list.data?.meta.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </QueryBoundary>
      <ConfirmDialog open={Boolean(target)} danger={target?.next === 'UNPUBLISHED'} loading={moderate.isPending} confirmLabel={target?.next === 'PUBLISHED' ? 'Publish' : 'Unpublish'}
        title={target?.next === 'PUBLISHED' ? 'Publish this course?' : 'Unpublish this course?'}
        message={target ? (target.next === 'PUBLISHED' ? `"${target.course.title}" will become visible in the catalog.` : `"${target.course.title}" will be hidden from the catalog and enrolled learners will lose access until it is republished.`) : ''}
        onCancel={() => setTarget(null)} onConfirm={() => target && moderate.mutate(target)} />
    </>
  );
}
