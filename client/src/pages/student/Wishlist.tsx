import { useQuery } from '@tanstack/react-query';
import { CourseCard } from '../../components/CourseCard';
import { PageHeader, QueryBoundary } from '../../components/dashboard';
import { useToast } from '../../components/Toast';
import { ButtonLink, EmptyState, Skeleton } from '../../components/ui';
import { get } from '../../services/api';
import { useWishlistToggle } from '../../services/queries';
import type { CourseCardData } from '../../types';

export default function Wishlist() {
  const toast = useToast();
  const toggle = useWishlistToggle();
  const q = useQuery({ queryKey: ['wishlist'], queryFn: () => get<CourseCardData[]>('/wishlist') });
  return (
    <>
      <PageHeader title="Wishlist" subtitle="Courses you've saved for later." actions={<ButtonLink to="/courses" variant="secondary">Explore courses</ButtonLink>} />
      <QueryBoundary loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} skeleton={<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72" />)}</div>}>
        {q.data && q.data.length === 0 ? (
          <EmptyState title="Your wishlist is empty" message="Tap the heart on any course to save it here." action={<ButtonLink to="/courses">Find courses</ButtonLink>} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {q.data?.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} wished
                onToggleWishlist={() => toggle.mutate({ id: c.id, wished: true }, { onSuccess: () => { toast.success('Removed from wishlist'); void q.refetch(); }, onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not update wishlist') })} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  );
}
