import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { PageHeader, QueryBoundary } from '../../components/dashboard';
import { useToast } from '../../components/Toast';
import { Badge, Button, ButtonLink, Input, Select, Skeleton, Textarea } from '../../components/ui';
import { ApiError, patch, post, get } from '../../services/api';
import { useCategories } from '../../services/queries';
import type { EditableCourse, EditableSection } from '../../types';
import { CurriculumBuilder } from './CurriculumBuilder';
import { STATUS_TONE } from './MyCourses';

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const listRule = (label: string) => z.string().refine((v) => lines(v).length <= 20, `At most 20 ${label}`).refine((v) => lines(v).every((l) => l.length <= 300), 'Each line must be under 300 characters');

export const courseFormSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120, 'Title is too long'),
  shortDescription: z.string().trim().min(10, 'Short description must be at least 10 characters').max(200, 'Keep it under 200 characters'),
  description: z.string().trim().min(30, 'Description must be at least 30 characters').max(10000),
  categoryId: z.string().min(1, 'Choose a category'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  thumbnailUrl: z.union([z.string().trim().url('Enter a valid http(s) image URL'), z.literal('')]).optional(),
  outcomes: listRule('outcomes'),
  prerequisites: listRule('prerequisites'),
  isFree: z.boolean(),
  price: z.coerce.number({ invalid_type_error: 'Enter a price' }).min(0, 'Price cannot be negative').max(10000),
  durationMinutes: z.coerce.number({ invalid_type_error: 'Enter minutes' }).int('Whole minutes only').min(0).max(100000),
}).refine((v) => v.isFree || v.price > 0, { path: ['price'], message: 'Enter a price above 0 or mark the course free' });
type FormValues = z.infer<typeof courseFormSchema>;

function EditorForm({ course }: { course?: EditableCourse }) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const cats = useCategories();
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: course?.title ?? '', shortDescription: course?.shortDescription ?? '', description: course?.description ?? '', categoryId: course?.categoryId ?? '', level: course?.level ?? 'BEGINNER',
      thumbnailUrl: course?.thumbnailUrl ?? '', outcomes: (course?.outcomes ?? []).join('\n'), prerequisites: (course?.prerequisites ?? []).join('\n'),
      isFree: course ? course.priceCents === 0 : true, price: course ? course.priceCents / 100 : 0, durationMinutes: course?.durationMinutes ?? 60,
    },
  });
  const isFree = watch('isFree');

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = {
        title: v.title, shortDescription: v.shortDescription, description: v.description, categoryId: v.categoryId, level: v.level,
        thumbnailUrl: v.thumbnailUrl || null, outcomes: lines(v.outcomes), prerequisites: lines(v.prerequisites),
        priceCents: v.isFree ? 0 : Math.round(v.price * 100), durationMinutes: v.durationMinutes,
      };
      return course ? patch<EditableCourse>(`/courses/${course.id}`, body) : post<EditableCourse>('/courses', body);
    },
    onSuccess: (saved) => {
      toast.success(course ? 'Course saved' : 'Draft created. Now add sections and lessons.');
      void qc.invalidateQueries({ queryKey: ['my-courses'] }); void qc.invalidateQueries({ queryKey: ['curriculum', saved.id] });
      if (!course) navigate(`/instructor/courses/${saved.id}`, { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof FormValues, { message: m });
      toast.error(e instanceof Error ? e.message : 'Could not save course');
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="surface space-y-4 p-5" aria-label="Course details">
      <h2 className="text-lg font-bold">Course details</h2>
      <Input label="Title" error={errors.title?.message} {...register('title')} />
      <Textarea label="Short description" rows={2} hint="Shown on course cards (10–200 characters)." error={errors.shortDescription?.message} {...register('shortDescription')} />
      <Textarea label="Full description" rows={6} error={errors.description?.message} {...register('description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}><option value="">Choose a category…</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select label="Skill level" error={errors.level?.message} {...register('level')}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></Select>
      </div>
      <Input label="Thumbnail image URL (optional)" type="url" placeholder="https://…" hint="Without one, AUREVIA shows a branded gradient." error={errors.thumbnailUrl?.message} {...register('thumbnailUrl')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Textarea label="Learning outcomes" rows={4} hint="One per line." error={errors.outcomes?.message} {...register('outcomes')} />
        <Textarea label="Prerequisites" rows={4} hint="One per line." error={errors.prerequisites?.message} {...register('prerequisites')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Estimated duration (minutes)" type="number" min={0} error={errors.durationMinutes?.message} {...register('durationMinutes')} />
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-violet" {...register('isFree')} />This course is free</label>
          {!isFree && <Input label="Price (USD)" type="number" step="0.01" min={0} hint="Paid courses can't be purchased until a payment provider is configured (see README)." error={errors.price?.message} {...register('price')} />}
        </div>
      </div>
      <div className="flex gap-3"><Button type="submit" loading={save.isPending}>{course ? 'Save changes' : 'Create draft'}</Button></div>
    </form>
  );
}

export default function CourseEditor() {
  const { id } = useParams();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['curriculum', id], queryFn: () => get<{ course: EditableCourse; sections: EditableSection[] }>(`/courses/${id}/curriculum`), enabled: Boolean(id), retry: false });

  const publish = useMutation({
    mutationFn: (action: 'publish' | 'unpublish') => post(`/courses/${id}/${action}`),
    onSuccess: (_r, action) => { toast.success(action === 'publish' ? 'Course is live' : 'Course unpublished'); void qc.invalidateQueries({ queryKey: ['curriculum', id] }); void qc.invalidateQueries({ queryKey: ['my-courses'] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not update status'),
  });

  if (!id) return (<><PageHeader title="Create course" subtitle="Start with the basics. You'll add sections and lessons next." /><div className="max-w-3xl"><EditorForm /></div></>);

  const course = q.data?.course;
  return (
    <>
      <PageHeader title={course?.title ?? 'Edit course'} subtitle={course ? undefined : 'Loading…'}
        actions={course && (
          <>
            <Badge tone={STATUS_TONE[course.status]} className="self-center">{course.status.toLowerCase()}</Badge>
            <ButtonLink to={`/learn/${course.id}`} variant="secondary"><Eye className="h-4 w-4" aria-hidden />Preview</ButtonLink>
            {course.status === 'PUBLISHED'
              ? <Button variant="secondary" loading={publish.isPending} onClick={() => publish.mutate('unpublish')}>Unpublish</Button>
              : <Button loading={publish.isPending} onClick={() => publish.mutate('publish')}>Publish</Button>}
          </>
        )} />
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} skeleton={<Skeleton className="h-96" />}>
        {q.data && (
          <div className="grid max-w-3xl gap-6">
            <EditorForm key={q.data.course.id} course={q.data.course} />
            <CurriculumBuilder courseId={q.data.course.id} sections={q.data.sections} />
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
