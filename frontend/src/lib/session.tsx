import type { PlanTier } from '@mrrokesh/shared';
import { PLAN_TIERS } from '@mrrokesh/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { readToken, resetApiCache, writeToken } from './api';

const USER_KEY = 'mrrokesh.user';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  plan: PlanTier;
  role: string;
  preview: boolean;
}

interface SessionValue {
  user: SessionUser | null;
  signIn: (user: SessionUser, accessToken: string | null) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function readStoredUser(): SessionUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed || typeof parsed.email !== 'string') return null;
    if (!(PLAN_TIERS as readonly string[]).includes(parsed.plan)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(readStoredUser);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      signIn: (next, accessToken) => {
        writeToken(accessToken);
        sessionStorage.setItem(USER_KEY, JSON.stringify(next));
        setUser(next);
      },
      signOut: () => {
        const token = readToken();
        if (token) {
          void fetch('/api/v1/auth/logout', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
          }).catch(() => undefined);
        }
        writeToken(null);
        sessionStorage.removeItem(USER_KEY);
        resetApiCache();
        queryClient.clear();
        setUser(null);
      },
    }),
    [queryClient, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider missing');
  return value;
}
