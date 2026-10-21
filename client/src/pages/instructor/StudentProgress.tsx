import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader, Pager, QueryBoundary } from '../../components/dashboard';
import { Avatar, Badge, EmptyState, Skeleton } from '../../components/ui';
import { ProgressBar } from '../../components/visual';
import { get } from '../../services/api';
import type { Paged, StudentProgressRow } from '../../types';
import { timeAgo } from '../../utils/format';

const PAGE_SIZE = 15;

export default function StudentProgress() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['instructor-students', page], queryFn: () => get<Paged<StudentProgressRow>>('/dashboard/instructor/students', { page, pageSize: PAGE_SIZE }), placeholderData: (p) => p });
  return (
    <>
      <PageHeader title="Student progress" subtitle="Everyone enrolled in your courses, with lesson-level completion." />
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} skeleton={<Skeleton className="h-64" />}>
        {q.data && q.data.data.length === 0 ? <EmptyState title="No students yet" message="When learners enroll in your published courses they'll appear here." /> : (
          <>
            <div className="surface overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Student progress by course</caption>
                <thead className="border-b border-[var(--border)] text-subtle"><tr><th scope="col" className="p-4 font-semibold">Student</th><th scope="col" className="p-4 font-semibold">Course</th><th scope="col" className="w-56 p-4 font-semibold">Progress</th><th scope="col" className="p-4 font-semibold">Last active</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {q.data?.data.map((r) => (
                    <tr key={r.enrollmentId}>
                      <td className="p-4"><span className="flex items-center gap-3"><Avatar name={r.student.name} src={r.student.avatarUrl} /><span><span className="block font-semibold">{r.student.name}</span><span className="text-xs text-subtle">{r.student.email}</span></span></span></td>
                      <td className="p-4">{r.course.title}</td>
                      <td className="p-4"><div className="flex items-center gap-3"><ProgressBar percent={r.progress.percent} /><span className="w-10 text-right font-semibold">{r.progress.percent}%</span></div><span className="text-xs text-subtle">{r.progress.completedLessons}/{r.progress.totalLessons} lessons</span></td>
                      <td className="p-4">{r.progress.completed ? <Badge tone="green">Completed</Badge> : timeAgo(r.lastAccessedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={q.data?.meta.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
