import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Loader2, Lock, Shield, CheckCircle, Leaf, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const UpdatePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(); // HOOK
  
  // State initialization
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Loading & Safety States
  const [isLoading, setIsLoading] = useState(true); 
  const [showSecurityMessage, setShowSecurityMessage] = useState(false);
  const [sessionVerificationFailed, setSessionVerificationFailed] = useState(false);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // 1) Refactored Auth Check Effect with Immediate Verification & Race Condition Fix
  useEffect(() => {
    // Detect hash immediately
    const hash = window.location.hash;
    const hasAccessToken = hash && hash.includes('access_token');
    
    console.log("UpdatePassword mounted. Hash:", hash, "hasAccessToken:", hasAccessToken);

    let mounted = true;

    // 2. Immediate Session Check Function
    const checkSessionImmediately = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("Immediate session check:", session ? "Session exists" : "No session", "Error:", error);
        
        if (!mounted) return;

        if (session) {
          setIsLoading(false);
          return;
        }

        if (error) {
            console.error("Session check error:", error);
            if (error.message?.includes("invalid_grant") || error.message?.includes("token_expired")) {
                 toast({ variant: "destructive", description: t('common.error') }); // Fallback error
                 setTimeout(() => navigate('/auth'), 2000);
                 return;
            }
        }

        if (!hasAccessToken) {
          navigate('/auth');
          return;
        }
        
      } catch (err) {
        console.error("Session check unexpected error:", err);
        if (!hasAccessToken && mounted) {
          navigate('/auth');
        }
      }
    };

    checkSessionImmediately();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        if (!hasAccessToken) {
           navigate('/auth');
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate, toast, t]);

  useEffect(() => {
    if (!isLoading) return;
    const timeoutId = setTimeout(() => {
        setShowSecurityMessage(true);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) return;
    const timeoutId = setTimeout(() => {
      setSessionVerificationFailed(true);
      setIsLoading(false);
    }, 8000); 
    return () => clearTimeout(timeoutId);
  }, [isLoading]);


  const handleAuthRedirect = async () => {
    try {
      const currentPath = window.location.pathname;
      const languagePrefix = currentPath.startsWith('/es/') ? '/es' : 
                             currentPath.startsWith('/de/') ? '/de' : 
                             currentPath.startsWith('/fr/') ? '/fr' : '';
                             
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        navigate(languagePrefix + '/auth');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        navigate(languagePrefix + '/dashboard');
        return;
      }

      const role = profile.role;

      if (role === 'admin') {
        navigate(languagePrefix + '/admin');
      } else if (role === 'startnext_user') {
        navigate(languagePrefix + '/startnext');
      } else {
        navigate(languagePrefix + '/dashboard');
      }

    } catch (error) {
      navigate('/dashboard');
    }
  };

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: null }));
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: null }));
    if (errors.general) setErrors(prev => ({ ...prev, general: null }));
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrors({});

    let hasError = false;
    const newErrors = {};

    if (!newPassword) {
        newErrors.newPassword = t('common.error'); // Simplificado, idealmente usar claves específicas
        hasError = true;
    } else if (newPassword.length < 6) {
        newErrors.newPassword = "Min 6 chars"; // Fallback
        hasError = true;
    }

    if (!confirmPassword) {
        newErrors.confirmPassword = t('common.error');
        hasError = true;
    } else if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        hasError = true;
    }

    if (hasError) {
        setErrors(newErrors);
        return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session lost after password update");
      }

      setIsSuccess(true);
      toast({ 
          title: t('common.success'),
          description: "Password updated" 
      });
      
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => handleAuthRedirect(), 2000);

    } catch (error) {
      console.error("Password update error:", error);
      setIsLoading(false); 
      
      setErrors({ general: t('common.error') });
      toast({ 
          variant: "destructive", 
          title: t('common.error'), 
          description: error.message 
      });
    }
  };

  if (sessionVerificationFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
           <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
           </div>
           <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('common.error')}</h2>
              <p className="mt-2 text-slate-600">Session Verification Failed</p>
           </div>
           <Button 
             onClick={() => navigate('/auth')} 
             className="bg-[#055b4f] hover:bg-[#044a41] w-full"
           >
             {t('auth.sign_in')}
           </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <Loader2 className="h-10 w-10 animate-spin text-[#17a277]" />
          <p className="text-slate-600 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white overflow-hidden font-sans">
      <div className="w-full flex flex-col-reverse md:flex-row min-h-screen">
        
        {/* LEFT SIDE (Form) */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white relative order-2 md:order-1">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md space-y-8"
          >
             <div className="text-center md:text-left space-y-2">
                <div className="md:hidden flex justify-center mb-4">
                     <div className="w-12 h-12 bg-[#055b4f]/10 rounded-xl flex items-center justify-center">
                        <Leaf className="w-6 h-6 text-[#055b4f]" />
                     </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{t('auth.reset_password')}</h2>
                <p className="text-slate-500">{t('auth.reset_prompt')}</p>
             </div>

             <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 transition-all duration-300 hover:shadow-2xl">
                {isSuccess ? (
                   <motion.div 
                     initial={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="flex flex-col items-center justify-center space-y-6 py-8"
                   >
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                         <CheckCircle className="w-10 h-10 text-[#17a277]" />
                      </div>
                      <div className="text-center space-y-2">
                          <h3 className="text-xl font-bold text-slate-900">{t('common.success')}!</h3>
                          <p className="text-slate-500">Password updated.</p>
                      </div>
                      <div className="flex items-center text-sm text-[#17a277] font-medium bg-green-50 px-4 py-2 rounded-full">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Redirecting...
                      </div>
                   </motion.div>
                ) : (
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                      <div className="space-y-2">
                          <Label className="text-slate-700 font-medium text-sm">{t('auth.password_label')}</Label>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#17a277] transition-colors" />
                            <Input 
                                type="password" 
                                value={newPassword}
                                onChange={handleNewPasswordChange}
                                className={`pl-10 bg-slate-50 border-slate-300 focus:border-[#17a277] focus:ring-2 focus:ring-[#17a277]/20 h-11 transition-all duration-200 placeholder:text-slate-400 ${errors.newPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                placeholder="Min. 6 characters"
                                disabled={isLoading} 
                            />
                          </div>
                          {errors.newPassword && (
                              <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1">{errors.newPassword}</p>
                          )}
                      </div>

                      <div className="space-y-2">
                          <Label className="text-slate-700 font-medium text-sm">Confirm {t('auth.password_label')}</Label>
                          <div className="relative group">
                            <Shield className="absolute left-3 top-3 h-5 w-5 text-slate-400 group-focus-within:text-[#17a277] transition-colors" />
                            <Input 
                                type="password" 
                                value={confirmPassword}
                                onChange={handleConfirmPasswordChange}
                                className={`pl-10 bg-slate-50 border-slate-300 focus:border-[#17a277] focus:ring-2 focus:ring-[#17a277]/20 h-11 transition-all duration-200 placeholder:text-slate-400 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                placeholder="Re-enter password"
                                disabled={isLoading}
                            />
                          </div>
                          {errors.confirmPassword && (
                              <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1">{errors.confirmPassword}</p>
                          )}
                      </div>

                      {errors.general && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center animate-in shake">
                              <span className="mr-2">⚠️</span> {errors.general}
                          </div>
                      )}

                      <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-[#055b4f] to-[#17a277] text-white font-semibold h-12 rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                      >
                           {t('common.save')}
                      </Button>
                      
                      <div className="text-center pt-2">
                         <button 
                           type="button" 
                           onClick={() => navigate('/auth')}
                           className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                         >
                           {t('common.cancel')}
                         </button>
                      </div>
                  </form>
                )}
             </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE (Branding) */}
        <div className="w-full md:w-1/2 relative flex flex-col items-center justify-center p-12 md:p-16 text-center bg-gradient-to-br from-[#055b4f] via-[#17a277] to-[#82c6ba] overflow-hidden min-h-[40vh] md:min-h-screen order-1 md:order-2">
            <div 
                className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
                style={{ 
                    backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                    backgroundSize: '24px 24px' 
                }}
            ></div>
            <div className="absolute top-1/4 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -left-20 w-72 h-72 bg-[#055b4f]/30 rounded-full blur-3xl"></div>
            <div className="relative z-10 max-w-lg">
                <motion.div 
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ duration: 0.6, delay: 0.2 }}
                   className="mb-8 flex justify-center"
                >
                    <div className="w-20 h-20 md:w-28 md:h-28 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 ring-1 ring-white/10">
                        <Shield className="w-10 h-10 md:w-14 md:h-14 text-white/90 drop-shadow-md" />
                    </div>
                </motion.div>
                <motion.h1 
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ duration: 0.6, delay: 0.3 }}
                   className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-sm tracking-tight whitespace-pre-line"
                >
                   {t('auth.branding.title')}
                </motion.h1>
                <motion.p 
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ duration: 0.6, delay: 0.4 }}
                   className="text-white/90 text-lg md:text-xl leading-relaxed max-w-md mx-auto font-light"
                >
                   {t('auth.branding.description')}
                </motion.p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;
