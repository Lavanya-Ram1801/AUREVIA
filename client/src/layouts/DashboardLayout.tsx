import { AnimatePresence, motion } from 'framer-motion';
import { Award, BarChart3, BookOpen, Bell, ChevronsLeft, ChevronsRight, FilePlus2, GraduationCap, Heart, LayoutDashboard, LogOut, Menu, Settings, Shield, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../components/ui';
import { Logo, PageTransition } from '../components/visual';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../services/queries';
import { post } from '../services/api';
import { ThemeToggle } from './PublicLayout';
import type { Role } from '../types';
import { cn, timeAgo } from '../utils/format';

interface Item { to: string; label: string; icon: LucideIcon; end?: boolean }
const NAV: Record<Role, Item[]> = {
  STUDENT: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dashboard/learning', label: 'My Learning', icon: BookOpen },
    { to: '/courses', label: 'Explore Courses', icon: GraduationCap },
    { to: '/certificates', label: 'Certificates', icon: Award },
    { to: '/wishlist', label: 'Wishlist', icon: Heart },
    { to: '/settings', label: 'Profile Settings', icon: Settings },
  ],
  INSTRUCTOR: [
    { to: '/instructor', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/instructor/courses', label: 'My Courses', icon: BookOpen, end: true },
    { to: '/instructor/courses/new', label: 'Create Course', icon: FilePlus2 },
    { to: '/instructor/students', label: 'Student Progress', icon: BarChart3 },
    { to: '/settings', label: 'Profile Settings', icon: Settings },
  ],
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courses', label: 'Course Moderation', icon: Shield },
    { to: '/settings', label: 'Profile Settings', icon: Settings },
  ],
};

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [pathname]);
  if (!user) return null;
  const items = NAV[user.role];

  const sidebar = (compact: boolean) => (
    <div className="flex h-full flex-col bg-midnight text-white/80">
      <div className={cn('flex h-16 items-center', compact ? 'justify-center' : 'px-5')}>{compact ? <Logo className="[&>span:last-child]:hidden" light /> : <Logo light />}</div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Dashboard">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} title={compact ? label : undefined}
            className={({ isActive }) => cn('flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors', compact && 'justify-center', isActive ? 'bg-violet text-white shadow-glow' : 'hover:bg-white/10')}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden />{!compact && label}<span className="sr-only">{compact ? label : ''}</span>
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 px-3 pb-4">
        <button onClick={async () => { await logout(); navigate('/'); }} className={cn('flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-white/10', compact && 'justify-center')}>
          <LogOut className="h-5 w-5" aria-hidden />{!compact ? 'Logout' : <span className="sr-only">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-violet focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <motion.aside animate={{ width: collapsed ? 76 : 256 }} className="fixed inset-y-0 left-0 z-30 hidden lg:block" aria-label="Sidebar">{sidebar(collapsed)}</motion.aside>
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-midnight/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'tween', duration: 0.2 }} className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden" aria-label="Sidebar">
              {sidebar(false)}
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-2 text-white"><X className="h-5 w-5" /></button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/85 px-4 backdrop-blur sm:px-6">
          <button className="rounded-xl p-2.5 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <button className="hidden rounded-xl p-2.5 hover:bg-violet/10 lg:block" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
          </button>
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationBell />
          <Link to="/settings" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-violet/10" aria-label="Profile settings">
            <Avatar name={user.name} src={user.avatarUrl} /><span className="hidden text-sm font-semibold sm:block">{user.name}</span>
          </Link>
        </header>
        <main id="main" className="container-page py-8"><PageTransition key={pathname}><Outlet /></PageTransition></main>
      </div>
    </div>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const q = useNotifications(Boolean(user));
  const readAll = useMutation({ mutationFn: () => post('/notifications/read-all'), onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const readOne = useMutation({ mutationFn: (id: string) => post(`/notifications/${id}/read`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const unread = q.data?.unread ?? 0;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} className="relative rounded-xl p-2.5 hover:bg-violet/10">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="surface absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 className="font-bold">Notifications</h2>
              {unread > 0 && <button className="text-xs font-semibold text-violet" onClick={() => readAll.mutate()}>Mark all read</button>}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {q.isLoading && <li className="p-4 text-sm text-subtle">Loading…</li>}
              {q.isError && <li className="p-4 text-sm text-danger">Could not load notifications.</li>}
              {q.data?.items.length === 0 && <li className="p-6 text-center text-sm text-subtle">You're all caught up.</li>}
              {q.data?.items.map((n) => (
                <li key={n.id} className={cn('border-b border-[var(--border)] last:border-0', !n.read && 'bg-violet/5')}>
                  <Link to={n.link ?? '#'} onClick={() => { if (!n.read) readOne.mutate(n.id); setOpen(false); }} className="block px-4 py-3 hover:bg-violet/5">
                    <p className="text-sm font-semibold">{n.title}</p><p className="text-sm text-subtle">{n.message}</p><p className="mt-1 text-xs text-subtle">{timeAgo(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
