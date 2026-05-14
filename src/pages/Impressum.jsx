import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Leaf, FileText, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const Impressum = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleBackNavigation = () => {
    if (user) {
        const role = profile?.role || 'user';
        if (role === 'admin') navigate('/admin');
        else if (role === 'startnext_user') navigate('/startnext');
        else navigate('/dashboard');
    } else {
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20 font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16">
        <div className="container mx-auto px-4 h-full flex justify-between items-center">
          <Button variant="ghost" onClick={handleBackNavigation} className="flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {user ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
            <span className="hidden sm:inline font-medium">{user ? t('common.back', 'Back to Dashboard') : t('navigation.home', 'Home')}</span>
          </Button>

          <div className="flex items-center gap-2 text-[#5b8370] font-bold text-lg cursor-pointer" onClick={() => navigate('/')}>
            <Leaf className="w-6 h-6" />
            <span className="hidden md:inline">Reforestal eG</span>
          </div>

          <div className="flex items-center gap-2">
             <ThemeSwitcher className="w-9 h-9 rounded-md" />
             <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-32 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-[#5b8370]" />
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              {t('impressum.title')}
            </h1>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border shadow-md">
                <CardContent className="p-8 md:p-12 space-y-10 text-muted-foreground leading-relaxed">
                    
                    {/* Betreiber / Operador */}
                    <section>
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-wider mb-6 border-b pb-2 border-border">
                          {t('impressum.platform_operator')}
                        </h2>
                        
                        <div className="space-y-1 text-lg text-foreground/90">
                            <p className="font-bold text-foreground">{t('impressum.operator_name')}</p>
                            <p>{t('impressum.address_street')}</p>
                            <p>{t('impressum.address_city')}</p>
                            <p>{t('impressum.address_country')}</p>
                        </div>

                        <div className="mt-8 space-y-3 pt-4 border-t border-border/50">
                            <p className="font-semibold text-foreground">{t('impressum.management')}</p>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-primary" />
                              <p>{t('impressum.email')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-primary" />
                              <p>{t('impressum.phone')}</p>
                            </div>
                        </div>
                    </section>

                    {/* Responsabilidad de Contenido */}
                    <section>
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-wider mb-4">
                          {t('impressum.content_responsible_title')}
                        </h2>
                        <p className="font-bold text-foreground">{t('impressum.content_responsible_name')}</p>
                        <p className="mt-4 text-sm leading-snug">
                          {t('impressum.project_note')}
                        </p>
                    </section>

                    {/* Notas Adicionales */}
                    <section className="pt-8 border-t border-border">
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-wider mb-4">
                          {t('impressum.further_notes_title')}
                        </h2>
                        <p className="mb-6">{t('impressum.social_media_text')}</p>
                        <div className="bg-muted/30 p-6 rounded-lg border border-border/60">
                            <p className="text-sm italic">
                                {t('impressum.dispute_resolution')}
                            </p>
                        </div>
                    </section>

                </CardContent>
            </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Impressum;