import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader, Pager, QueryBoundary } from '../../components/dashboard';
import { useToast } from '../../components/Toast';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Modal, Select, Skeleton } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { get, patch } from '../../services/api';
import type { AdminUserRow, Paged, Role } from '../../types';
import { formatDate } from '../../utils/format';

const PAGE_SIZE = 15;
type Pending = { user: AdminUserRow; change: { role: Role } | { isActive: boolean } } | null;

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<Pending>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => { const t = window.setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => window.clearTimeout(t); }, [search]);

  const users = useQuery({ queryKey: ['admin-users', q, role, active, page], queryFn: () => get<Paged<AdminUserRow>>('/admin/users', { q, role, active, page, pageSize: PAGE_SIZE }), placeholderData: (p) => p });
  const details = useQuery({ queryKey: ['admin-user', detail], queryFn: () => get<AdminUserRow & { counts: Record<string, number> }>(`/admin/users/${detail}`), enabled: Boolean(detail) });

  const update = useMutation({
    mutationFn: (p: NonNullable<Pending>) => patch(`/admin/users/${p.user.id}`, p.change),
    onSuccess: () => { toast.success('User updated'); setPending(null); void qc.invalidateQueries({ queryKey: ['admin-users'] }); void qc.invalidateQueries({ queryKey: ['dashboard', 'admin'] }); },
    onError: (e) => { toast.error(e instanceof Error ? e.message : 'Could not update user'); setPending(null); },
  });

  const describe = (p: NonNullable<Pending>) => 'role' in p.change
    ? `Change ${p.user.name}'s role from ${p.user.role.toLowerCase()} to ${p.change.role.toLowerCase()}? They will be signed out of all devices.`
    : p.change.isActive ? `Reactivate ${p.user.name}'s account?` : `Deactivate ${p.user.name}'s account? They will be signed out immediately and unable to log in.`;

  return (
    <>
      <PageHeader title="Users" subtitle="Search, review and manage accounts. Admin accounts are provisioned only via the CLI or by another admin." />
      <div className="surface mb-6 grid gap-4 p-4 md:grid-cols-4">
        <div className="md:col-span-2"><label htmlFor="user-search" className="mb-1.5 block text-sm font-semibold">Search name or email</label>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden /><input id="user-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm" /></div></div>
        <Select label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option><option value="STUDENT">Student</option><option value="INSTRUCTOR">Instructor</option><option value="ADMIN">Admin</option></Select>
        <Select label="Status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}><option value="">Any status</option><option value="true">Active</option><option value="false">Deactivated</option></Select>
      </div>
      <QueryBoundary loading={users.isLoading} error={users.error} onRetry={() => void users.refetch()} skeleton={<Skeleton className="h-64" />}>
        {users.data && users.data.data.length === 0 ? <EmptyState title="No users match" message="Try a different search or clear the filters." /> : (
          <>
            <div className="surface overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Registered users</caption>
                <thead className="border-b border-[var(--border)] text-subtle"><tr>{['User', 'Role', 'Status', 'Joined', 'Actions'].map((h) => <th key={h} scope="col" className="p-4 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.data?.data.map((u) => {
                    const self = u.id === me?.id;
                    return (
                      <tr key={u.id}>
                        <td className="p-4"><span className="flex items-center gap-3"><Avatar name={u.name} src={u.avatarUrl} /><span className="min-w-0"><button className="block truncate text-left font-semibold hover:text-violet" onClick={() => setDetail(u.id)}>{u.name}{self ? ' (you)' : ''}</button><span className="text-xs text-subtle">{u.email}</span></span></span></td>
                        <td className="p-4"><label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.name}</label>
                          <select id={`role-${u.id}`} value={u.role} disabled={self} onChange={(e) => setPending({ user: u, change: { role: e.target.value as Role } })} className="min-h-[40px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm disabled:opacity-60">
                            <option value="STUDENT">Student</option><option value="INSTRUCTOR">Instructor</option><option value="ADMIN">Admin</option></select></td>
                        <td className="p-4"><Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge></td>
                        <td className="p-4 text-subtle">{formatDate(u.createdAt)}</td>
                        <td className="p-4"><div className="flex gap-2"><Button variant="secondary" className="!min-h-[40px] !px-3" onClick={() => setDetail(u.id)}>Details</Button>
                          <Button variant={u.isActive ? 'ghost' : 'primary'} className="!min-h-[40px] !px-3" disabled={self} onClick={() => setPending({ user: u, change: { isActive: !u.isActive } })}>{u.isActive ? 'Deactivate' : 'Activate'}</Button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={users.data?.meta.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </QueryBoundary>

      <ConfirmDialog open={Boolean(pending)} title="Confirm change" message={pending ? describe(pending) : ''} danger={Boolean(pending && ('role' in pending.change ? pending.change.role !== 'STUDENT' || pending.user.role === 'ADMIN' : !pending.change.isActive))} loading={update.isPending}
        confirmLabel="Confirm" onCancel={() => setPending(null)} onConfirm={() => pending && update.mutate(pending)} />
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="User details">
        {details.isLoading && <p className="text-sm text-subtle">Loading…</p>}
        {details.isError && <p role="alert" className="text-sm text-danger">Could not load this user.</p>}
        {details.data && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2"><dt className="text-subtle">Name</dt><dd className="font-semibold">{details.data.name}</dd></div>
            <div className="col-span-2"><dt className="text-subtle">Email</dt><dd className="font-semibold">{details.data.email}</dd></div>
            <div><dt className="text-subtle">Role</dt><dd className="font-semibold capitalize">{details.data.role.toLowerCase()}</dd></div>
            <div><dt className="text-subtle">Joined</dt><dd className="font-semibold">{formatDate(details.data.createdAt)}</dd></div>
            {Object.entries(details.data.counts).map(([k, v]) => <div key={k}><dt className="text-subtle capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt><dd className="font-semibold">{v}</dd></div>)}
          </dl>
        )}
      </Modal>
    </>
  );
}
