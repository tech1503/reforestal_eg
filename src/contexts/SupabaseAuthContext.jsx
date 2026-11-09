// @refresh reset
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { processReferralOnSignup } from '@/services/referralService'; 

const AuthContext = createContext(undefined);

// Normaliza roles SaaS: legacy startnext_user → user_basic
// Roles validos: user_basic, user_premium, admin, vorstand
export const normalizeRole = (rawRole) => {
  if (!rawRole) return 'user_basic';
  const normalized = rawRole.toLowerCase().trim();
  if (normalized === 'startnext_user' || normalized === 'user') return 'user_basic';
  if (normalized === 'user_premium') return 'user_premium';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'vorstand') return 'vorstand';
  return normalized || 'user_basic';
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  
  const mounted = useRef(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          users_roles (role_id, roles ( name ))
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Normalizar rol: startnext_user → user_basic, mantener roles SaaS
      let rawRole = data.role || 'user';
      if (data.users_roles?.[0]?.roles) {
          rawRole = data.users_roles[0].roles.name;
      }

      const effectiveRole = normalizeRole(rawRole);
      const fullProfile = {
        ...data,
        role: effectiveRole,
        legacyRole: rawRole !== effectiveRole ? rawRole : null,
      };
      
      if (mounted.current) {
        setProfile(fullProfile);
      }
      return fullProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setSession(null);
    navigate('/auth');
  }, [navigate]);

  const handleAuthRedirect = useCallback((userRole) => {
    const normalized = normalizeRole(userRole);
    if (normalized === 'admin' || normalized === 'vorstand') navigate('/admin');
    else if (normalized === 'user_premium') navigate('/premium-dashboard');
    else navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (mounted.current) {
        setSession(currentSession);
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (mounted.current) {
        setSession(currentSession);
        
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (event === 'SIGNED_IN' && currentSession) {
          
          // LÓGICA DE REFERIDOS BLINDADA
          const storedRef = localStorage.getItem('reforestal_ref');
          if (storedRef) {

              localStorage.removeItem('reforestal_ref');
              processReferralOnSignup(currentSession.user.id, storedRef)
                  .catch(err => console.error("Referral error:", err));
          }

          const pendingGoogleNickname = localStorage.getItem('pending_google_nickname');
          if (pendingGoogleNickname) {
              localStorage.removeItem('pending_google_nickname');
              try {
                  await supabase.rpc('set_google_nickname', { new_nickname: pendingGoogleNickname });
              } catch(e) {
                  console.error("Error setting Google nickname", e);
              }
          }

          await fetchProfile(currentSession.user.id);
        }
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsPasswordRecovery(false);
        }
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]); 

  const signUp = useCallback(async (email, password, displayName, nickname) => {
    const { data, error } = await supabase.auth.signUp({ 
      email: email, 
      password: password, 
      options: { 
        data: { 
          name: displayName,       
          referral_code: nickname   
        },
        emailRedirectTo: `${window.location.origin}/auth`
      } 
    });
    if (error) throw error;
    return data;
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    isPasswordRecovery,
    signIn,
    signOut,
    handleAuthRedirect,
    fetchProfile, 
    signUp, 
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth` }
    }),
    updatePassword: (p) => supabase.auth.updateUser({ password: p }),
    sendPasswordResetEmail: (e) => supabase.auth.resetPasswordForEmail(e, { 
      redirectTo: `${window.location.origin}/update-password` 
    })
  }), [session, profile, loading, isPasswordRecovery, signOut, handleAuthRedirect, fetchProfile, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};