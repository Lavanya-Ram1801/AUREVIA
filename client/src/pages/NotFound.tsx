import { ButtonLink } from '../components/ui';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-7xl font-extrabold text-violet">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page doesn't exist</h1>
      <p className="mt-2 max-w-md text-subtle">The link may be broken or the page may have been moved.</p>
      <div className="mt-6 flex gap-3"><ButtonLink to="/">Go home</ButtonLink><ButtonLink to="/courses" variant="secondary">Explore courses</ButtonLink></div>
    </div>
  );
}
