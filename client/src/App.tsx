import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppRoutes } from './routes';

export default function App() {
  const { pathname, hash } = useLocation();
  // Scroll to top on route change, or to the in-page anchor (e.g. /#features).
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return <AppRoutes />;
}
