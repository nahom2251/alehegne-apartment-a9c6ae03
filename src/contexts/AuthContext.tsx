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

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (profileData) {
      setProfile(profileData as Profile);
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (rolesData) {
      setRoles(rolesData.map((r: UserRole) => r.role));
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

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

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, loading,
      isSuperAdmin, isAdmin, isTenant, isApproved,
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
