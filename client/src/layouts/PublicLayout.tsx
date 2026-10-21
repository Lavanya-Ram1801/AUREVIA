import { AnimatePresence, motion } from 'framer-motion';
import { Github, Linkedin, Mail, Menu, Moon, Sun, Twitter, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ButtonLink } from '../components/ui';
import { Avatar } from '../components/ui';
import { Logo } from '../components/visual';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { homeFor } from '../routes/guards';

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`} className="rounded-xl p-2.5 hover:bg-violet/10">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={resolved} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} className="block">
          {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const links = [
  { to: '/courses', label: 'Explore Courses' },
  { to: '/#features', label: 'Features' },
  { to: '/#about', label: 'About' },
];

export function PublicLayout({ overlayHeader = false }: { overlayHeader?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const transparent = overlayHeader && pathname === '/';
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-violet focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <header className={transparent ? 'absolute inset-x-0 top-0 z-40' : 'sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur'}>
        <div className="container-page flex h-16 items-center justify-between">
          <Logo light={transparent} />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              l.to.startsWith('/#')
                ? <a key={l.to} href={l.to} className={`rounded-lg px-3 py-2 text-sm font-semibold hover:bg-violet/10 ${transparent ? 'text-white/90' : ''}`}>{l.label}</a>
                : <NavLink key={l.to} to={l.to} className={`rounded-lg px-3 py-2 text-sm font-semibold hover:bg-violet/10 ${transparent ? 'text-white/90' : ''}`}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <span className={transparent ? 'text-white' : ''}><ThemeToggle /></span>
            {user ? (
              <Link to={homeFor(user.role)} className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-violet/10"><Avatar name={user.name} src={user.avatarUrl} /><span className={`text-sm font-semibold ${transparent ? 'text-white' : ''}`}>Dashboard</span></Link>
            ) : (
              <>
                <Link to="/login" className={`rounded-lg px-3 py-2 text-sm font-semibold hover:bg-violet/10 ${transparent ? 'text-white' : ''}`}>Login</Link>
                <ButtonLink to="/register">Get Started</ButtonLink>
              </>
            )}
          </div>
          <button className={`rounded-xl p-2.5 md:hidden ${transparent ? 'text-white' : ''}`} onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-[var(--border)] bg-[var(--surface)] md:hidden" aria-label="Mobile">
              <div className="container-page flex flex-col gap-1 py-3" onClick={() => setOpen(false)}>
                {links.map((l) => <a key={l.to} href={l.to} className="rounded-lg px-3 py-3 font-semibold hover:bg-violet/10">{l.label}</a>)}
                {user ? <Link to={homeFor(user.role)} className="rounded-lg px-3 py-3 font-semibold">Dashboard</Link> : (<><Link to="/login" className="rounded-lg px-3 py-3 font-semibold">Login</Link><ButtonLink to="/register">Get Started</ButtonLink></>)}
                <div className="px-1"><ThemeToggle /></div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-midnight text-white/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-sm text-sm">Learn. Evolve. Excel. A premium learning platform for people who want to grow.</p>
          <p className="mt-4 flex items-center gap-2 text-sm"><Mail className="h-4 w-4" aria-hidden /> hello@aurevia.example <span className="text-white/50">(placeholder address)</span></p>
          <div className="mt-4 flex gap-3">
            {[[Twitter, 'Twitter'], [Linkedin, 'LinkedIn'], [Github, 'GitHub']].map(([Icon, label]) => {
              const I = Icon as typeof Twitter;
              return <a key={label as string} href="https://example.com" target="_blank" rel="noreferrer noopener" aria-label={`${label as string} (placeholder link)`} className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><I className="h-4 w-4" /></a>;
            })}
          </div>
        </div>
        <nav aria-label="Platform"><h2 className="mb-3 font-bold text-white">Platform</h2><ul className="space-y-2 text-sm"><li><Link to="/courses" className="hover:text-white">Explore Courses</Link></li><li><a href="/#features" className="hover:text-white">Features</a></li><li><Link to="/verify" className="hover:text-white">Verify a Certificate</Link></li></ul></nav>
        <nav aria-label="Account"><h2 className="mb-3 font-bold text-white">Account</h2><ul className="space-y-2 text-sm"><li><Link to="/login" className="hover:text-white">Login</Link></li><li><Link to="/register" className="hover:text-white">Sign up</Link></li><li><a href="/#faq" className="hover:text-white">FAQ</a></li></ul></nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/60">© {new Date().getFullYear()} AUREVIA. Demonstration project: sample content is clearly labelled.</div>
    </footer>
  );
}
