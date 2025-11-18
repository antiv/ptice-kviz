import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthorized: boolean;
  unauthorizedMessage: string | null;
  userRole: string | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [unauthorizedMessage, setUnauthorizedMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkAuthorization = async (user: User | null) => {
    if (!user?.email) {
      setIsAuthorized(false);
      setUnauthorizedMessage(null);
      setUserRole(null);
      return;
    }

    try {
      // Dohvati korisnika sa ulogom iz baze
      const { data: allowedUser, error } = await supabase
        .from('allowed_users')
        .select('email, roles')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error fetching allowed user:', error);
        setIsAuthorized(false);
        setUnauthorizedMessage('Greška pri proveri autorizacije.');
        setUserRole(null);
        return;
      }

      if (allowedUser) {
        setIsAuthorized(true);
        setUnauthorizedMessage(null);
        setUserRole(allowedUser.roles || 'user');
      } else {
        setIsAuthorized(false);
        setUnauthorizedMessage(`Vaša email adresa (${user.email}) nije na listi dozvoljenih korisnika. Kontaktirajte administratora za pristup.`);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking authorization:', error);
      setIsAuthorized(false);
      setUnauthorizedMessage('Greška pri proveri autorizacije.');
      setUserRole(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAuthorization(session.user).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAuthorization(session.user).finally(() => {
          setLoading(false);
        });
      } else {
        setIsAuthorized(false);
        setUnauthorizedMessage(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + (window.location.pathname || '/'),
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsAuthorized(false);
      setUnauthorizedMessage(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
    isAuthorized,
    unauthorizedMessage,
    userRole,
    isAdmin: userRole === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
