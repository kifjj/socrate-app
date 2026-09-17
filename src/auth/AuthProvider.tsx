import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ALLOWLIST_EMAILS = new Set(['aldojj@gmail.com']);

export type AuthState =
  | { status: 'signed_out'; error?: string }
  | { status: 'loading' }
  | { status: 'denied'; email?: string }
  | { status: 'authorized'; userId: string; email: string };

type AuthContextValue = {
  auth: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const bootstrapped = useRef(false);
  const signingInRef = useRef(false);

  // Parse auth error from URL (OAuth cancel/fail)
  const bootstrapFromUrlError = (): string | undefined => {
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      return (
        search.get('error_description') ||
        search.get('error') ||
        hash.get('error_description') ||
        hash.get('error') ||
        undefined
      );
    } catch {
      return undefined;
    }
  };

  const allowlistCheck = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return ALLOWLIST_EMAILS.has(email.toLowerCase());
  };

  const gateFromSession = useCallback((session: import('@supabase/supabase-js').Session | null) => {
    if (bootstrapped.current) return;
    if (session?.user) {
      const email = session.user.email ?? undefined;
      if (allowlistCheck(email)) {
        setAuth({ status: 'authorized', userId: session.user.id, email: email! });
      } else {
        setAuth({ status: 'denied', email });
      }
    } else {
      const err = bootstrapFromUrlError();
      setAuth({ status: 'signed_out', error: err });
    }
    bootstrapped.current = true;
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    // 1) Try current session immediately
    void supabase.auth.getSession().then(({ data }) => {
      gateFromSession(data.session);
    });
    // 2) Also listen for first auth event (e.g., after redirect)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only use the very first event to complete bootstrap; ignore future changes
      gateFromSession(session);
    });
    unsub = () => {
      sub.subscription.unsubscribe();
    };
    return () => {
      unsub?.();
    };
  }, [gateFromSession]);

  const signInWithGoogle = useCallback(async () => {
    if (signingInRef.current) return;
    signingInRef.current = true;
    try {
      setAuth({ status: 'loading' });
      // Redirect back to current origin
      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      });
      if (error) {
        setAuth({ status: 'signed_out', error: 'Sign-in didn’t complete. Try again.' });
      } else {
        // We expect a redirect; keep loading state until then
        setAuth({ status: 'loading' });
      }
    } finally {
      signingInRef.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Return to signed-out screen; do not auto-re-evaluate allowlist until reload
    setAuth({ status: 'signed_out' });
  }, []);

  const value: AuthContextValue = {
    auth,
    signInWithGoogle,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

