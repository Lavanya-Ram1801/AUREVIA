import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Moon, Monitor, Sun } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { PageHeader, Panel } from '../components/dashboard';
import { useToast } from '../components/Toast';
import { Badge, Button, Input, Modal, Textarea } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ApiError, patch, post } from '../services/api';
import type { User } from '../types';
import { cn, passwordStrength } from '../utils/format';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  avatarUrl: z.union([z.string().trim().url('Enter a valid image URL (https://…)'), z.literal('')]).optional(),
  bio: z.string().trim().max(500, 'Keep it under 500 characters').optional(),
  learningGoal: z.string().trim().max(200, 'Keep it under 200 characters').optional(),
  weeklyGoalHours: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Use whole hours').min(1, 'At least 1 hour').max(60, 'At most 60 hours'),
});
type ProfileValues = z.infer<typeof profileSchema>;

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter').regex(/[0-9]/, 'Include a number'),
  confirm: z.string(),
}).refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type PasswordValues = z.infer<typeof passwordSchema>;

function Section({ title, children }: { title: string; children: ReactNode }) { return <Panel title={title}>{children}</Panel>; }

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteErr, setDeleteErr] = useState<string>();

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => patch<{ user: User }>('/users/me', body),
    onSuccess: (r) => { setUser(r.user); toast.success('Settings saved'); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not save settings'),
  });

  const profile = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', avatarUrl: user?.avatarUrl ?? '', bio: user?.bio ?? '', learningGoal: user?.learningGoal ?? '', weeklyGoalHours: user?.weeklyGoalHours ?? 3 },
  });
  const pw = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });
  const newPw = pw.watch('newPassword') ?? '';

  const changePw = useMutation({
    mutationFn: (v: PasswordValues) => post('/users/me/password', { currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => { toast.success('Password updated. Other devices were signed out.'); pw.reset(); },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) pw.setError('currentPassword', { message: 'Current password is incorrect' });
      else toast.error(e instanceof Error ? e.message : 'Could not update password');
    },
  });

  const del = useMutation({
    mutationFn: () => post('/users/me/delete', { password: deletePw }),
    onSuccess: async () => { await logout(); toast.success('Your account was deleted.'); navigate('/'); },
    onError: (e) => setDeleteErr(e instanceof Error ? e.message : 'Could not delete account'),
  });

  if (!user) return null;
  const pickTheme = (t: 'light' | 'dark' | 'system') => { setTheme(t); save.mutate({ theme: t }); };

  return (
    <>
      <PageHeader title="Profile settings" subtitle="Manage your account, learning preferences and notifications." />
      <div className="grid max-w-3xl gap-6">
        <Section title="Account">
          <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-subtle">Email</dt><dd className="font-semibold">{user.email}</dd></div>
            <div><dt className="text-subtle">Role</dt><dd><Badge tone="gold" className="capitalize">{user.role.toLowerCase()}</Badge></dd></div>
          </dl>
          <form className="space-y-4" noValidate onSubmit={profile.handleSubmit((v) => save.mutate({ name: v.name, avatarUrl: v.avatarUrl || '', bio: v.bio || null, learningGoal: v.learningGoal || null, weeklyGoalHours: v.weeklyGoalHours }))}>
            <Input label="Full name" autoComplete="name" error={profile.formState.errors.name?.message} {...profile.register('name')} />
            <Input label="Profile image URL" type="url" placeholder="https://…" hint="Optional. Link to an image you host." error={profile.formState.errors.avatarUrl?.message} {...profile.register('avatarUrl')} />
            <Textarea label="Bio" rows={3} error={profile.formState.errors.bio?.message} {...profile.register('bio')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Learning goal" placeholder="e.g. Become a front-end developer" error={profile.formState.errors.learningGoal?.message} {...profile.register('learningGoal')} />
              <Input label="Weekly goal (hours)" type="number" min={1} max={60} error={profile.formState.errors.weeklyGoalHours?.message} {...profile.register('weeklyGoalHours')} />
            </div>
            <Button type="submit" loading={save.isPending}>Save changes</Button>
          </form>
        </Section>

        <Section title="Appearance">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]] as const).map(([k, label, Icon]) => (
              <button key={k} role="radio" aria-checked={theme === k} onClick={() => pickTheme(k)}
                className={cn('flex min-h-[48px] items-center justify-center gap-2 rounded-xl border text-sm font-semibold', theme === k ? 'border-violet bg-violet/10 text-violet' : 'border-[var(--border)] hover:bg-violet/5')}><Icon className="h-4 w-4" aria-hidden />{label}</button>
            ))}
          </div>
        </Section>

        <Section title="Notifications">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-violet" checked={user.emailNotifs} onChange={(e) => save.mutate({ emailNotifs: e.target.checked })} />
            <span><span className="font-semibold">Email notifications</span><span className="block text-sm text-subtle">Enrollment confirmations and course updates by email. Emails are only sent when the platform has an email provider configured; in-app notifications are always on.</span></span>
          </label>
        </Section>

        <Section title="Change password">
          <form className="space-y-4" noValidate onSubmit={pw.handleSubmit((v) => changePw.mutate(v))}>
            <Input label="Current password" type="password" autoComplete="current-password" error={pw.formState.errors.currentPassword?.message} {...pw.register('currentPassword')} />
            <Input label="New password" type="password" autoComplete="new-password" hint={newPw ? `Strength: ${passwordStrength(newPw).label}` : '8+ characters with upper, lower case and a number'} error={pw.formState.errors.newPassword?.message} {...pw.register('newPassword')} />
            <Input label="Confirm new password" type="password" autoComplete="new-password" error={pw.formState.errors.confirm?.message} {...pw.register('confirm')} />
            <Button type="submit" loading={changePw.isPending}>Update password</Button>
          </form>
        </Section>

        <Section title="Session & danger zone">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={async () => { await logout(); navigate('/'); }}>Log out</Button>
            <Button variant="danger" onClick={() => { setDeletePw(''); setDeleteErr(undefined); setDeleting(true); }}>Delete account</Button>
          </div>
          <p className="mt-3 text-sm text-subtle">Deleting your account permanently removes your enrollments, progress, notes, reviews, wishlist and certificates. Instructors must first delete or hand over their courses. Admin accounts can't be self-deleted.</p>
        </Section>
      </div>

      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete your account?">
        <p className="mb-4 text-sm text-subtle">This can't be undone. Enter your password to confirm.</p>
        <Input label="Password" type="password" autoComplete="current-password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} error={deleteErr} />
        <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(false)}>Cancel</Button><Button variant="danger" disabled={!deletePw} loading={del.isPending} onClick={() => { setDeleteErr(undefined); del.mutate(); }}>Delete permanently</Button></div>
      </Modal>
    </>
  );
}
