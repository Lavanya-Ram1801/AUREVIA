import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button, Input } from '../../components/ui';
import { post } from '../../services/api';
import { AuthShell, FormError } from './AuthShell';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address') });

export default function ForgotPassword() {
  const [done, setDone] = useState<{ message: string; devLink?: string }>();
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const onSubmit = handleSubmit(async (v) => {
    setError(undefined);
    try { setDone(await post<{ message: string; devLink?: string }>('/auth/forgot-password', v)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); }
  });
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={<Link to="/login" className="font-semibold text-violet">Back to sign in</Link>}>
      {done ? (
        <div role="status" className="space-y-3 text-sm">
          <p className="rounded-xl border border-success/30 bg-success/10 p-4">{done.message}</p>
          {done.devLink && <p className="rounded-xl border border-gold/50 bg-gold/15 p-4"><strong>Development mode:</strong> no email provider is configured, so use this link directly: <Link className="break-all font-semibold text-violet underline" to={done.devLink.replace(/^https?:\/\/[^/]+/, '')}>Reset password</Link></p>}
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={error} />
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" loading={isSubmitting} className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
