import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Clock, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CourseCardData } from '../types';
import { cn, formatDuration, formatPrice, LEVEL_LABEL } from '../utils/format';
import { Badge, Stars } from './ui';
import { Thumbnail } from './visual';

export function CourseCard({ course, view = 'grid', index = 0, onToggleWishlist, wished }: {
  course: CourseCardData; view?: 'grid' | 'list'; index?: number; onToggleWishlist?: () => void; wished?: boolean;
}) {
  const reduce = useReducedMotion();
  const list = view === 'list';
  return (
    <motion.article initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.35 }}
      whileHover={reduce ? undefined : { y: -4 }} className={cn('surface group relative overflow-hidden', list ? 'flex flex-col sm:flex-row' : 'flex flex-col')}>
      <div className={cn('relative shrink-0 overflow-hidden', list ? 'h-44 sm:h-auto sm:w-64' : 'h-44')}>
        <Thumbnail src={course.thumbnailUrl} title={course.title} icon={null} className="transition-transform duration-500 group-hover:scale-105" />
        {course.isDemo && <span className="absolute left-3 top-3 rounded-full bg-midnight/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">Demo course</span>}
        {onToggleWishlist && (
          <button onClick={onToggleWishlist} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-midnight shadow hover:bg-white">
            <Heart className={cn('h-4 w-4', wished && 'fill-danger text-danger')} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge>{course.category.name}</Badge>
          <Badge tone="gray">{LEVEL_LABEL[course.level]}</Badge>
          {course.isEnrolled && <Badge tone="green">Enrolled</Badge>}
        </div>
        <h3 className="text-lg font-bold leading-snug">
          <Link to={`/courses/${course.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-violet focus-visible:outline-none">{course.title}</Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-subtle">{course.shortDescription}</p>
        <p className="mt-2 text-sm text-subtle">by {course.instructor.name}</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {course.reviewCount > 0 ? (<><span className="font-bold">{course.rating.toFixed(1)}</span><Stars value={course.rating} /><span className="text-subtle">({course.reviewCount})</span></>) : <span className="text-subtle">No reviews yet</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4 text-sm text-subtle">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" aria-hidden />{course.lessonCount} lessons</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{formatDuration(course.durationMinutes)}</span>
          </span>
          <span className={cn('text-base font-extrabold', course.isFree ? 'text-success' : 'text-[var(--text)]')}>{formatPrice(course.priceCents, course.currency)}</span>
        </div>
      </div>
    </motion.article>
  );
}

export function CourseCardSkeleton({ view = 'grid' }: { view?: 'grid' | 'list' }) {
  return (
    <div className={cn('surface overflow-hidden', view === 'list' && 'sm:flex')} aria-hidden>
      <div className={cn('skeleton h-44 rounded-none', view === 'list' && 'sm:w-64')} />
      <div className="flex-1 space-y-3 p-5"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-5 w-4/5" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-2/3" /></div>
    </div>
  );
}
