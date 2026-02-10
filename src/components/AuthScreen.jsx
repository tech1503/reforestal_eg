import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock, User, Leaf, ArrowRight, Home } from 'lucide-react';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'; 
import heroImg1 from '@/assets/hero-home-reforestal.png';
import { useNavigate } from 'react-router-dom'; 
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { processReferralOnSignup } from '@/services/referralService'; 

const AuthScreen = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate(); // Hook para navegar

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // --- ASSETS CONFIGURATION ---
  const IMAGES = {
      background: heroImg1
  };

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: t('auth.welcome'), description: "Successfully signed in." });
        // NOTE: No need for navigate('/dashboard') here. 
        // The state change in Context will trigger the redirect in App.jsx automatically.
      } else {
        // REGISTRATION FLOW
        const { data, error } = await signUp(email, password, name);
        if (error) throw error;

        // --- REFERRAL LINKING LOGIC ---
        // If registration was successful, check for a stored referral code
        if (data?.user) {
            const storedRefCode = localStorage.getItem('reforestal_ref');
            
            if (storedRefCode) {
                // Execute referral processing in the background
                // This ensures the UI doesn't freeze while we award points
                processReferralOnSignup(data.user.id, storedRefCode)
                    .then(() => {
                        // Clear the code so it's not reused for another signup on this device
                        localStorage.removeItem('reforestal_ref');
                        console.log('Referral processed and storage cleared.');
                    })
                    .catch(err => {
                        console.error('Background referral processing failed:', err);
                    });
            }
        }
        // ------------------------------

        toast({ title: "Account created!", description: "Please check your email to confirm your account." });
      }
    } catch (error) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: isLogin ? "Login failed" : "Registration failed", 
        description: error.message || "An error occurred during authentication." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
        const { error } = await signInWithGoogle();
        if (error) throw error;
    } catch (error) {
        toast({ variant: "destructive", title: "Google Login Failed", description: error.message });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 overflow-x-hidden relative">
      
      {/* BOTÓN HOME (NUEVO - Izquierda Superior) */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
            onClick={() => navigate('/')} 
            variant="secondary"
            size="sm"
            className="bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full shadow-sm text-slate-700 h-10 px-4 gap-2 border-0"
        >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">{t('navigation.home', 'Home')}</span>
        </Button>
      </div>

      {/* LANGUAGE SELECTOR (Derecha Superior) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
         <ThemeSwitcher className="bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full shadow-sm text-slate-700 h-10 w-10 border-0" />
         <LanguageSwitcher className="bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full shadow-sm text-slate-700 h-10 w-auto px-3" />
      </div>

      {/* --- BRANDING SECTION (IMAGE) --- */}
      <div className="w-full md:w-1/2 order-1 md:order-2 relative bg-slate-900 flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden min-h-[60vh] md:min-h-screen">
         
         {/* Background Image/Gradient */}
         <div className="absolute inset-0 bg-gradient-to-br from-[#055b4f] via-[#0f3d36] to-black opacity-90 z-10"></div>
         <img 
            className="absolute inset-0 w-full h-full object-cover z-0" 
            alt="Lush green forest aerial view" 
            src={IMAGES.background} 
         />

         {/* Content */}
         <div className="relative z-20 max-w-lg space-y-6">
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ duration: 0.6, delay: 0.2 }}
            >
                <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight whitespace-pre-line">
                   {t('auth.branding.title')}
                </h1>
            </motion.div>
            
            <motion.p 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ duration: 0.6, delay: 0.4 }}
               className="text-lg text-slate-300"
            >
               {t('auth.branding.description')}
            </motion.p>

            {/* Stats or Social Proof */}
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 0.6, delay: 0.6 }}
               className="pt-8 grid grid-cols-2 gap-4"
            >
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-[#4ade80]">{t('auth.branding.stat_1_label')}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">{t('auth.branding.stat_1_text')}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                    <div className="text-2xl font-bold text-[#4ade80]">{t('auth.branding.stat_2_label')}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">{t('auth.branding.stat_2_text')}</div>
                </div>
            </motion.div>
         </div>
      </div>

      {/* --- FORM SECTION --- */}
      <div className="w-full md:w-1/2 order-2 md:order-1 flex items-center justify-center p-6 md:p-12 min-h-[50vh] md:min-h-screen bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Header */}
          <div className="text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                 <div className="w-10 h-10 bg-gradient-to-br from-[#055b4f] to-[#17a277] rounded-xl flex items-center justify-center text-white">
                    <Leaf className="w-6 h-6" />
                 </div>
                 <span className="text-2xl font-bold text-slate-900 tracking-tight">Reforestal eG</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">
                 {isLogin ? t('auth.welcome') : t('auth.create_account')}
              </h2>
              <p className="text-slate-500">
                 {isLogin ? t('auth.sign_in_prompt') : t('auth.sign_up_prompt')}
              </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
              
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                 
                 {/* Name (Register only) */}
                 {!isLogin && (
                    <div className="space-y-2">
                       <Label>{t('auth.name_label')}</Label>
                       <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input 
                             type="text" 
                             placeholder="John Doe" 
                             className="pl-9 h-11" 
                             value={name}
                             onChange={(e) => setName(e.target.value)}
                             required={!isLogin}
                          />
                       </div>
                    </div>
                 )}

                 {/* Email */}
                 <div className="space-y-2">
                    <Label>{t('auth.email_label')}</Label>
                    <div className="relative">
                       <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                       <Input 
                          type="email" 
                          placeholder="name@example.com" 
                          className="pl-9 h-11"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required 
                       />
                    </div>
                 </div>

                 {/* Password */}
                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <Label>{t('auth.password_label')}</Label>
                       {isLogin && (
                          <button 
                            type="button"
                            onClick={() => setShowForgotModal(true)}
                            className="text-xs text-[#17a277] hover:underline font-medium"
                          >
                             {t('auth.forgot_password')}
                          </button>
                       )}
                    </div>
                    <div className="relative">
                       <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                       <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-9 h-11"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required 
                       />
                    </div>
                 </div>

                 <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#055b4f] to-[#17a277] text-white font-semibold h-12 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all"
                 >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : (isLogin ? t('auth.sign_in') : t('auth.sign_up'))}
                    {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                 </Button>

                 <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">Or continue with</span>
                    </div>
                 </div>

                 <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGoogleLogin}
                    className="w-full h-11 border-slate-200 hover:bg-slate-50"
                 >
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
                    <button 
                       onClick={() => setIsLogin(!isLogin)}
                       className="ml-2 text-[#055b4f] font-semibold hover:underline"
                    >
                       {isLogin ? t('auth.sign_up') : t('auth.sign_in')}
                    </button>
                 </p>
              </div>

          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <ForgotPasswordModal 
         isOpen={showForgotModal} 
         onClose={() => setShowForgotModal(false)} 
      />

    </div>
  );
};

export default AuthScreen;