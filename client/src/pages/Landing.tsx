import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, BarChart3, BookOpen, CheckCircle2, Compass, GraduationCap, PlayCircle, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { CourseCard, CourseCardSkeleton } from '../components/CourseCard';
import { useToast } from '../components/Toast';
import { Accordion, Avatar, Badge, Button, ButtonLink, EmptyState, ErrorState, Input } from '../components/ui';
import { categoryIcon, CountUp, Reveal } from '../components/visual';
import { ApiError, post } from '../services/api';
import { useCategories, useCourses } from '../services/queries';

const FAQ = [
  { q: 'Is AUREVIA free to use?', a: 'Many courses are free to enroll in. Paid courses show their price, but checkout is only available once a payment provider is configured by the platform owner.' },
  { q: 'Do I get a certificate?', a: 'Yes. When you complete every published lesson in a course, you can generate a certificate with a unique ID that anyone can verify on the verification page.' },
  { q: 'Can I learn at my own pace?', a: 'Absolutely. Your progress is saved on every lesson, and you can resume exactly where you left off on any device.' },
  { q: 'Can I teach on AUREVIA?', a: 'Yes. Sign up as an instructor, build your curriculum with sections and lessons, and publish when you are ready.' },
  { q: 'Is the content on this page real?', a: 'Statistics, testimonials and demo courses on this page are clearly labelled sample content for demonstration purposes.' },
];

const TESTIMONIALS = [
  { name: 'Sample Learner A', role: 'Aspiring developer', text: 'The lesson player remembers where I stopped, so short study sessions actually add up.' },
  { name: 'Sample Learner B', role: 'Career switcher', text: 'Clear structure and honest progress tracking kept me motivated through a tough month.' },
  { name: 'Sample Learner C', role: 'Product designer', text: 'I liked that every course ends with something I could show: a certificate I can verify.' },
];

const newsletterSchema = z.object({ email: z.string().trim().email('Enter a valid email address') });

function Newsletter() {
  const toast = useToast();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<z.infer<typeof newsletterSchema>>({ resolver: zodResolver(newsletterSchema) });
  const m = useMutation({
    mutationFn: (v: { email: string }) => post<{ data: { message: string } }>('/newsletter', v),
    onSuccess: () => { toast.success('Thanks for subscribing!'); reset(); },
    onError: (e) => (e instanceof ApiError && e.fields?.email ? setError('email', { message: e.fields.email }) : toast.error(e instanceof Error ? e.message : 'Could not subscribe')),
  });
  return (
    <form onSubmit={handleSubmit((v) => m.mutate(v))} noValidate className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1"><Input label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} /></div>
      <Button type="submit" loading={m.isPending} className="sm:mt-[26px]">Subscribe</Button>
    </form>
  );
}

export default function Landing() {
  const reduce = useReducedMotion();
  const featured = useCourses({ sort: 'popular', pageSize: 3 });
  const cats = useCategories();
  const instructors = [...new Map((featured.data?.data ?? []).map((c) => [c.instructor.id, c.instructor])).values()];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-midnight pb-24 pt-32 text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-violet/40 blur-[120px]" />
          <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-gold/20 blur-[120px]" />
        </div>
        <div className="container-page relative grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge tone="gold" className="mb-5"><Sparkles className="mr-1 h-3 w-3" aria-hidden />Learn. Evolve. Excel.</Badge>
            <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">Your Next Chapter Starts with Learning.</h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">AUREVIA gives you structured courses, honest progress tracking and verifiable certificates, so you can build valuable skills at your own pace and reach the goals that matter to you.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/courses" variant="gold">Explore Courses</ButtonLink>
              <ButtonLink to="/register" variant="secondary" className="border-white/25 bg-white/10 text-white hover:bg-white/20">Start Learning</ButtonLink>
            </div>
          </motion.div>
          <HeroVisual />
        </div>
      </section>

      {/* Stats */}
      <section className="container-page -mt-10 relative z-10" aria-label="Platform statistics (demo figures)">
        <Reveal>
          <div className="surface grid grid-cols-2 gap-6 p-6 sm:grid-cols-4 sm:p-8">
            {[[12, '+', 'Courses'], [3400, '+', 'Learners'], [18000, '+', 'Learning hours'], [4, '', 'Categories']].map(([n, s, l]) => (
              <div key={l as string} className="text-center"><p className="text-3xl font-extrabold text-violet"><CountUp to={n as number} suffix={s as string} /></p><p className="text-sm text-subtle">{l as string}</p></div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-subtle">Demo figures for illustration. They are not real platform statistics.</p>
        </Reveal>
      </section>

      {/* Featured */}
      <section className="container-page py-20" aria-labelledby="featured-h">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div><h2 id="featured-h" className="text-3xl font-extrabold">Featured courses</h2><p className="mt-2 text-subtle">Popular picks from the catalog.</p></div>
          <Link to="/courses" className="font-semibold text-violet hover:underline">View all courses →</Link>
        </Reveal>
        {featured.isError ? <ErrorState message="Featured courses could not be loaded." onRetry={() => void featured.refetch()} /> : featured.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CourseCardSkeleton key={i} />)}</div>
        ) : featured.data && featured.data.data.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{featured.data.data.map((c, i) => <CourseCard key={c.id} course={c} index={i} />)}</div>
        ) : <EmptyState title="No courses yet" message="Published courses will appear here." action={<ButtonLink to="/register">Become an instructor</ButtonLink>} />}
      </section>

      {/* Categories */}
      <section className="bg-lavender/60 py-20 dark:bg-white/[0.03]" aria-labelledby="cat-h">
        <div className="container-page">
          <Reveal className="mb-10 text-center"><h2 id="cat-h" className="text-3xl font-extrabold">Browse by category</h2></Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {(cats.data ?? []).map((c, i) => {
              const Icon = categoryIcon(c.icon);
              return (
                <Reveal key={c.id} delay={i * 0.04}>
                  <Link to={`/courses?category=${c.slug}`} className="surface flex items-center gap-4 p-5 transition-transform hover:-translate-y-1">
                    <span className="rounded-xl bg-violet/10 p-3 text-violet"><Icon className="h-6 w-6" aria-hidden /></span>
                    <span><span className="block font-bold">{c.name}</span><span className="text-sm text-subtle">{c.courseCount ?? 0} courses</span></span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
          {cats.isError && <ErrorState message="Categories could not be loaded." onRetry={() => void cats.refetch()} />}
        </div>
      </section>

      {/* Why */}
      <section id="features" className="container-page scroll-mt-20 py-20" aria-labelledby="why-h">
        <Reveal className="mb-12 text-center"><h2 id="why-h" className="text-3xl font-extrabold">Why Learn with AUREVIA?</h2><p className="mx-auto mt-2 max-w-xl text-subtle">Everything you need to learn consistently and prove what you know.</p></Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            [BookOpen, 'Structured curriculum', 'Courses are organised into sections and bite-sized lessons you can finish in one sitting.'],
            [BarChart3, 'Honest progress', 'Progress is calculated from the lessons you actually complete, and it is saved automatically.'],
            [Award, 'Verifiable certificates', 'Finish a course and generate a certificate with a unique ID anyone can check.'],
            [Target, 'Goals and reminders', 'Set a weekly learning goal and see how your week is going at a glance.'],
            [ShieldCheck, 'Private and secure', 'Passwords are hashed, sessions are protected, and your content stays yours.'],
            [Compass, 'Pick up anywhere', 'Resume from your last lesson, add private notes and bookmark what matters.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof BookOpen;
            return <Reveal key={t as string} delay={i * 0.05}><div className="surface h-full p-6"><span className="mb-4 inline-flex rounded-xl bg-violet/10 p-3 text-violet"><I className="h-6 w-6" aria-hidden /></span><h3 className="text-lg font-bold">{t as string}</h3><p className="mt-2 text-sm leading-6 text-subtle">{d as string}</p></div></Reveal>;
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="about" className="scroll-mt-20 bg-midnight py-20 text-white" aria-labelledby="how-h">
        <div className="container-page">
          <Reveal className="mb-12 text-center"><h2 id="how-h" className="text-3xl font-extrabold">How it works</h2></Reveal>
          <ol className="grid gap-6 md:grid-cols-3">
            {[[GraduationCap, 'Choose a course', 'Search the catalog and filter by category and level.'], [PlayCircle, 'Learn at your pace', 'Work through lessons, take notes and mark them complete.'], [Award, 'Earn your certificate', 'Complete every lesson to unlock a verifiable certificate.']].map(([Icon, t, d], i) => {
              const I = Icon as typeof BookOpen;
              return <Reveal key={t as string} delay={i * 0.1}><li className="glass h-full rounded-2xl p-6"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gold font-extrabold text-midnight">{i + 1}</span><I className="mb-3 h-6 w-6 text-gold" aria-hidden /><h3 className="text-lg font-bold">{t as string}</h3><p className="mt-1 text-sm text-white/70">{d as string}</p></li></Reveal>;
            })}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-page py-20" aria-labelledby="t-h">
        <Reveal className="mb-10 text-center"><h2 id="t-h" className="text-3xl font-extrabold">What learners say</h2><Badge tone="gray" className="mt-3">Sample testimonials for demonstration, not real customers</Badge></Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}><figure className="surface h-full p-6"><blockquote className="text-sm leading-6">“{t.text}”</blockquote><figcaption className="mt-4 flex items-center gap-3"><Avatar name={t.name} /><span><span className="block text-sm font-bold">{t.name}</span><span className="text-xs text-subtle">{t.role}</span></span></figcaption></figure></Reveal>
          ))}
        </div>
      </section>

      {/* Instructors */}
      <section className="bg-lavender/60 py-20 dark:bg-white/[0.03]" aria-labelledby="inst-h">
        <div className="container-page">
          <Reveal className="mb-10 text-center"><h2 id="inst-h" className="text-3xl font-extrabold">Meet our instructors</h2></Reveal>
          {instructors.length === 0 ? <p className="text-center text-subtle">Instructors with published courses will appear here.</p> : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {instructors.map((i) => (
                <Reveal key={i.id}><div className="surface flex items-center gap-4 p-5"><Avatar name={i.name} src={i.avatarUrl} size={56} /><div><p className="font-bold">{i.name}</p><p className="text-sm text-subtle">{i.bio ?? 'AUREVIA instructor'}</p></div></div></Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container-page max-w-3xl scroll-mt-20 py-20" aria-labelledby="faq-h">
        <Reveal><h2 id="faq-h" className="mb-8 text-center text-3xl font-extrabold">Frequently asked questions</h2><Accordion items={FAQ} /></Reveal>
      </section>

      {/* Newsletter */}
      <section className="container-page pb-20" aria-labelledby="nl-h">
        <Reveal>
          <div className="surface p-8 text-center sm:p-12">
            <h2 id="nl-h" className="text-2xl font-extrabold">Get learning tips in your inbox</h2>
            <p className="mb-6 mt-2 text-subtle">One short email now and then. Unsubscribe any time.</p>
            <Newsletter />
          </div>
        </Reveal>
      </section>
    </>
  );
}

function HeroVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto hidden h-[420px] w-full max-w-md lg:block" aria-hidden>
      <div className="glass absolute inset-x-6 top-8 rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-violet p-2"><BookOpen className="h-5 w-5" /></span><div><p className="text-sm font-bold">Modern JavaScript</p><p className="text-xs text-white/60">Lesson 4 of 6</p></div></div>
        <div className="h-2 rounded-full bg-white/15"><div className="h-2 w-2/3 rounded-full bg-gold" /></div>
        <p className="mt-2 text-xs text-white/60">Illustration of the learning player</p>
      </div>
      <motion.div animate={reduce ? undefined : { y: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }} className="glass absolute -left-2 bottom-12 flex items-center gap-3 rounded-2xl p-4"><CheckCircle2 className="h-6 w-6 text-success" /><span className="text-sm font-semibold">Lesson complete</span></motion.div>
      <motion.div animate={reduce ? undefined : { y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }} className="glass absolute -right-2 bottom-2 flex items-center gap-3 rounded-2xl p-4"><Award className="h-6 w-6 text-gold" /><span className="text-sm font-semibold">Certificate ready</span></motion.div>
    </div>
  );
}
