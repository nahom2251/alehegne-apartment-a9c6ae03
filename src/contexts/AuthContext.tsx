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
  isTenant: boolean;
  isApproved: boolean;
  mustChangePassword: boolean;
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
  isTenant: false,
  isApproved: false,
  mustChangePassword: false,
  signIn: async () => ({ error: new Error('Auth provider not ready') }),
  signUp: async () => ({ error: new Error('Auth provider not ready') }),
  signOut: async () => {},
  refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const [{ data: profileData }, { data: rolesData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);

      setProfile(profileData ? (profileData as Profile) : null);
      setRoles(rolesData ? rolesData.map((r: UserRole) => r.role) : []);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let initialLoad = true;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
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
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fire and forget — profile loading is tracked separately
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
        // Only set loading false here if getSession already finished
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
  };

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = isSuperAdmin || roles.includes('admin');
  const isTenant = roles.includes('tenant');
  const isApproved = profile?.status === 'approved';
  const mustChangePassword = !!profile?.must_change_password;

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, loading: loading || profileLoading,
      isSuperAdmin, isAdmin, isTenant, isApproved, mustChangePassword,
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
