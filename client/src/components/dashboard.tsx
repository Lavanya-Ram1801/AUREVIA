import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../utils/format';
import { Button, ErrorState } from './ui';
import { CountUp } from './visual';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-subtle">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, suffix, tone = 'violet' }: { icon: LucideIcon; label: string; value: number; suffix?: string; tone?: 'violet' | 'gold' | 'green' }) {
  const reduce = useReducedMotion();
  const tones = { violet: 'bg-violet/10 text-violet', gold: 'bg-gold/25 text-[#8a6a1a] dark:text-gold', green: 'bg-success/15 text-success' };
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="surface flex items-center gap-4 p-5">
      <span className={cn('rounded-xl p-3', tones[tone])}><Icon className="h-6 w-6" aria-hidden /></span>
      <div><p className="text-sm text-subtle">{label}</p><p className="text-2xl font-extrabold"><CountUp to={value} suffix={suffix} /></p></div>
    </motion.div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('surface p-5', className)}>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-sm" aria-current="page">Page {page} of {pages}</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}

/** Shared chart colours: brand violet and champagne gold, readable on both themes. */
export const CHART = { violet: '#7657FF', gold: '#E8C77B', grid: 'var(--border)', axis: 'var(--muted)' };

export const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function QueryBoundary({ loading, error, onRetry, skeleton, children }: { loading: boolean; error?: unknown; onRetry?: () => void; skeleton: ReactNode; children: ReactNode }) {
  if (loading) return <>{skeleton}</>;
  if (error) return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={onRetry} />;
  return <>{children}</>;
}
