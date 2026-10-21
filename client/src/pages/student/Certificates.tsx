import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, ShieldCheck } from 'lucide-react';
import { PageHeader, QueryBoundary } from '../../components/dashboard';
import { useToast } from '../../components/Toast';
import { Button, ButtonLink, EmptyState, Skeleton } from '../../components/ui';
import { get, post } from '../../services/api';
import { useMyEnrollments } from '../../services/queries';
import type { Certificate } from '../../types';
import { formatDate } from '../../utils/format';

export default function Certificates() {
  const toast = useToast();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const certs = useQuery({ queryKey: ['certificates'], queryFn: () => get<Certificate[]>('/certificates/me') });
  const enrollments = useMyEnrollments();
  // Courses whose lessons are all complete but whose certificate has not been generated yet.
  const eligible = (enrollments.data ?? []).filter((e) => e.progress.completed && !e.certificateId);

  const generate = useMutation({
    mutationFn: (courseId: string) => post<Certificate>(`/courses/${courseId}/certificate`),
    onSuccess: () => {
      toast.success('Certificate issued!');
      void qc.invalidateQueries({ queryKey: ['certificates'] }); void qc.invalidateQueries({ queryKey: ['enrollments'] }); void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not generate certificate'),
  });

  return (
    <>
      <PageHeader title="Certificates" subtitle="Awarded when every published lesson in a course is complete. The server checks your saved progress." />
      <QueryBoundary loading={certs.isLoading} error={certs.error} onRetry={() => void certs.refetch()} skeleton={<Skeleton className="h-48" />}>
        {eligible.length > 0 && (
          <section className="mb-8" aria-label="Ready to claim">
            <h2 className="mb-3 text-lg font-bold">Ready to claim</h2>
            <ul className="space-y-3">
              {eligible.map((e) => (
                <li key={e.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
                  <span><span className="font-semibold">{e.course.title}</span><span className="block text-sm text-subtle">All {e.progress.totalLessons} lessons complete</span></span>
                  <Button variant="gold" loading={generate.isPending && generate.variables === e.courseId} onClick={() => generate.mutate(e.courseId)}><Award className="h-4 w-4" aria-hidden />Generate certificate</Button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {certs.data && certs.data.length === 0 ? (
          <EmptyState title="No certificates yet" message="Finish all the lessons in a course to earn your first certificate." action={<ButtonLink to="/dashboard/learning">Go to My Learning</ButtonLink>} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {certs.data?.map((c, i) => (
              <motion.article key={c.id} initial={reduce ? false : { opacity: 0, scale: 0.94, rotate: -1 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 160, damping: 18 }}
                className="relative overflow-hidden rounded-2xl border-2 border-gold bg-midnight p-6 text-white shadow-card">
                <Award className="absolute -right-4 -top-4 h-28 w-28 text-gold/15" aria-hidden />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Certificate of completion</p>
                <h2 className="mt-3 text-xl font-extrabold">{c.courseTitle}</h2>
                <p className="mt-1 text-sm text-white/70">Issued {formatDate(c.issuedAt)} · ID <span className="font-mono">{c.certificateId}</span></p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink to={`/certificates/${c.certificateId}`} variant="gold">View & print</ButtonLink>
                  <ButtonLink to={`/verify/${c.certificateId}`} variant="secondary" className="!border-white/20 !bg-white/10 !text-white"><ShieldCheck className="h-4 w-4" aria-hidden />Verify</ButtonLink>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
