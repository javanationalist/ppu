import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  isLoggingOut: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        const prof = data as Profile;
        if (prof.is_deleted) {
          console.warn('Soft-deleted voter account tried to login: signing out');
          await supabase.auth.signOut();
          setProfile(null);
        } else {
          setProfile(prof);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during signOut:', err);
    } finally {
      localStorage.removeItem('session_expires_at');
      localStorage.removeItem('lastActivity');
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    // Activity tracking & session expiration updating
    const updateActivity = () => {
      const activeSession = localStorage.getItem('session_expires_at');
      if (activeSession) {
        // Refresh session expiration to 1 hour from now due to user activity
        localStorage.setItem('session_expires_at', (Date.now() + 60 * 60 * 1000).toString());
        localStorage.setItem('lastActivity', Date.now().toString());
      }
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Initial check on mount
    const checkSessionValidity = () => {
      const sessionExpiresAt = localStorage.getItem('session_expires_at');
      if (sessionExpiresAt && Date.now() > parseInt(sessionExpiresAt)) {
        // Session expired! Clear mock storage and perform clean signOut
        localStorage.removeItem('session_expires_at');
        localStorage.removeItem('lastActivity');
        supabase.auth.signOut();
        return false; // Invalid/Expired
      }
      return true; // Valid or no session
    };

    const isSessionValid = checkSessionValidity();

    // Inactivity / session tracking checker interval (runs every 5 seconds)
    const interval = setInterval(() => {
      const sessionExpiresAt = localStorage.getItem('session_expires_at');
      if (sessionExpiresAt && Date.now() > parseInt(sessionExpiresAt)) {
        signOut();
      }
    }, 5000);

    if (!isSessionValid) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    } else {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        // Double check expiration timestamp again
        const expiry = localStorage.getItem('session_expires_at');
        if (expiry && Date.now() > parseInt(expiry)) {
          signOut();
          return;
        }

        if (currentSession) {
          // If a session exists, and we don't have session_expires_at, set it now
          if (!localStorage.getItem('session_expires_at')) {
            localStorage.setItem('session_expires_at', (Date.now() + 60 * 60 * 1000).toString());
            localStorage.setItem('lastActivity', Date.now().toString());
          }
          setSession(currentSession);
          setUser(currentSession.user);
          fetchProfile(currentSession.user.id);
        } else {
          setLoading(false);
        }
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (_event === 'SIGNED_IN' && currentSession) {
        localStorage.setItem('session_expires_at', (Date.now() + 60 * 60 * 1000).toString());
        localStorage.setItem('lastActivity', Date.now().toString());
      }

      const expiry = localStorage.getItem('session_expires_at');
      if (expiry && Date.now() > parseInt(expiry)) {
        signOut();
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(interval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, isLoggingOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
