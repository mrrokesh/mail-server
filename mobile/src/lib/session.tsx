import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  requestPasswordReset as requestPasswordResetCall,
  signInRequest,
  signOutRequest,
  signUpRequest,
  verifyMfaRequest,
} from '../features/auth/api';
import { ApiClientError } from './api';
import {
  clearStoredSession,
  onStoredSessionCleared,
  readStoredSession,
  writeStoredSession,
} from './secure-session';

export type SessionStatus = 'loading' | 'signedOut' | 'preview' | 'signedIn';

type SessionValue = {
  status: SessionStatus;
  email: string | null;
  challengeReady: boolean;
  signIn: (input: { email: string; password: string }) => Promise<'ok' | 'mfa'>;
  verifyMfa: (code: string) => Promise<void>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<'signed-in' | 'created'>;
  requestPasswordReset: (email: string) => Promise<void>;
  enterPreview: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

let challengeToken: string | null = null;
let pendingEmail: string | null = null;

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [challengeReady, setChallengeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onStoredSessionCleared(() => {
      if (cancelled) return;
      challengeToken = null;
      pendingEmail = null;
      setChallengeReady(false);
      setEmail(null);
      setStatus('signedOut');
      queryClient.clear();
    });

    void (async () => {
      const stored = await readStoredSession();
      if (cancelled) return;
      if (!stored || (stored.mode === 'preview' && !__DEV__)) {
        if (stored) await clearStoredSession();
        else setStatus('signedOut');
        return;
      }
      setEmail(stored.email);
      setStatus(stored.mode === 'preview' ? 'preview' : 'signedIn');
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    const result = await signInRequest({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (result.kind === 'mfa') {
      challengeToken = result.challengeToken;
      pendingEmail = input.email.trim().toLowerCase();
      setChallengeReady(true);
      return 'mfa' as const;
    }
    const account = input.email.trim().toLowerCase();
    await writeStoredSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      mode: 'live',
      email: account,
    });
    setEmail(account);
    setStatus('signedIn');
    return 'ok' as const;
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    if (!challengeToken) {
      throw new ApiClientError(401, null, 'Sign in again, then enter the code.');
    }
    const result = await verifyMfaRequest({ challengeToken, code });
    const account = pendingEmail;
    await writeStoredSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      mode: 'live',
      email: account,
    });
    challengeToken = null;
    pendingEmail = null;
    setChallengeReady(false);
    setEmail(account);
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(async (input: { name: string; email: string; password: string }) => {
    const account = input.email.trim().toLowerCase();
    const result = await signUpRequest({
      name: input.name.trim(),
      email: account,
      password: input.password,
    });
    if (result.kind === 'created') return 'created' as const;
    await writeStoredSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      mode: 'live',
      email: account,
    });
    setEmail(account);
    setStatus('signedIn');
    return 'signed-in' as const;
  }, []);

  const requestPasswordReset = useCallback(async (account: string) => {
    await requestPasswordResetCall(account.trim().toLowerCase());
  }, []);

  const enterPreview = useCallback(async () => {
    if (!__DEV__) return;
    challengeToken = null;
    pendingEmail = null;
    setChallengeReady(false);
    await writeStoredSession({
      accessToken: 'preview',
      refreshToken: 'preview',
      mode: 'preview',
      email: null,
    });
    setEmail(null);
    setStatus('preview');
  }, []);

  const signOut = useCallback(async () => {
    const current = await readStoredSession();
    if (current?.mode === 'live') {
      try {
        await signOutRequest(current.refreshToken);
      } catch {
        // Drop the device tokens even when the API is offline.
      }
    }
    challengeToken = null;
    pendingEmail = null;
    await clearStoredSession();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      email,
      challengeReady,
      signIn,
      verifyMfa,
      signUp,
      requestPasswordReset,
      enterPreview,
      signOut,
    }),
    [
      status,
      email,
      challengeReady,
      signIn,
      verifyMfa,
      signUp,
      requestPasswordReset,
      enterPreview,
      signOut,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within SessionProvider.');
  }
  return value;
}
