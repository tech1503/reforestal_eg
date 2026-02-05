
import { useToast } from '@/components/ui/use-toast';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  
  const mounted = useRef(true);

  // --- Profile Fetching ---
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            users_roles (
                role_id,
                roles ( name )
            )
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return null;

      let effectiveRole = data.role || 'user';
      if (data.users_roles?.[0]?.roles) {
          effectiveRole = data.users_roles[0].roles.name;
      }
      
      const fullProfile = { ...data, role: effectiveRole };
      
      // Update state if it's the current user
      if (mounted.current && session?.user?.id === userId) {
        setProfile(fullProfile);
      }

      return fullProfile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, [session]);

  // --- Intelligent Redirect ---
  const handleAuthRedirect = useCallback(async (forcedRole = null) => {
    let role = forcedRole;
    
    if (!role) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/auth');
            return;
        }
        const fetchedProfile = await fetchProfile(user.id);
        role = fetchedProfile?.role || 'user';
    }

    if (location.state?.from?.pathname && !location.pathname.includes('update-password')) {
        navigate(location.state.from.pathname, { replace: true });
        return;
    }

    const paths = { admin: '/admin', startnext_user: '/startnext' };
    navigate(paths[role] || '/dashboard', { replace: true });
  }, [navigate, location, fetchProfile]);

  // --- Auth Actions ---
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data?.user) {
      const userProfile = await fetchProfile(data.user.id);
      setProfile(userProfile);
      handleAuthRedirect(userProfile?.role || 'user');
    }
    return { data, error };
  }, [fetchProfile, handleAuthRedirect]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    navigate('/auth');
  }, [navigate]);

  // --- Initialization & Realtime ---
  useEffect(() => {
    mounted.current = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted.current) {
          setSession(initialSession);
          if (initialSession?.user) {
            const p = await fetchProfile(initialSession.user.id);
            setProfile(p);
          }
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted.current) return;
      
      console.log(`Auth event: ${event}`);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setLoading(false);
      } else if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
        setSession(currentSession);
        if (currentSession?.user) {
          const p = await fetchProfile(currentSession.user.id);
          setProfile(p);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []); // Removing fetchProfile from dependency array to avoid loops, as it is stable via useCallback

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    isPasswordRecovery,
    signIn,
    signOut,
    handleAuthRedirect,
    fetchProfile, // Exposed for external syncing hooks
    signUp: async (e, p, n) => supabase.auth.signUp({ email: e, password: p, options: { data: { full_name: n } } }),
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google' }),
    updatePassword: (p) => supabase.auth.updateUser({ password: p }),
    sendPasswordResetEmail: (e) => supabase.auth.resetPasswordForEmail(e, { redirectTo: `${window.location.origin}/update-password` })
  }), [session, profile, loading, isPasswordRecovery, signIn, signOut, handleAuthRedirect, fetchProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
