import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'pending' | 'approved' | 'rejected';
  language: string;
  must_change_password?: boolean;
}

interface UserRole {
  role: 'super_admin' | 'admin' | 'user' | 'tenant';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const fallbackAuthContext: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  roles: [],
  loading: true,
  isSuperAdmin: false,
  isAdmin: false,
  isApproved: false,
  signIn: async () => ({ error: new Error('Auth provider not ready') }),
  signUp: async () => ({ error: new Error('Auth provider not ready') }),
  signOut: async () => {},
  refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = 'as_apt_auth_cache_v1';

type AuthCache = {
  userId: string;
  profile: Profile | null;
  roles: string[];
};

const readAuthCache = (): AuthCache | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthCache) : null;
  } catch {
    return null;
  }
};

const writeAuthCache = (cache: AuthCache | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (cache) localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    else localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // ignore
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = typeof window !== 'undefined' ? readAuthCache() : null;
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Cached profile/roles are only trusted once the real session confirms the
  // userId matches. Until then we keep them as a hint but they may be cleared.
  const [profile, setProfile] = useState<Profile | null>(cached?.profile ?? null);
  const [roles, setRoles] = useState<string[]>(cached?.roles ?? []);
  // Always start with loading=true until supabase.auth.getSession() resolves.
  // Otherwise route guards see user=null and redirect to /login before the
  // session restores, causing a flicker/redirect away from deep links.
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const [{ data: profileData }, { data: rolesData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      const nextProfile = profileData ? (profileData as Profile) : null;
      const nextRoles = rolesData ? rolesData.map((r: UserRole) => r.role) : [];
      setProfile(nextProfile);
      setRoles(nextRoles);
      writeAuthCache({ userId, profile: nextProfile, roles: nextRoles });
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let initialLoad = true;
    let lastFetchedUserId: string | null = null;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Drop stale cache if it belonged to a different user
        if (cached && cached.userId !== session.user.id) {
          setProfile(null);
          setRoles([]);
          writeAuthCache(null);
        }
        lastFetchedUserId = session.user.id;
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
        writeAuthCache(null);
      }
      setLoading(false);
      initialLoad = false;
    };

    initializeAuth().catch(() => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
      setLoading(false);
      initialLoad = false;
    });

    // onAuthStateChange fires for subsequent events (sign-in/out)
    // Do NOT await inside this callback — it can deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Only refetch profile when identity actually changes or on explicit
          // sign-in / user-update events. Skips routine TOKEN_REFRESHED (~hourly)
          // and INITIAL_SESSION (handled by initializeAuth).
          const userChanged = lastFetchedUserId !== session.user.id;
          const shouldFetch =
            userChanged ||
            event === 'SIGNED_IN' ||
            event === 'USER_UPDATED' ||
            event === 'PASSWORD_RECOVERY';
          if (shouldFetch) {
            lastFetchedUserId = session.user.id;
            fetchProfile(session.user.id);
          }
        } else {
          lastFetchedUserId = null;
          setProfile(null);
          setRoles([]);
          writeAuthCache(null);
        }
        if (!initialLoad) {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    writeAuthCache(null);
  };

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = isSuperAdmin || roles.includes('admin');
  const isApproved = profile?.status === 'approved';

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, loading,
      isSuperAdmin, isAdmin, isApproved,
      signIn, signUp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context ?? fallbackAuthContext;
};
