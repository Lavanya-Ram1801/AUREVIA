import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, BookOpen, CheckCircle2, Clock, Heart, PartyPopper, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { CourseCard } from '../components/CourseCard';
import { useToast } from '../components/Toast';
import { Avatar, Badge, Button, ButtonLink, ErrorState, Skeleton, Stars, Textarea } from '../components/ui';
import { Thumbnail } from '../components/visual';
import { useAuth } from '../hooks/useAuth';
import { ApiError, del, get, post } from '../services/api';
import { useCourse, useWishlistToggle } from '../services/queries';
import type { Paged, Review } from '../types';
import { formatDate, formatDuration, formatPrice, LEVEL_LABEL } from '../utils/format';

const reviewSchema = z.object({ rating: z.coerce.number().int().min(1, 'Choose a rating').max(5), comment: z.string().trim().max(2000).optional() });

function ReviewForm({ courseId, existing }: { courseId: string; existing: { rating: number; comment: string | null } | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<z.infer<typeof reviewSchema>>({ resolver: zodResolver(reviewSchema), defaultValues: { rating: existing?.rating ?? 0, comment: existing?.comment ?? '' } });
  const rating = Number(watch('rating'));
  const save = useMutation({
    mutationFn: (v: z.infer<typeof reviewSchema>) => post(`/courses/${courseId}/reviews`, { rating: v.rating, comment: v.comment || null }),
    onSuccess: () => { toast.success(existing ? 'Review updated' : 'Thanks for your review!'); void qc.invalidateQueries({ queryKey: ['course'] }); void qc.invalidateQueries({ queryKey: ['reviews', courseId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save review'),
  });
  const remove = useMutation({
    mutationFn: () => del(`/courses/${courseId}/reviews`),
    onSuccess: () => { toast.success('Review deleted'); setValue('rating', 0); setValue('comment', ''); void qc.invalidateQueries({ queryKey: ['course'] }); void qc.invalidateQueries({ queryKey: ['reviews', courseId] }); },
  });
  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate className="surface space-y-3 p-5">
      <h3 className="font-bold">{existing ? 'Edit your review' : 'Rate this course'}</h3>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setValue('rating', n, { shouldValidate: true })} className="rounded p-1">
            <Stars value={n <= rating ? 5 : 0} size="h-6 w-6" />
          </button>
        ))}
      </div>
      {errors.rating && <p role="alert" className="text-xs text-danger">{errors.rating.message}</p>}
      <Textarea label="Your review (optional)" rows={3} error={errors.comment?.message} {...register('comment')} />
      <div className="flex gap-2"><Button type="submit" loading={save.isPending}>{existing ? 'Update review' : 'Submit review'}</Button>{existing && <Button type="button" variant="ghost" onClick={() => remove.mutate()} loading={remove.isPending}>Delete</Button>}</div>
    </form>
  );
}

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useCourse(slug);
  const wish = useWishlistToggle();
  const [celebrate, setCelebrate] = useState(false);
  const course = q.data;
  const reviews = useQuery({ queryKey: ['reviews', course?.id], queryFn: () => get<Paged<Review>>(`/courses/${course!.id}/reviews`, { pageSize: 10 }), enabled: Boolean(course?.id) });

  const enroll = useMutation({
    mutationFn: () => post(`/courses/${course!.id}/enroll`),
    onSuccess: () => {
      setCelebrate(true);
      toast.success("You're enrolled!");
      void qc.invalidateQueries({ queryKey: ['course'] }); void qc.invalidateQueries({ queryKey: ['enrollments'] }); void qc.invalidateQueries({ queryKey: ['notifications'] });
      window.setTimeout(() => navigate(`/learn/${course!.id}`), 1400);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) { void qc.invalidateQueries({ queryKey: ['course'] }); toast.error('You are already enrolled in this course.'); }
      else toast.error(e instanceof Error ? e.message : 'Could not enroll');
    },
  });

  if (q.isLoading) return <div className="container-page space-y-4 py-10"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64 w-full" /></div>;
  if (q.isError || !course) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return <div className="container-page py-16"><ErrorState message={notFound ? 'This course does not exist or is not available.' : (q.error as Error | null)?.message} onRetry={notFound ? undefined : () => void q.refetch()} /></div>;
  }

  const paid = course.priceCents > 0;
  const total = course.sections.reduce((n, s) => n + s.lessons.length, 0);
  const onEnroll = () => (user ? enroll.mutate() : navigate('/login', { state: { from: `/courses/${course.slug}` } }));

  return (
    <>
      <section className="bg-midnight text-white">
        <div className="container-page grid gap-8 py-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap gap-2"><Badge tone="gold">{course.category.name}</Badge><Badge tone="gray">{LEVEL_LABEL[course.level]}</Badge>{course.isDemo && <Badge tone="gray">Demo course</Badge>}{course.status !== 'PUBLISHED' && <Badge tone="red">{course.status.toLowerCase()} (only you can see this)</Badge>}</div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{course.title}</h1>
            <p className="mt-3 max-w-2xl text-white/75">{course.shortDescription}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {course.reviewCount > 0 ? <span className="flex items-center gap-2"><strong>{course.rating.toFixed(1)}</strong><Stars value={course.rating} /><span className="text-white/60">({course.reviewCount} reviews)</span></span> : <span className="text-white/60">No reviews yet</span>}
              <span className="text-white/60">{course.enrollmentCount} learners</span>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm"><Avatar name={course.instructor.name} src={course.instructor.avatarUrl} size={28} />Created by <strong>{course.instructor.name}</strong></p>
          </div>
          <aside className="surface -mb-24 overflow-hidden text-[var(--text)] lg:mb-0 lg:translate-y-8">
            <div className="h-44"><Thumbnail src={course.thumbnailUrl} title={course.title} /></div>
            <div className="space-y-4 p-5">
              <p className="text-3xl font-extrabold">{formatPrice(course.priceCents, course.currency)}</p>
              {course.canManage ? <ButtonLink to={`/learn/${course.id}`} className="w-full"><PlayCircle className="h-4 w-4" aria-hidden />Preview course</ButtonLink>
                : course.enrollmentId ? <ButtonLink to={`/learn/${course.id}`} className="w-full"><PlayCircle className="h-4 w-4" aria-hidden />Continue learning</ButtonLink>
                : paid ? (<><Button className="w-full" disabled>Checkout unavailable</Button><p className="text-xs text-subtle">This is a paid course. Payments are not configured on this deployment, so enrollment is disabled.</p></>)
                : <Button className="w-full" loading={enroll.isPending} onClick={onEnroll}>{user ? 'Enroll for free' : 'Sign in to enroll'}</Button>}
              {!course.canManage && user && (
                <Button variant="secondary" className="w-full" aria-pressed={course.isWishlisted} onClick={() => wish.mutate({ id: course.id, wished: course.isWishlisted }, { onSuccess: () => toast.success(course.isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist') })}>
                  <Heart className={`h-4 w-4 ${course.isWishlisted ? 'fill-danger text-danger' : ''}`} aria-hidden />{course.isWishlisted ? 'Saved' : 'Save for later'}
                </Button>
              )}
              <ul className="space-y-2 text-sm text-subtle">
                <li className="flex items-center gap-2"><BookOpen className="h-4 w-4" aria-hidden />{total} lessons</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden />{formatDuration(course.durationMinutes)} total</li>
                <li className="flex items-center gap-2"><Award className="h-4 w-4" aria-hidden />Certificate of completion</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <div className="container-page grid gap-10 py-16 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section aria-labelledby="about-h"><h2 id="about-h" className="mb-3 text-xl font-bold">About this course</h2><p className="whitespace-pre-line leading-7 text-subtle">{course.description}</p></section>
          {course.outcomes.length > 0 && <section aria-labelledby="out-h"><h2 id="out-h" className="mb-3 text-xl font-bold">What you'll learn</h2><ul className="grid gap-2 sm:grid-cols-2">{course.outcomes.map((o) => <li key={o} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{o}</li>)}</ul></section>}
          {course.prerequisites.length > 0 && <section aria-labelledby="pre-h"><h2 id="pre-h" className="mb-3 text-xl font-bold">Prerequisites</h2><ul className="list-disc space-y-1 pl-5 text-sm text-subtle">{course.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul></section>}
          <section aria-labelledby="cur-h">
            <h2 id="cur-h" className="mb-3 text-xl font-bold">Curriculum</h2>
            {course.sections.length === 0 ? <p className="text-sm text-subtle">The curriculum has not been published yet.</p> : (
              <div className="space-y-3">{course.sections.map((s) => (
                <details key={s.id} open className="surface group">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">{s.title}<span className="text-xs font-normal text-subtle">{s.lessons.length} lessons</span></summary>
                  <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">{s.lessons.map((l) => <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-subtle" aria-hidden />{l.title}{!l.isPublished && <Badge tone="gray">draft</Badge>}</span><span className="text-subtle">{formatDuration(l.durationMinutes)}</span></li>)}</ul>
                </details>
              ))}</div>
            )}
          </section>
          <section aria-labelledby="rev-h" className="space-y-4">
            <h2 id="rev-h" className="text-xl font-bold">Reviews</h2>
            {course.enrollmentId && !course.canManage && <ReviewForm courseId={course.id} existing={course.myReview} />}
            {reviews.isLoading ? <Skeleton className="h-20" /> : reviews.data && reviews.data.data.length > 0 ? reviews.data.data.map((r) => (
              <article key={r.id} className="surface p-5"><div className="flex items-center gap-3"><Avatar name={r.user.name} src={r.user.avatarUrl} /><div><p className="text-sm font-bold">{r.user.name}</p><p className="text-xs text-subtle">{formatDate(r.createdAt)}</p></div><span className="ml-auto"><Stars value={r.rating} /></span></div>{r.comment && <p className="mt-3 text-sm leading-6">{r.comment}</p>}</article>
            )) : <p className="text-sm text-subtle">No reviews yet. Enrolled students can leave the first one.</p>}
          </section>
        </div>
        <div className="lg:pt-24" />
      </div>

      {course.related.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="rel-h"><h2 id="rel-h" className="mb-6 text-xl font-bold">Related courses</h2><div className="grid gap-6 md:grid-cols-3">{course.related.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}</div></section>
      )}

      <AnimatePresence>
        {celebrate && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-midnight/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="surface max-w-sm p-8 text-center">
              <PartyPopper className="mx-auto mb-3 h-12 w-12 text-gold" aria-hidden /><h2 className="text-xl font-extrabold">You're in!</h2><p className="mt-1 text-sm text-subtle">Taking you to your first lesson…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="sr-only"><Link to="/courses">Back to courses</Link></p>
    </>
  );
}
