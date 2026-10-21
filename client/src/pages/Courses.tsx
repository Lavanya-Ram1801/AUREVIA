import { LayoutGrid, List, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CourseCard, CourseCardSkeleton } from '../components/CourseCard';
import { useToast } from '../components/Toast';
import { Button, EmptyState, ErrorState, Select } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useCategories, useCourses, useWishlistToggle } from '../services/queries';
import { cn } from '../utils/format';

export default function Courses() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const toggle = useWishlistToggle();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [wished, setWished] = useState<Set<string>>(new Set());

  const filters = {
    q: params.get('q') ?? undefined, category: params.get('category') ?? undefined, level: params.get('level') ?? undefined,
    price: params.get('price') ?? undefined, sort: params.get('sort') ?? 'newest', page: Number(params.get('page') ?? 1) || 1, pageSize: 9,
  };
  const courses = useCourses(filters);
  const cats = useCategories();

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => { if ((params.get('q') ?? '') !== search.trim()) set('q', search.trim()); }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasFilters = ['q', 'category', 'level', 'price'].some((k) => params.get(k));
  const clear = () => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); };
  const meta = courses.data?.meta;

  const onWish = (id: string) => {
    if (!user) return toast.error('Sign in to save courses to your wishlist.');
    const isWished = wished.has(id);
    toggle.mutate({ id, wished: isWished }, {
      onSuccess: () => setWished((s) => { const n = new Set(s); if (isWished) n.delete(id); else n.add(id); return n; }),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not update wishlist'),
    });
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold">Explore courses</h1>
      <p className="mt-1 text-subtle">Find your next skill. Search, filter and sort the full catalog.</p>

      <div className="surface mt-6 grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="course-search" className="mb-1.5 block text-sm font-semibold">Search</label>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input id="course-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or description" className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm" /></div>
        </div>
        <Select label="Category" value={filters.category ?? ''} onChange={(e) => set('category', e.target.value)}>
          <option value="">All categories</option>{cats.data?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </Select>
        <Select label="Level" value={filters.level ?? ''} onChange={(e) => set('level', e.target.value)}>
          <option value="">All levels</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option>
        </Select>
        <Select label="Price" value={filters.price ?? ''} onChange={(e) => set('price', e.target.value)}>
          <option value="">Any price</option><option value="free">Free</option><option value="paid">Paid</option>
        </Select>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-subtle" aria-live="polite">{courses.isLoading ? 'Loading courses…' : meta ? `${meta.total} course${meta.total === 1 ? '' : 's'} found` : ''}</p>
        <div className="flex items-center gap-2">
          {hasFilters && <Button variant="ghost" onClick={clear}><X className="h-4 w-4" aria-hidden />Clear filters</Button>}
          <div className="w-44"><Select label="Sort by" value={filters.sort} onChange={(e) => set('sort', e.target.value)}><option value="newest">Newest</option><option value="popular">Most popular</option><option value="rating">Highest rated</option></Select></div>
          <div className="mt-6 flex rounded-xl border border-[var(--border)] p-1" role="group" aria-label="View mode">
            {([['grid', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} aria-label={`${v} view`} className={cn('rounded-lg p-2.5', view === v ? 'bg-violet text-white' : 'hover:bg-violet/10')}><Icon className="h-4 w-4" /></button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {courses.isError ? <ErrorState message={courses.error instanceof Error ? courses.error.message : undefined} onRetry={() => void courses.refetch()} /> : courses.isLoading ? (
          <div className={cn('grid gap-6', view === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : '')}>{Array.from({ length: 6 }, (_, i) => <CourseCardSkeleton key={i} view={view} />)}</div>
        ) : courses.data && courses.data.data.length === 0 ? (
          <EmptyState title="No courses match your search" message="Try different keywords or remove some filters." action={hasFilters ? <Button onClick={clear}>Clear filters</Button> : undefined} />
        ) : (
          <div className={cn('grid gap-6', view === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : '')}>
            {courses.data?.data.map((c, i) => <CourseCard key={c.id} course={c} view={view} index={i} wished={wished.has(c.id)} onToggleWishlist={() => onWish(c.id)} />)}
          </div>
        )}
      </div>

      {meta && (meta.totalPages ?? 1) > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
          <Button variant="secondary" disabled={filters.page <= 1} onClick={() => set('page', String(filters.page - 1))}>Previous</Button>
          <span className="text-sm" aria-current="page">Page {meta.page} of {meta.totalPages}</span>
          <Button variant="secondary" disabled={filters.page >= (meta.totalPages ?? 1)} onClick={() => set('page', String(filters.page + 1))}>Next</Button>
        </nav>
      )}
    </div>
  );
}
