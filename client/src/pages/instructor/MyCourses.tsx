import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, QueryBoundary } from '../../components/dashboard';
import { useToast } from '../../components/Toast';
import { Badge, Button, ButtonLink, ConfirmDialog, EmptyState, Skeleton } from '../../components/ui';
import { del, get, post } from '../../services/api';
import type { CourseCardData, CourseStatus } from '../../types';
import { formatDuration, formatPrice } from '../../utils/format';

export const STATUS_TONE: Record<CourseStatus, 'green' | 'gold' | 'gray'> = { PUBLISHED: 'green', DRAFT: 'gold', UNPUBLISHED: 'gray' };

export default function MyCourses() {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-courses'], queryFn: () => get<CourseCardData[]>('/courses/mine') });
  const [toDelete, setToDelete] = useState<CourseCardData | null>(null);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['my-courses'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }); };

  const toggle = useMutation({
    mutationFn: (c: CourseCardData) => post(`/courses/${c.id}/${c.status === 'PUBLISHED' ? 'unpublish' : 'publish'}`),
    onSuccess: (_r, c) => { toast.success(c.status === 'PUBLISHED' ? 'Course unpublished' : 'Course published'); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not update course'),
  });
  const remove = useMutation({
    mutationFn: (c: CourseCardData) => del(`/courses/${c.id}`),
    onSuccess: () => { toast.success('Course deleted'); setToDelete(null); refresh(); },
    onError: (e) => { toast.error(e instanceof Error ? e.message : 'Could not delete course'); setToDelete(null); },
  });

  return (
    <>
      <PageHeader title="My courses" subtitle="Create, edit and publish your courses." actions={<ButtonLink to="/instructor/courses/new">Create course</ButtonLink>} />
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} skeleton={<div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>}>
        {q.data && q.data.length === 0 ? (
          <EmptyState title="No courses yet" message="Start with a draft. You can add sections and lessons, preview it, and publish when it's ready." action={<ButtonLink to="/instructor/courses/new">Create a course</ButtonLink>} />
        ) : (
          <ul className="space-y-3">
            {q.data?.map((c) => (
              <li key={c.id} className="surface flex flex-col gap-4 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[c.status]}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Badge><Badge tone="gray">{c.category.name}</Badge></div>
                  <h2 className="truncate text-lg font-bold"><Link to={`/instructor/courses/${c.id}`} className="hover:text-violet">{c.title}</Link></h2>
                  <p className="text-sm text-subtle">{c.lessonCount} lessons · {formatDuration(c.durationMinutes)} · {formatPrice(c.priceCents, c.currency)} · {c.enrollmentCount} enrolled</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink to={`/instructor/courses/${c.id}`} variant="secondary"><Pencil className="h-4 w-4" aria-hidden />Edit</ButtonLink>
                  <ButtonLink to={`/learn/${c.id}`} variant="secondary"><Eye className="h-4 w-4" aria-hidden />Preview</ButtonLink>
                  <Button variant={c.status === 'PUBLISHED' ? 'ghost' : 'primary'} loading={toggle.isPending && toggle.variables?.id === c.id} onClick={() => toggle.mutate(c)}>{c.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</Button>
                  <Button variant="ghost" aria-label={`Delete ${c.title}`} onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-danger" aria-hidden /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      <ConfirmDialog open={Boolean(toDelete)} danger title="Delete this course?" confirmLabel="Delete course" loading={remove.isPending}
        message={`"${toDelete?.title ?? ''}" and all of its sections and lessons will be permanently deleted. Courses with enrolled students can't be deleted; unpublish them instead.`}
        onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete)} />
    </>
  );
}
