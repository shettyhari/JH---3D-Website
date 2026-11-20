import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  DEFAULT_ADMIN_EMAIL,
  getStoreSnapshot,
  subscribeStore,
  upsertSignedInUser,
} from '../services/storeService';
import { MemberProfile, UserProfileRecord, UserRole } from '../types';

const STORAGE_SESSION_KEY = 'jhonty_hub_session_uid_v1';

interface AuthContextValue {
  currentUser: UserProfileRecord | null;
  member: MemberProfile | null;
  isAdmin: boolean;
  signIn: (params: { name: string; email: string; role?: UserRole }) => void;
  signInAsAdmin: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveInitialUid(): string | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_SESSION_KEY);
    if (saved === '__signed_out__') return null;
    if (saved) return saved;
  } catch {
    // Ignore storage errors
  }
  const snapshot = getStoreSnapshot();
  const defaultAdmin = snapshot.users.find(
    (u) => u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase(),
  );
  return defaultAdmin?.uid ?? snapshot.users[0]?.uid ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeUid, setActiveUid] = useState<string | null>(resolveInitialUid);
  const [users, setUsers] = useState<UserProfileRecord[]>(
    () => getStoreSnapshot().users,
  );

  useEffect(() => {
    return subscribeStore((state) => {
      setUsers(state.users);
    });
  }, []);

  const currentUser = activeUid
    ? users.find((u) => u.uid === activeUid) ?? null
    : null;

  const isAdmin =
    Boolean(currentUser) &&
    currentUser?.status === 'active' &&
    (currentUser?.role === 'admin' || currentUser?.role === 'manager');

  const signIn = useCallback(
    (params: { name: string; email: string; role?: UserRole }) => {
      const record = upsertSignedInUser(params);
      setActiveUid(record.uid);
      try {
        window.localStorage.setItem(STORAGE_SESSION_KEY, record.uid);
      } catch {
        // Ignore storage errors
      }
    },
    [],
  );

  const signInAsAdmin = useCallback(() => {
    const snapshot = getStoreSnapshot();
    const existingAdmin =
      snapshot.users.find(
        (u) =>
          u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
          u.status === 'active',
      ) ?? snapshot.users.find((u) => u.role === 'admin' && u.status === 'active');

    if (existingAdmin) {
      setActiveUid(existingAdmin.uid);
      try {
        window.localStorage.setItem(STORAGE_SESSION_KEY, existingAdmin.uid);
      } catch {
        // Ignore storage errors
      }
      return;
    }

    const created = upsertSignedInUser({
      name: 'Studio Admin',
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
    });
    setActiveUid(created.uid);
    try {
      window.localStorage.setItem(STORAGE_SESSION_KEY, created.uid);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const signOut = useCallback(() => {
    setActiveUid(null);
    try {
      window.localStorage.setItem(STORAGE_SESSION_KEY, '__signed_out__');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const member: MemberProfile | null = currentUser
    ? {
        uid: currentUser.uid,
        name: currentUser.name,
        email: currentUser.email,
        photoURL: currentUser.photoURL || undefined,
        tier: currentUser.tier,
        role: currentUser.role,
        status: currentUser.status,
        isAdmin,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        member,
        isAdmin,
        signIn,
        signInAsAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
