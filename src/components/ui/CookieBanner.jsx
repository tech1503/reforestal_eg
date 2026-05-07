import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Cookie, Settings, CheckCircle2, ShieldCheck, Palette, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CookieBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // States for individual cookie categories
  const [preferences, setPreferences] = useState({
    essential: true, 
    functional: false,
    analytics: false
  });

  useEffect(() => {
    // Check if the user has already made a selection
    const consent = localStorage.getItem('reforestal_cookie_consent');
    if (!consent) {
      // Short delay for a smoother entrance
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('reforestal_cookie_consent', JSON.stringify({ essential: true, functional: true, analytics: true }));
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem('reforestal_cookie_consent', JSON.stringify({ essential: true, functional: false, analytics: false }));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('reforestal_cookie_consent', JSON.stringify(preferences));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0, transition: { duration: 0.3 } }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none flex justify-center"
        >
          {/* Main Container using background and border variables */}
          <div className="bg-background border border-border shadow-2xl rounded-3xl p-6 sm:p-8 max-w-4xl w-full pointer-events-auto relative overflow-hidden flex flex-col gap-6">
            
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-[50px] pointer-events-none" />

            {!showSettings ? (
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-start relative z-10">
                <div className="flex-1 space-y-4 text-center lg:text-left">
                  <h2 className="text-2xl sm:text-3xl font-black text-foreground flex items-center justify-center lg:justify-start gap-3">
                    <Cookie className="w-8 h-8 text-gold" />
                    {t('cookie_banner.title', "Let's grow together! 🌳")}
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    {t('cookie_banner.desc', 'Hey! To ensure your dashboard runs smoothly and we can remember your language, we use a few digital tools. The most important ones are technically necessary for you to log in. For the others (like Dark Mode or your mission progress), you decide whether we should activate them.')}
                  </p>
                  <button 
                    onClick={() => navigate('/cookies-policy')}
                    className="text-gold hover:text-foreground underline underline-offset-4 text-sm font-semibold transition-colors"
                  >
                    {t('cookie_banner.link', 'More details in the Cookie Policy')}
                  </button>
                </div>

                <div className="flex flex-col w-full lg:w-auto gap-3 shrink-0">
                  <Button 
                    onClick={handleAcceptAll}
                    variant="outline"
                    className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground font-bold text-sm sm:text-base py-3 rounded-xl transition-all"
                  >
                    {t('cookie_banner.accept_all', 'Accept all')}
                  </Button>
                  <Button 
                    onClick={handleAcceptEssential}
                    variant="outline"
                    className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground font-bold text-sm sm:text-base py-3 rounded-xl transition-all"
                  >
                    {t('cookie_banner.accept_essential', 'Only the essentials')}
                  </Button>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="text-muted-foreground hover:text-gold text-xs sm:text-sm font-medium mt-2 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> {t('cookie_banner.settings', 'Adjust settings')}
                  </button>
                </div>
              </div>
            ) : (
              // --- SETTINGS VIEW ---
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="relative z-10 flex flex-col gap-6"
              >
                <div className="text-center lg:text-left">
                  <h3 className="text-xl font-black text-foreground mb-2">{t('cookie_banner.settings_title', 'Cookie Settings')}</h3>
                  <p className="text-muted-foreground text-sm">{t('cookie_banner.settings_desc', 'Choose which cookies you want to allow. You can change this at any time.')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Essential */}
                  <div className="bg-muted/30 border border-border p-4 rounded-2xl flex flex-col gap-2 relative opacity-70">
                    <div className="flex justify-between items-center">
                      <ShieldCheck className="w-6 h-6 text-primary" />
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="text-foreground font-bold text-sm">{t('cookie_banner.essential_title', 'Strictly necessary')}</h4>
                    <p className="text-xs text-muted-foreground">{t('cookie_banner.essential_desc', 'For platform login and security (always active).')}</p>
                  </div>

                  {/* Functional */}
                  <div 
                    onClick={() => setPreferences(prev => ({...prev, functional: !prev.functional}))}
                    className={`p-4 rounded-2xl flex flex-col gap-2 cursor-pointer transition-all border ${preferences.functional ? 'bg-gold/10 border-gold' : 'bg-card border-border hover:border-gold/50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <Palette className={`w-6 h-6 ${preferences.functional ? 'text-gold' : 'text-muted-foreground'}`} />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${preferences.functional ? 'border-gold bg-gold' : 'border-muted-foreground'}`}>
                        {preferences.functional && <CheckCircle2 className="w-4 h-4 text-background" />}
                      </div>
                    </div>
                    <h4 className="text-foreground font-bold text-sm">{t('cookie_banner.functional_title', 'Functional & Personalization')}</h4>
                    <p className="text-xs text-muted-foreground">{t('cookie_banner.functional_desc', 'Saves your theme (Dark/Light) and your mission progress.')}</p>
                  </div>

                  {/* Analytics */}
                  <div 
                    onClick={() => setPreferences(prev => ({...prev, analytics: !prev.analytics}))}
                    className={`p-4 rounded-2xl flex flex-col gap-2 cursor-pointer transition-all border ${preferences.analytics ? 'bg-gold/10 border-gold' : 'bg-card border-border hover:border-gold/50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <BarChart3 className={`w-6 h-6 ${preferences.analytics ? 'text-gold' : 'text-muted-foreground'}`} />
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${preferences.analytics ? 'border-gold bg-gold' : 'border-muted-foreground'}`}>
                        {preferences.analytics && <CheckCircle2 className="w-4 h-4 text-background" />}
                      </div>
                    </div>
                    <h4 className="text-foreground font-bold text-sm">{t('cookie_banner.analytics_title', 'Analytics & Performance')}</h4>
                    <p className="text-xs text-muted-foreground">{t('cookie_banner.analytics_desc', 'Anonymous statistics to improve Reforestal for everyone.')}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                   <Button 
                    onClick={() => setShowSettings(false)}
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button 
                    onClick={handleSavePreferences}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl"
                  >
                    {t('cookie_banner.save_settings', 'Save selection')}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;