import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ChevronDown, Eye, EyeOff, Inbox, Loader2, Star, X } from 'lucide-react';
import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../utils/format';

/* ---------- Buttons ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
const variants: Record<Variant, string> = {
  primary: 'bg-violet text-white shadow-glow hover:bg-violet-600',
  secondary: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-violet/5',
  ghost: 'text-[var(--text)] hover:bg-violet/10',
  danger: 'bg-danger text-white hover:opacity-90',
  gold: 'bg-gold text-midnight hover:brightness-95',
};
const base = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function Button({ variant = 'primary', loading, children, className, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className={cn(base, variants[variant], className)} disabled={disabled || loading} {...(rest as object)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
}

export function ButtonLink({ variant = 'primary', className, ...rest }: LinkProps & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], 'hover:-translate-y-0.5 active:scale-[0.98]', className)} {...rest} />;
}

/* ---------- Form fields ---------- */
interface FieldProps { label: string; error?: string; hint?: string }

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input({ label, error, hint, className, type, ...rest }, ref) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <div className="relative">
        <input ref={ref} id={id} type={isPw && show ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={cn('min-h-[44px] w-full rounded-xl border bg-[var(--surface)] px-4 py-2.5 text-sm placeholder:text-muted/70', error ? 'border-danger' : 'border-[var(--border)]', isPw && 'pr-12', className)} {...rest} />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-subtle hover:bg-violet/10">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-subtle">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea({ label, error, hint, className, ...rest }, ref) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <textarea ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined}
        className={cn('w-full rounded-xl border bg-[var(--surface)] px-4 py-3 text-sm', error ? 'border-danger' : 'border-[var(--border)]', className)} {...rest} />
      {hint && !error && <p className="mt-1 text-xs text-subtle">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select({ label, error, className, children, ...rest }, ref) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <select ref={ref} id={id} aria-invalid={Boolean(error)} className={cn('min-h-[44px] w-full rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-sm', error ? 'border-danger' : 'border-[var(--border)]', className)} {...rest}>{children}</select>
      {error && <p role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
});

/* ---------- Display ---------- */
export function Badge({ children, tone = 'violet', className }: { children: ReactNode; tone?: 'violet' | 'gold' | 'green' | 'red' | 'gray'; className?: string }) {
  const tones = { violet: 'bg-violet/10 text-violet-600 dark:text-lavender', gold: 'bg-gold/25 text-[#8a6a1a] dark:text-gold', green: 'bg-success/15 text-success', red: 'bg-danger/15 text-danger', gray: 'bg-[var(--border)] text-subtle' };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-2 p-8 text-subtle"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /><span>{label}…</span></div>;
}

export function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn(size, i <= Math.round(value) ? 'fill-gold text-gold' : 'text-[var(--border)]')} aria-hidden />)}
    </span>
  );
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  if (src && !broken) return <img src={src} alt="" width={size} height={size} onError={() => setBroken(true)} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return <span aria-hidden className="inline-flex items-center justify-center rounded-full bg-violet font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

/* ---------- States ---------- */
export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-violet/10 p-4 text-violet"><Inbox className="h-7 w-7" aria-hidden /></div>
      <h3 className="text-lg font-bold">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-subtle">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-danger/30 bg-danger/5 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-danger" aria-hidden />
      <h3 className="text-lg font-bold">We couldn't load this</h3>
      <p className="mt-1 max-w-md text-sm text-subtle">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/* ---------- Overlays ---------- */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
            initial={reduce ? false : { opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
            className="surface relative w-full max-w-md p-6 focus:outline-none">
            <button onClick={onClose} aria-label="Close dialog" className="absolute right-3 top-3 rounded-lg p-2 text-subtle hover:bg-violet/10"><X className="h-4 w-4" /></button>
            <h2 className="mb-3 pr-8 text-lg font-bold">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-subtle">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();
  return (
    <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      {items.map((it, i) => (
        <div key={it.q}>
          <h3>
            <button id={`${uid}-h${i}`} aria-expanded={open === i} aria-controls={`${uid}-p${i}`} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold">
              {it.q}
              <motion.span animate={{ rotate: open === i ? 180 : 0 }}><ChevronDown className="h-5 w-5 shrink-0" aria-hidden /></motion.span>
            </button>
          </h3>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div id={`${uid}-p${i}`} role="region" aria-labelledby={`${uid}-h${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-6 text-subtle">{it.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
