import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { ApiError, get, post } from '../services/api';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await get<{ user: User }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
  const setUser = useCallback((u: User | null) => qc.setQueryData(['me'], u), [qc]);
  const logout = useCallback(async () => {
    try {
      await post('/auth/logout');
    } finally {
      qc.clear();
      qc.setQueryData(['me'], null);
    }
  }, [qc]);
  const value = useMemo(() => ({ user: q.data ?? null, loading: q.isLoading, setUser, logout }), [q.data, q.isLoading, setUser, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
