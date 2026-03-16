import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock, User, Leaf, ArrowRight, Home, CheckCircle2, AlertCircle } from 'lucide-react';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'; 
import heroImg1 from '@/assets/hero-home-reforestal.webp';
import { useNavigate } from 'react-router-dom'; 
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { supabase } from '@/lib/customSupabaseClient';

const AuthScreen = () => {
  const { signIn, signUp, signInWithGoogle, user, profile, handleAuthRedirect } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // States del Formulario Principal
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  // States del Pop-up de Google
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleNickname, setGoogleNickname] = useState('');
  const [googleNicknameError, setGoogleNicknameError] = useState('');
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(false);

  const IMAGES = { background: heroImg1 };

  useEffect(() => {
    if (user && profile) {
      handleAuthRedirect(profile.role);
    }
  }, [user, profile, handleAuthRedirect]);

  // Validador de Apodo Genérico
  const validateAndSetNickname = async (val, setNickFn, setErrorFn, setCheckingFn) => {
    const cleanVal = val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    setNickFn(cleanVal);
    
    if (cleanVal.length < 3) {
      setErrorFn(cleanVal.length > 0 ? t('auth.nickname_short', 'Minimum 3 characters') : '');
      return;
    }

    setCheckingFn(true);
    try {
      const { data, error } = await supabase.rpc('is_username_available', { username_to_check: cleanVal });
      if (error) throw error;
      setErrorFn(data ? '' : t('auth.nickname_taken', 'This nickname is already in use.'));
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingFn(false);
    }
  };

  const handleNicknameChange = (val) => validateAndSetNickname(val, setNickname, setNicknameError, setIsCheckingNickname);
  const handleGoogleNicknameChange = (val) => validateAndSetNickname(val, setGoogleNickname, setGoogleNicknameError, setIsCheckingGoogle);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && (nicknameError || nickname.length < 3)) {
        toast({ variant: "destructive", title: t('auth.error'), description: t('auth.fix_nickname', 'Please choose a valid nickname.') });
        return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: t('auth.welcome'), description: "Successfully signed in." });
      } else {
        const { data, error } = await signUp(email, password, name, nickname);
        if (error) throw error;
        if (data?.session) {
            toast({ title: t('auth.account_created', "Account created!"), description: t('auth.welcome', "Welcome!") });
        } else {
            toast({ title: t('auth.account_created', "Account created!"), description: t('auth.check_email', "Please check your email.") });
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Authentication failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE GOOGLE CON MODAL ---
  const triggerGoogleLogin = () => {
      if (isLogin) {
          handleGoogleAuthAction();
      } else {
          setShowGoogleModal(true);
      }
  };

  const handleGoogleAuthAction = async () => {
    try {
        const { error } = await signInWithGoogle();
        if (error) throw error;
    } catch (error) {
        toast({ variant: "destructive", title: "Google Login Failed", description: error.message });
    }
  };

  const submitGoogleNickname = () => {
      if (googleNicknameError || googleNickname.length < 3) {
          toast({ variant: "destructive", title: t('auth.error', 'Error'), description: t('auth.fix_nickname', 'Please choose a valid nickname before continuing.') });
          return;
      }
      localStorage.setItem('pending_google_nickname', googleNickname);
      setShowGoogleModal(false);
      handleGoogleAuthAction();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 overflow-x-hidden relative">
      <div className="absolute top-4 left-4 z-50">
        <Button onClick={() => navigate('/')} variant="secondary" size="sm" className="bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full shadow-sm text-slate-700 h-10 px-4 gap-2 border-0">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">{t('navigation.home', 'Home')}</span>
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
         <ThemeSwitcher className="bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full shadow-sm text-slate-700 h-10 w-10 border-0" />
         <LanguageSwitcher className="bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full shadow-sm text-slate-700 h-10 w-auto px-3" />
      </div>

      <div className="w-full md:w-1/2 order-1 md:order-2 relative bg-slate-900 flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden min-h-[60vh] md:min-h-screen">
         <div className="absolute inset-0 bg-gradient-to-br from-[#063127] via-[#04241d] to-black opacity-90 z-10"></div>
         <img className="absolute inset-0 w-full h-full object-cover z-0" alt="Forest" src={IMAGES.background} />
         <div className="relative z-20 max-w-lg space-y-6">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
                <h1 className="text-4xl lg:text-5xl font-bold text-[#c4d1c0] leading-tight whitespace-pre-line drop-shadow-md">{t('auth.branding.title')}</h1>
            </motion.div>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }} className="text-lg text-slate-300">{t('auth.branding.description')}</motion.p>
         </div>
      </div>

      <div className="w-full md:w-1/2 order-2 md:order-1 flex items-center justify-center p-6 md:p-12 min-h-[50vh] md:min-h-screen bg-slate-50">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                 <div className="w-10 h-10 bg-gradient-to-br from-[#063127] to-[#5b8370] rounded-xl flex items-center justify-center text-[#c4d1c0] shadow-md"><Leaf className="w-6 h-6" /></div>
                 <span className="text-2xl font-bold text-[#063127] tracking-tight">Reforestal eG</span>
              </div>
              <h2 className="text-3xl font-bold text-[#063127]">{isLogin ? t('auth.welcome') : t('auth.create_account')}</h2>
              <p className="text-slate-500">{isLogin ? t('auth.sign_in_prompt') : t('auth.sign_up_prompt')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                 
                 {!isLogin && (
                   <>
                    <div className="space-y-2">
                       <Label className="text-[#063127]">{t('auth.name_label')}</Label>
                       <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input type="text" placeholder="John Doe" className="pl-9 h-11 focus-visible:ring-[#5b8370]" value={name} onChange={(e) => setName(e.target.value)} required={!isLogin} />
                       </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[#063127] flex justify-between items-center">
                           {t('auth.nickname_label', 'Your Unique Nickname (URL)')}
                           {isCheckingNickname && <Loader2 className="w-3 h-3 animate-spin text-[#5b8370]" />}
                        </Label>
                        <div className="relative">
                           <span className="absolute left-3 top-3 text-slate-400 text-sm font-bold z-10">@</span>
                           <Input 
                              type="text" placeholder="e.g., john123" 
                              className={`pl-8 h-11 focus-visible:ring-[#5b8370] ${nicknameError ? 'border-red-500' : (nickname.length > 2 && !isCheckingNickname ? 'border-emerald-500' : '')}`}
                              value={nickname} onChange={(e) => handleNicknameChange(e.target.value)} required={!isLogin} 
                           />
                           {nickname.length > 2 && !nicknameError && !isCheckingNickname && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />}
                           {nicknameError && <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-500" />}
                        </div>
                        {nicknameError ? <p className="text-[10px] text-red-500 font-bold mt-1">{nicknameError}</p> : nickname.length > 0 ? <p className="text-[10px] text-slate-400 font-medium mt-1">{t('auth.google_modal.your_link', 'Your link will be:')} <span className="text-[#5b8370]">reforest.al/{nickname}</span></p> : null}
                    </div>
                   </>
                 )}

                 <div className="space-y-2">
                    <Label className="text-[#063127]">{t('auth.email_label')}</Label>
                    <div className="relative">
                       <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                       <Input type="email" placeholder="name@example.com" className="pl-9 h-11 focus-visible:ring-[#5b8370]" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <Label className="text-[#063127]">{t('auth.password_label')}</Label>
                       {isLogin && <button type="button" onClick={() => setShowForgotModal(true)} className="text-xs text-[#5b8370] hover:text-[#063127] hover:underline font-bold transition-colors">{t('auth.forgot_password')}</button>}
                    </div>
                    <div className="relative">
                       <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                       <Input type="password" placeholder="••••••••" className="pl-9 h-11 focus-visible:ring-[#5b8370]" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                 </div>

                 <Button type="submit" disabled={loading || (!isLogin && !!nicknameError)} className="w-full h-12 mt-2">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : (isLogin ? t('auth.sign_in') : t('auth.sign_up'))}
                    {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                 </Button>

                 <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-xs uppercase font-bold"><span className="bg-white px-2 text-slate-400">Or continue with</span></div>
                 </div>

                 <Button type="button" variant="outline" onClick={triggerGoogleLogin} className="w-full h-11 border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                 </Button>
              </form>

              <div className="mt-6 text-center">
                 <p className="text-slate-600 text-sm">
                    {isLogin ? t('auth.no_account') : t('auth.has_account')}
                    <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-[#5b8370] font-bold hover:text-[#063127] hover:underline transition-colors">
                       {isLogin ? t('auth.sign_up') : t('auth.sign_in')}
                    </button>
                 </p>
              </div>
          </div>
        </motion.div>
      </div>

      <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />

      <Dialog open={showGoogleModal} onOpenChange={setShowGoogleModal}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#063127] flex items-center gap-2">
                    {t('auth.google_modal.title', 'Almost there! 🚀')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 pt-2">
                    {t('auth.google_modal.desc', 'Before going to Google, choose how you want your unique referral link to look.')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                 <div className="space-y-2">
                    <Label className="text-[#063127] font-semibold flex justify-between items-center">
                       {t('auth.nickname_label', 'Your Unique Nickname (URL)')}
                       {isCheckingGoogle && <Loader2 className="w-3 h-3 animate-spin text-[#5b8370]" />}
                    </Label>
                    <div className="relative">
                       <span className="absolute left-3 top-3 text-slate-400 text-sm font-bold z-10">@</span>
                       <Input 
                          type="text" placeholder={t('auth.google_modal.placeholder', 'e.g., john123')}
                          className={`pl-8 h-12 focus-visible:ring-[#5b8370] bg-slate-50 ${googleNicknameError ? 'border-red-500' : (googleNickname.length > 2 && !isCheckingGoogle ? 'border-emerald-500' : '')}`}
                          value={googleNickname} onChange={(e) => handleGoogleNicknameChange(e.target.value)} 
                       />
                       {googleNickname.length > 2 && !googleNicknameError && !isCheckingGoogle && <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-emerald-500" />}
                    </div>
                    {googleNicknameError ? (
                        <p className="text-[11px] text-red-500 font-bold mt-1">{googleNicknameError}</p>
                    ) : googleNickname.length > 0 ? (
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          {t('auth.google_modal.your_link', 'Your link will be:')} <span className="text-[#5b8370] font-bold">reforest.al/{googleNickname}</span>
                        </p>
                    ) : null}
                 </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowGoogleModal(false)}>{t('common.cancel')}</Button>
                <Button onClick={submitGoogleNickname} disabled={isCheckingGoogle || googleNicknameError || googleNickname.length < 3} className="bg-[#063127] hover:bg-[#5b8370] text-white">
                    {t('auth.google_modal.continue_btn', 'Continue with Google')} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AuthScreen;