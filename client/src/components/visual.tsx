import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { BookOpen, Briefcase, Cloud, Code2, Palette, Sparkles, BarChart3, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/format';

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 font-extrabold tracking-tight', className)} aria-label="AUREVIA home">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet shadow-glow">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden><path d="M9 23 16 8l7 15h-4l-3-6.5L13 23z" fill="#E8C77B" /></svg>
      </span>
      <span className={cn('text-lg', light ? 'text-white' : 'text-[var(--text)]')}>AUREVIA</span>
    </Link>
  );
}

const ICONS: Record<string, LucideIcon> = { code: Code2, 'bar-chart': BarChart3, palette: Palette, briefcase: Briefcase, sparkles: Sparkles, cloud: Cloud };
export const categoryIcon = (icon?: string | null): LucideIcon => (icon ? ICONS[icon] : undefined) ?? BookOpen;

const GRADIENTS = [
  'from-[#7657FF] to-[#3B2A9B]', 'from-[#11112B] to-[#7657FF]', 'from-[#E8C77B] to-[#7657FF]', 'from-[#191938] to-[#25A56A]', 'from-[#7657FF] to-[#E05260]', 'from-[#3B2A9B] to-[#E8C77B]',
];
/** Course thumbnail: uses the configured image, otherwise a branded gradient (no fake stock photos). */
export function Thumbnail({ src, title, icon, className }: { src?: string | null; title: string; icon?: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className={cn('h-full w-full object-cover', className)} />;
  const Icon = categoryIcon(icon);
  const g = GRADIENTS[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length]!;
  return (
    <div className={cn('relative flex h-full w-full items-center justify-center bg-gradient-to-br', g, className)} aria-hidden>
      <Icon className="h-10 w-10 text-white/90" />
      <span className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );
}

export function ProgressRing({ percent, size = 72, stroke = 7, label }: { percent: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const reduce = useReducedMotion();
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${percent}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#7657FF" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - percent / 100) : c }} animate={{ strokeDashoffset: c * (1 - percent / 100) }} transition={{ duration: reduce ? 0 : 0.9, ease: 'easeOut' }} />
      </svg>
      <span className="absolute text-sm font-bold">{percent}%</span>
    </div>
  );
}

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-[var(--border)]', className)} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full bg-violet" initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.6 }} />
    </div>
  );
}

export function CountUp({ to, suffix = '', className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) { if (reduce) setV(to); return; }
    const controls = animate(0, to, { duration: 1.2, ease: 'easeOut', onUpdate: (n) => setV(Math.round(n)) });
    return () => controls.stop();
  }, [inView, to, reduce]);
  return <span ref={ref} className={className}>{v.toLocaleString()}{suffix}</span>;
}

/** Scroll-triggered reveal; disabled for reduced-motion users. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay }}>
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>{children}</motion.div>;
}
