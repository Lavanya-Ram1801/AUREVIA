import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button, ButtonLink, Input } from '../../components/ui';
import { post } from '../../services/api';
import { AuthShell, FormError } from './AuthShell';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a number'),
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try { await post('/auth/reset-password', { token, password: v.password }); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not reset password'); }
  });
  if (!token) return <AuthShell title="Invalid link" subtitle="This reset link is missing its token."><ButtonLink to="/forgot-password">Request a new link</ButtonLink></AuthShell>;
  return (
    <AuthShell title="Choose a new password" footer={<Link to="/login" className="font-semibold text-violet">Back to sign in</Link>}>
      {done ? (
        <div role="status" className="space-y-4"><p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">Your password has been updated.</p><ButtonLink to="/login" className="w-full">Sign in</ButtonLink></div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={error} />
          <Input label="New password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <Button type="submit" loading={isSubmitting} className="w-full">Update password</Button>
        </form>
      )}
    </AuthShell>
  );
}
