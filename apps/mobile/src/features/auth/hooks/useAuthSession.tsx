import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { normalizeEmail } from '../services';

type AuthStatus = 'unauthenticated' | 'pending_verification' | 'authenticated';

type AuthUser = {
  name: string;
  email: string;
  role: string;
};

type SignUpInput = {
  name: string;
  email: string;
};

type AuthSessionContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  pendingEmail: string | null;
  signIn: (email: string) => void;
  signUp: (input: SignUpInput) => void;
  requestPasswordReset: (email: string) => void;
  verifyCode: (code: string) => void;
  signOut: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function buildMockUser(email: string, name?: string): AuthUser {
  return {
    email: normalizeEmail(email),
    name: name?.trim() || email.split('@')[0] || 'Ultron User',
    role: 'Owner',
  };
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      status: user ? 'authenticated' : pendingUser ? 'pending_verification' : 'unauthenticated',
      user,
      pendingEmail: pendingUser?.email ?? null,
      signIn: (email) => {
        setPendingUser(null);
        setUser(buildMockUser(email));
      },
      signUp: (input) => {
        setUser(null);
        setPendingUser(buildMockUser(input.email, input.name));
      },
      requestPasswordReset: (email) => {
        setUser(null);
        setPendingUser(buildMockUser(email));
      },
      verifyCode: () => {
        setUser((current) => current ?? pendingUser ?? buildMockUser('owner@ultron.local'));
        setPendingUser(null);
      },
      signOut: () => {
        setUser(null);
        setPendingUser(null);
      },
    }),
    [pendingUser, user],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider');
  }
  return context;
}
