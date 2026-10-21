import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Input, Select } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../routes/guards';
import { ApiError, post } from '../../services/api';
import type { User } from '../../types';
import { cn, passwordStrength } from '../../utils/format';
import { AuthShell, FormError } from './AuthShell';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a number'),
  confirmPassword: z.string(),
  role: z.enum(['STUDENT', 'INSTRUCTOR']),
  avatarUrl: z.union([z.string().trim().url('Enter a valid image URL'), z.literal('')]).optional(),
}).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Values = z.infer<typeof registerSchema>;

function StrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  const colors = ['bg-danger', 'bg-danger', 'bg-gold', 'bg-success', 'bg-success'];
  return (
    <div aria-live="polite" className="-mt-2">
      <div className="flex gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < score ? colors[score] : 'bg-[var(--border)]')} />)}</div>
      <p className="mt-1 text-xs text-subtle">Password strength: <span className="font-semibold">{password ? label : '—'}</span></p>
    </div>
  );
}

export default function Register() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const { register, handleSubmit, watch, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'STUDENT' } });

  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try {
      const res = await post<{ user: User }>('/auth/register', { name: v.name, email: v.email, password: v.password, role: v.role, avatarUrl: v.avatarUrl || undefined });
      setUser(res.user);
      navigate(homeFor(res.user.role), { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setFieldError('email', { message: e.message });
      else if (e instanceof ApiError && e.fields) for (const [k, m] of Object.entries(e.fields)) setFieldError(k as keyof Values, { message: m });
      else setError(e instanceof Error ? e.message : 'Could not create your account');
    }
  });

  return (
    <AuthShell title="Create your account" subtitle="Start learning in under a minute." footer={<>Already have an account? <Link to="/login" className="font-semibold text-violet">Sign in</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={error} />
        <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
        <StrengthMeter password={watch('password') ?? ''} />
        <Input label="Confirm password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <Select label="I want to" {...register('role')}><option value="STUDENT">Learn (student)</option><option value="INSTRUCTOR">Teach (instructor)</option></Select>
        <Input label="Profile image URL (optional)" type="url" placeholder="https://…" error={errors.avatarUrl?.message} {...register('avatarUrl')} />
        <Button type="submit" loading={isSubmitting} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  );
}
