import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Leaf, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const TermsAndConditions = () => {
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

      <main className="container mx-auto px-4 pt-32 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex justify-center mb-4"><Scale className="w-12 h-12 text-[#5b8370]" /></div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-foreground drop-shadow-sm">
            {t('terms.title')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('terms.subtitle')}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-8 md:p-12 space-y-8 text-muted-foreground leading-relaxed">
                    
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">{t('terms.s1.title')}</h2>
                        <p>{t('terms.s1.p1')}</p>
                        <p className="mt-2">{t('terms.s1.p2')}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">{t('terms.s2.title')}</h2>
                        <p>{t('terms.s2.p1')}</p>
                        <ul className="list-disc pl-5 mt-3 space-y-2">
                            <li>{t('terms.s2.l1')}</li>
                            <li>{t('terms.s2.l2')}</li>
                            <li>{t('terms.s2.l3')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">{t('terms.s3.title')}</h2>
                        <p>{t('terms.s3.p1')}</p>
                        <ul className="list-disc pl-5 mt-3 space-y-2">
                            <li>{t('terms.s3.l1')}</li>
                            <li>{t('terms.s3.l2')}</li>
                            <li>{t('terms.s3.l3')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">{t('terms.s4.title')}</h2>
                        <p>{t('terms.s4.p1')}</p>
                        <ul className="list-disc pl-5 mt-3 space-y-2">
                            <li>{t('terms.s4.l1')}</li>
                            <li>{t('terms.s4.l2')}</li>
                            <li>{t('terms.s4.l3')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">{t('terms.s5.title')}</h2>
                        <p>{t('terms.s5.p1')}</p>
                        <ul className="list-disc pl-5 mt-3 space-y-2">
                            <li>{t('terms.s5.l1')}</li>
                            <li>{t('terms.s5.l2')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-3">{t('terms.s6.title')}</h2>
                        <p>{t('terms.s6.p1')}</p>
                        <ul className="list-disc pl-5 mt-3 space-y-2">
                            <li>{t('terms.s6.l1')}</li>
                            <li>{t('terms.s6.l2')}</li>
                        </ul>
                    </section>

                    <section className="pt-4">
                        <h2 className="text-xl font-bold text-foreground mb-3">{t('terms.s7.title')}</h2>
                        <p>{t('terms.s7.p1')}</p>
                        
                        <div className="mt-10 text-center">
                            <p className="text-xl font-black text-primary">{t('terms.s7.outro')}</p>
                        </div>
                    </section>

                </CardContent>
            </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default TermsAndConditions;