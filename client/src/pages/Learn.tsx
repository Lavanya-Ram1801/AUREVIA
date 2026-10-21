import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, Download, Menu, StickyNote, Video, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Badge, Button, ErrorState, Skeleton, Spinner, Textarea } from '../components/ui';
import { Logo, ProgressBar } from '../components/visual';
import { ApiError, get, post } from '../services/api';
import type { PlayerData, PlayerLesson, ProgressSummary } from '../types';
import { cn, embedUrl, formatDuration } from '../utils/format';

/** Lightweight, safe renderer: paragraphs, bullet lists, fenced code and inline code. No raw HTML is ever injected. */
function LessonBody({ text }: { text: string }) {
  const blocks = text.split(/```/);
  return (
    <div className="prose-lesson">
      {blocks.map((b, i) => {
        if (i % 2 === 1) return <pre key={i}><code>{b.replace(/^\w*\n/, '')}</code></pre>;
        return b.split(/\n{2,}/).filter(Boolean).map((para, j) => {
          const lines = para.split('\n');
          if (lines.every((l) => l.trim().startsWith('- '))) return <ul key={`${i}-${j}`}>{lines.map((l) => <li key={l}>{inline(l.trim().slice(2))}</li>)}</ul>;
          return <p key={`${i}-${j}`}>{lines.map((l, k) => <span key={k}>{inline(l)}{k < lines.length - 1 && <br />}</span>)}</p>;
        });
      })}
    </div>
  );
}
function inline(s: string) {
  return s.split(/(`[^`]+`)/).map((p, i) => (p.startsWith('`') && p.endsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : <span key={i}>{p}</span>));
}

function VideoBlock({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const v = embedUrl(url);
  if (failed) return <div role="alert" className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-subtle"><div><Video className="mx-auto mb-2 h-8 w-8" aria-hidden />This video could not be loaded. Check the source URL or try again later.</div></div>;
  return v.kind === 'embed'
    ? <div className="aspect-video overflow-hidden rounded-2xl bg-black"><iframe src={v.src} title="Lesson video" className="h-full w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
    : <video src={v.src} controls preload="metadata" onError={() => setFailed(true)} className="aspect-video w-full rounded-2xl bg-black" />;
}

function Notes({ lesson, onSaved }: { lesson: PlayerLesson; onSaved: () => void }) {
  const [text, setText] = useState(lesson.note);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const first = useRef(true);
  useEffect(() => { setText(lesson.note); first.current = true; setState('idle'); }, [lesson.id, lesson.note]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState('saving');
    const t = window.setTimeout(async () => {
      try { await post(`/lessons/${lesson.id}/notes`, { content: text }); setState('saved'); onSaved(); } catch { setState('error'); }
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div>
      <Textarea label="My notes (private, saved automatically)" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} />
      <p className="mt-1 text-xs text-subtle" aria-live="polite">{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Could not save. Your text is still here, try editing again.' : ''}</p>
    </div>
  );
}

export default function Learn() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['learn', courseId], queryFn: () => get<PlayerData>(`/courses/${courseId}/learn`), retry: false, staleTime: 0 });
  const [activeId, setActiveId] = useState<string>();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState(false);
  const [cheer, setCheer] = useState(false);

  const flat = useMemo(() => q.data?.sections.flatMap((s) => s.lessons) ?? [], [q.data]);
  // Resume from the last accessed lesson, otherwise the first incomplete one.
  useEffect(() => {
    if (!q.data || activeId) return;
    const resume = flat.find((l) => l.id === q.data!.lastLessonId) ?? flat.find((l) => !l.completed) ?? flat[0];
    if (resume) setActiveId(resume.id);
  }, [q.data, flat, activeId]);

  const lesson = flat.find((l) => l.id === activeId);
  const idx = lesson ? flat.indexOf(lesson) : -1;
  const enrolled = Boolean(q.data?.enrollmentId);

  useEffect(() => { if (lesson && enrolled) void post(`/lessons/${lesson.id}/visit`).catch(() => undefined); }, [lesson?.id, enrolled]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => qc.invalidateQueries({ queryKey: ['learn', courseId] });
  const progress = useMutation({
    mutationFn: (p: { id: string; completed?: boolean; bookmarked?: boolean }) => post<{ summary: ProgressSummary }>(`/lessons/${p.id}/progress`, { completed: p.completed, bookmarked: p.bookmarked }),
    onSuccess: async (res, vars) => {
      await refresh();
      void qc.invalidateQueries({ queryKey: ['enrollments'] }); void qc.invalidateQueries({ queryKey: ['notifications'] });
      if (vars.completed) { setCheer(true); window.setTimeout(() => setCheer(false), 1200); if (res.summary.completed) toast.success('Course complete! Your certificate is ready.'); }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save progress'),
  });

  if (q.isLoading) return <Spinner label="Loading your course" />;
  if (q.isError || !q.data) {
    const e = q.error;
    const forbidden = e instanceof ApiError && (e.status === 403 || e.status === 404);
    return <div className="container-page py-16"><ErrorState message={forbidden ? 'You need to enroll in this course to access its lessons.' : (e as Error | null)?.message} onRetry={forbidden ? undefined : () => void q.refetch()} />{forbidden && <div className="mt-6 text-center"><Link className="font-semibold text-violet" to={`/courses`}>Browse courses</Link></div>}</div>;
  }
  const data = q.data;
  const summary = data.summary;

  const sidebar = (
    <nav aria-label="Course curriculum" className="space-y-2 p-3">
      {data.sections.map((s) => {
        const open = !collapsed.has(s.id);
        return (
          <div key={s.id}>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-violet/10" aria-expanded={open}
              onClick={() => setCollapsed((c) => { const n = new Set(c); if (open) n.add(s.id); else n.delete(s.id); return n; })}>
              {s.title}<motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown className="h-4 w-4" aria-hidden /></motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  {s.lessons.map((l) => (
                    <li key={l.id}><button onClick={() => { setActiveId(l.id); setDrawer(false); }} aria-current={l.id === activeId ? 'true' : undefined}
                      className={cn('flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm', l.id === activeId ? 'bg-violet/15 font-semibold' : 'hover:bg-violet/5')}>
                      {l.completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Completed" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-label="Not completed" />}
                      <span className="flex-1">{l.title}<span className="block text-xs font-normal text-subtle">{formatDuration(l.durationMinutes)}</span></span>
                      {l.bookmarked && <BookmarkCheck className="h-4 w-4 text-gold" aria-label="Bookmarked" />}
                    </button></li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <button className="rounded-xl p-2.5 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open curriculum"><Menu className="h-5 w-5" /></button>
        <Logo className="hidden sm:inline-flex" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{data.course.title}</p>{data.isPreview && <Badge tone="gold">Preview mode (progress is not tracked)</Badge>}</div>
        {summary && <div className="hidden w-48 items-center gap-2 sm:flex"><ProgressBar percent={summary.percent} /><span className="text-xs font-semibold">{summary.percent}%</span></div>}
        <Link to={data.isPreview ? `/instructor/courses/${data.course.id}` : '/dashboard/learning'} className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-violet/10">Exit</Link>
      </header>
      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-80 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] lg:block">{sidebar}</aside>
        <AnimatePresence>
          {drawer && (<>
            <motion.div className="fixed inset-0 z-40 bg-midnight/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'tween', duration: 0.2 }} className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-[var(--surface)] lg:hidden">
              <div className="flex items-center justify-between border-b border-[var(--border)] p-4"><span className="font-bold">Curriculum</span><button onClick={() => setDrawer(false)} aria-label="Close curriculum" className="rounded-lg p-2"><X className="h-5 w-5" /></button></div>
              {sidebar}
            </motion.aside></>)}
        </AnimatePresence>

        <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          {!lesson ? <p className="text-subtle">This course has no published lessons yet.</p> : (
            <motion.article key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{lesson.title}</h1>
              {lesson.videoUrl ? <VideoBlock url={lesson.videoUrl} /> : null}
              {lesson.content ? <LessonBody text={lesson.content} /> : !lesson.videoUrl && <p className="text-subtle">This lesson has no content yet.</p>}
              {lesson.resourceUrl && <a href={lesson.resourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold hover:bg-violet/10"><Download className="h-4 w-4" aria-hidden />{lesson.resourceName || 'Download resource'}</a>}

              {enrolled && (
                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
                  <Button variant={lesson.completed ? 'secondary' : 'primary'} loading={progress.isPending && progress.variables?.id === lesson.id && progress.variables.completed !== undefined}
                    onClick={() => progress.mutate({ id: lesson.id, completed: !lesson.completed })}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden />{lesson.completed ? 'Completed (undo)' : 'Mark as complete'}
                  </Button>
                  <Button variant="ghost" aria-pressed={lesson.bookmarked} onClick={() => progress.mutate({ id: lesson.id, bookmarked: !lesson.bookmarked })}>
                    {lesson.bookmarked ? <BookmarkCheck className="h-4 w-4 text-gold" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}{lesson.bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </Button>
                  {summary?.completed && <Link to="/certificates" className="ml-auto text-sm font-semibold text-violet">Get your certificate →</Link>}
                </div>
              )}

              <div className="flex justify-between gap-3">
                <Button variant="secondary" disabled={idx <= 0} onClick={() => setActiveId(flat[idx - 1]!.id)}><ChevronLeft className="h-4 w-4" aria-hidden />Previous</Button>
                <Button variant="secondary" disabled={idx >= flat.length - 1} onClick={() => setActiveId(flat[idx + 1]!.id)}>Next<ChevronRight className="h-4 w-4" aria-hidden /></Button>
              </div>

              {enrolled && <section className="surface p-5" aria-label="Notes"><h2 className="mb-3 flex items-center gap-2 font-bold"><StickyNote className="h-4 w-4" aria-hidden />Notes</h2><Notes lesson={lesson} onSaved={() => void refresh()} /></section>}
            </motion.article>
          )}
          {!lesson && <Skeleton className="hidden" />}
        </main>
      </div>
      <AnimatePresence>
        {cheer && <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center" aria-hidden><CheckCircle2 className="h-24 w-24 text-success drop-shadow-lg" /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
