import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../components/Toast';
import { Badge, Button, ConfirmDialog, Input, Textarea } from '../../components/ui';
import { ApiError, del, patch, post } from '../../services/api';
import type { EditableLesson, EditableSection } from '../../types';

const lessonSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(160),
  content: z.string().max(50000),
  videoUrl: z.union([z.string().trim().url('Enter a valid http(s) URL'), z.literal('')]).optional(),
  resourceUrl: z.union([z.string().trim().url('Enter a valid http(s) URL'), z.literal('')]).optional(),
  resourceName: z.string().trim().max(120).optional(),
  durationMinutes: z.coerce.number({ invalid_type_error: 'Enter minutes' }).int('Whole minutes only').min(0).max(1000),
  isPublished: z.boolean(),
});
type LessonValues = z.infer<typeof lessonSchema>;

function LessonForm({ initial, onSubmit, onCancel, busy }: { initial?: EditableLesson; onSubmit: (v: LessonValues) => void; onCancel: () => void; busy: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<LessonValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { title: initial?.title ?? '', content: initial?.content ?? '', videoUrl: initial?.videoUrl ?? '', resourceUrl: initial?.resourceUrl ?? '', resourceName: initial?.resourceName ?? '', durationMinutes: initial?.durationMinutes ?? 10, isPublished: initial?.isPublished ?? true },
  });
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3 rounded-xl border border-violet/30 bg-violet/5 p-4" aria-label={initial ? 'Edit lesson' : 'New lesson'}>
      <Input label="Lesson title" error={errors.title?.message} {...register('title')} />
      <Textarea label="Lesson content" rows={6} hint="Plain text. Use blank lines for paragraphs, `- ` for bullets, and ``` fences for code." error={errors.content?.message} {...register('content')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Video URL (optional)" type="url" placeholder="https://www.youtube.com/watch?v=…" error={errors.videoUrl?.message} {...register('videoUrl')} />
        <Input label="Duration (minutes)" type="number" min={0} error={errors.durationMinutes?.message} {...register('durationMinutes')} />
        <Input label="Resource URL (optional)" type="url" placeholder="https://…" error={errors.resourceUrl?.message} {...register('resourceUrl')} />
        <Input label="Resource name" placeholder="Slides (PDF)" error={errors.resourceName?.message} {...register('resourceName')} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-violet" {...register('isPublished')} />Published (visible to enrolled students)</label>
      <div className="flex gap-2"><Button type="submit" loading={busy}>{initial ? 'Save lesson' : 'Add lesson'}</Button><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

const move = <T extends { id: string }>(items: T[], index: number, dir: -1 | 1) => {
  const next = [...items];
  const target = index + dir;
  if (target < 0 || target >= next.length) return null;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next.map((i) => i.id);
};

type Confirm = { kind: 'section'; section: EditableSection } | { kind: 'lesson'; lesson: EditableLesson } | null;

export function CurriculumBuilder({ courseId, sections }: { courseId: string; sections: EditableSection[] }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [newSection, setNewSection] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [lessonEditor, setLessonEditor] = useState<{ sectionId: string; lesson?: EditableLesson } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const refresh = () => { void qc.invalidateQueries({ queryKey: ['curriculum', courseId] }); void qc.invalidateQueries({ queryKey: ['my-courses'] }); };
  const fail = (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
  const run = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: refresh, onError: fail });

  const addSection = () => {
    const title = newSection.trim();
    if (title.length < 2) return toast.error('Section title must be at least 2 characters');
    run.mutate(() => post(`/courses/${courseId}/sections`, { title }), { onSuccess: () => setNewSection('') });
  };
  const saveLesson = (v: LessonValues) => {
    if (!lessonEditor) return;
    const body = { ...v, videoUrl: v.videoUrl || null, resourceUrl: v.resourceUrl || null, resourceName: v.resourceName || null };
    run.mutate(() => (lessonEditor.lesson ? patch(`/lessons/${lessonEditor.lesson.id}`, body) : post(`/sections/${lessonEditor.sectionId}/lessons`, body)), {
      onSuccess: () => { toast.success(lessonEditor.lesson ? 'Lesson saved' : 'Lesson added'); setLessonEditor(null); },
    });
  };
  const confirmDelete = () => {
    if (!confirm) return;
    const target = confirm;
    run.mutate(() => (target.kind === 'section' ? del(`/sections/${target.section.id}`) : del(`/lessons/${target.lesson.id}`)), { onSuccess: () => { toast.success('Deleted'); setConfirm(null); }, onError: () => setConfirm(null) });
  };

  return (
    <section aria-labelledby="curriculum-h" className="surface p-5">
      <h2 id="curriculum-h" className="text-lg font-bold">Curriculum</h2>
      <p className="mb-4 text-sm text-subtle">Organise your course into sections and lessons. A course needs at least one published lesson before it can go live.</p>

      {sections.length === 0 && <p className="mb-4 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-subtle">No sections yet. Add your first section below.</p>}
      <ol className="space-y-4">
        {sections.map((s, si) => (
          <li key={s.id} className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              {renaming?.id === s.id ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); run.mutate(() => patch(`/sections/${s.id}`, { title: renaming.title }), { onSuccess: () => setRenaming(null) }); }}>
                  <input aria-label="Section title" value={renaming.title} onChange={(e) => setRenaming({ id: s.id, title: e.target.value })} className="min-h-[40px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
                  <Button type="submit" className="!min-h-[40px]">Save</Button><Button type="button" variant="secondary" className="!min-h-[40px]" onClick={() => setRenaming(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <h3 className="flex-1 font-bold">Section {si + 1}: {s.title}</h3>
                  <Button variant="ghost" aria-label={`Move section ${s.title} up`} disabled={si === 0} onClick={() => { const ids = move(sections, si, -1); if (ids) run.mutate(() => post(`/courses/${courseId}/sections/reorder`, { ids })); }}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" aria-label={`Move section ${s.title} down`} disabled={si === sections.length - 1} onClick={() => { const ids = move(sections, si, 1); if (ids) run.mutate(() => post(`/courses/${courseId}/sections/reorder`, { ids })); }}><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" aria-label={`Rename section ${s.title}`} onClick={() => setRenaming({ id: s.id, title: s.title })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" aria-label={`Delete section ${s.title}`} onClick={() => setConfirm({ kind: 'section', section: s })}><Trash2 className="h-4 w-4 text-danger" /></Button>
                </>
              )}
            </div>
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {s.lessons.map((l, li) => (
                <li key={l.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-1 text-sm"><span className="font-semibold">{li + 1}. {l.title}</span> <span className="text-subtle">· {l.durationMinutes} min</span> {!l.isPublished && <Badge tone="gold">Draft</Badge>}</span>
                    <Button variant="ghost" aria-label={`Move lesson ${l.title} up`} disabled={li === 0} onClick={() => { const ids = move(s.lessons, li, -1); if (ids) run.mutate(() => post(`/sections/${s.id}/lessons/reorder`, { ids })); }}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" aria-label={`Move lesson ${l.title} down`} disabled={li === s.lessons.length - 1} onClick={() => { const ids = move(s.lessons, li, 1); if (ids) run.mutate(() => post(`/sections/${s.id}/lessons/reorder`, { ids })); }}><ArrowDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" aria-label={`Edit lesson ${l.title}`} onClick={() => setLessonEditor({ sectionId: s.id, lesson: l })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" aria-label={`Delete lesson ${l.title}`} onClick={() => setConfirm({ kind: 'lesson', lesson: l })}><Trash2 className="h-4 w-4 text-danger" /></Button>
                  </div>
                  {lessonEditor?.lesson?.id === l.id && <LessonForm key={l.id} initial={l} busy={run.isPending} onSubmit={saveLesson} onCancel={() => setLessonEditor(null)} />}
                </li>
              ))}
            </ul>
            {lessonEditor && !lessonEditor.lesson && lessonEditor.sectionId === s.id
              ? <LessonForm busy={run.isPending} onSubmit={saveLesson} onCancel={() => setLessonEditor(null)} />
              : <Button variant="secondary" className="mt-3" onClick={() => setLessonEditor({ sectionId: s.id })}><Plus className="h-4 w-4" aria-hidden />Add lesson</Button>}
          </li>
        ))}
      </ol>

      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); addSection(); }}>
        <div className="min-w-[14rem] flex-1"><Input label="New section title" value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="e.g. Getting started" /></div>
        <Button type="submit" loading={run.isPending && !lessonEditor}><Plus className="h-4 w-4" aria-hidden />Add section</Button>
      </form>

      <ConfirmDialog open={Boolean(confirm)} danger title={confirm?.kind === 'section' ? 'Delete this section?' : 'Delete this lesson?'} confirmLabel="Delete" loading={run.isPending}
        message={confirm?.kind === 'section' ? `"${confirm.section.title}" and all ${confirm.section.lessons.length} of its lessons will be permanently deleted, along with learners' progress on them.` : `"${confirm?.lesson.title ?? ''}" will be permanently deleted, along with learners' progress and notes on it.`}
        onCancel={() => setConfirm(null)} onConfirm={confirmDelete} />
    </section>
  );
}
