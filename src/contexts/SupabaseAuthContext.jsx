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

const profileNeedsNickname = (profileData) => {
  if (!profileData) return false;
  const role = normalizeRole(profileData.role);
  if (role === 'admin' || role === 'vorstand') return false;
  return !String(profileData.referral_code || '').trim();
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [needsNickname, setNeedsNickname] = useState(false);
  
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
    setNeedsNickname(false);
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
          const currentProfile = await fetchProfile(currentSession.user.id);
          if (mounted.current) {
            setNeedsNickname(profileNeedsNickname(currentProfile));
          }
        } else {
          setNeedsNickname(false);
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

          const metaNickname = currentSession.user.user_metadata?.referral_code;
          const pendingGoogleNickname = localStorage.getItem('pending_google_nickname');

          let refreshedProfile = await fetchProfile(currentSession.user.id);
          const hasStoredNickname = Boolean(String(refreshedProfile?.referral_code || '').trim());
          const nicknameToSet = pendingGoogleNickname || (hasStoredNickname ? null : metaNickname);

          if (nicknameToSet) {
              localStorage.removeItem('pending_google_nickname');
              try {
                  const cleanNickname = nicknameToSet.replace(/[^a-z0-9]/g, '').toLowerCase();
                  if (cleanNickname.length >= 3) {
                      await supabase.rpc('set_google_nickname', { new_nickname: cleanNickname });
                      refreshedProfile = await fetchProfile(currentSession.user.id);
                  }
              } catch(e) {
                  console.error("Error setting nickname", e);
              }
          }

          if (mounted.current) {
            setNeedsNickname(profileNeedsNickname(refreshedProfile));
          }
        }
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsPasswordRecovery(false);
          setNeedsNickname(false);
        }
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]); 

  const signUp = useCallback(async (email, password, displayName, nickname) => {
    const cleanNickname = (nickname || '').replace(/[^a-z0-9]/g, '').toLowerCase();

    const { data, error } = await supabase.auth.signUp({ 
      email: email, 
      password: password, 
      options: { 
        data: { 
          name: displayName,       
          referral_code: cleanNickname
        },
        emailRedirectTo: `${window.location.origin}/auth`
      } 
    });
    if (error) throw error;
    return data;
  }, []);

  const updateNickname = useCallback(async (newNickname) => {
    if (!session?.user?.id) throw new Error('NOT_AUTHENTICATED');

    const cleanNickname = (newNickname || '').replace(/[^a-z0-9]/g, '').toLowerCase();
    if (cleanNickname.length < 3) throw new Error('INVALID_NICKNAME');

    const { data: isAvailable, error: availabilityError } = await supabase.rpc(
      'is_username_available',
      { username_to_check: cleanNickname }
    );
    if (availabilityError) {
      console.warn('Nickname availability check failed:', availabilityError);
    } else if (!isAvailable) {
      throw new Error('NICKNAME_TAKEN');
    }

    const { error: updateError } = await supabase.rpc('set_google_nickname', {
      new_nickname: cleanNickname
    });
    if (updateError) throw updateError;

    const updatedProfile = await fetchProfile(session.user.id);
    if (updatedProfile) {
      if (profileNeedsNickname(updatedProfile)) {
        setNeedsNickname(true);
        throw new Error('NICKNAME_NOT_PERSISTED');
      }
      setNeedsNickname(false);
      return updatedProfile;
    }

    setProfile(prev => prev ? { ...prev, referral_code: cleanNickname } : prev);
    setNeedsNickname(false);
    return null;
  }, [session, fetchProfile]);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    isPasswordRecovery,
    needsNickname,
    signIn,
    signOut,
    handleAuthRedirect,
    fetchProfile, 
    signUp, 
    updateNickname,
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth` }
    }),
    updatePassword: (p) => supabase.auth.updateUser({ password: p }),
    sendPasswordResetEmail: (e) => supabase.auth.resetPasswordForEmail(e, { 
      redirectTo: `${window.location.origin}/update-password` 
    })
  }), [session, profile, loading, isPasswordRecovery, needsNickname, signOut, handleAuthRedirect, fetchProfile, signUp, updateNickname]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};