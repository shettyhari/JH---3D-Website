import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { ensureUserProfile } from '../services/storeService';
import { MemberProfile, UserProfileRecord } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfileRecord | null;
  member: MemberProfile | null;
  isAdmin: boolean;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (!user) {
        setProfile(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const synced = await ensureUserProfile({
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Member',
          email: user.email || '',
          photoURL: user.photoURL || '',
          emailVerified: user.emailVerified,
        });
        setProfile(synced.profile);
        setIsAdmin(synced.isAdmin);
      } catch (err) {
        console.error('Failed to sync user profile:', err);
        setAuthError('Signed in, but profile sync encountered an error.');
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      setProfile(null);
      setIsAdmin(false);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to sign out.',
      );
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const member: MemberProfile | null =
    profile && firebaseUser
      ? {
          uid: profile.uid,
          name: profile.name,
          email: profile.email,
          photoURL: profile.photoURL || firebaseUser.photoURL || undefined,
          tier: profile.tier,
          role: profile.role,
          status: profile.status,
          isAdmin,
        }
      : firebaseUser
        ? {
            uid: firebaseUser.uid,
            name:
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              'Member',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            tier: isAdmin ? 'Staff' : 'Studio Member',
            role: isAdmin ? 'admin' : 'customer',
            status: 'active',
            isAdmin,
          }
        : null;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        member,
        isAdmin,
        authReady,
        authLoading,
        authError,
        signInWithGoogle,
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
