import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { homeFor } from '../../routes/guards';
import { post } from '../../services/api';
import type { User } from '../../types';
import { AuthShell, FormError } from './AuthShell';

export const loginSchema = z.object({ email: z.string().trim().email('Enter a valid email address'), password: z.string().min(1, 'Enter your password') });
type Values = z.infer<typeof loginSchema>;

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try {
      const res = await post<{ user: User }>('/auth/login', v);
      setUser(res.user);
      const from = (loc.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : homeFor(res.user.role), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
    }
  });

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue learning." footer={<>New to AUREVIA? <Link to="/register" className="font-semibold text-violet">Create an account</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={error} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-violet">Forgot password?</Link></div>
        <Button type="submit" loading={isSubmitting} className="w-full">Sign in</Button>
      </form>
    </AuthShell>
  );
}
