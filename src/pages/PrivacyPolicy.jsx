import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Leaf, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PrivacyPolicy = () => {
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

  // Helper function to safely render lists if they exist in translations
  const renderList = (keyPrefix) => {
    const list = t(keyPrefix, { returnObjects: true });
    if (!Array.isArray(list)) return null;
    return (
      <ul className="list-disc pl-5 mt-2 space-y-2">
        {list.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  };

  // Helper function to safely render paragraphs if they exist
  const renderParagraphs = (keyPrefix) => {
    const paras = t(keyPrefix, { returnObjects: true });
    if (!Array.isArray(paras)) return <p className="mb-4">{paras}</p>;
    return paras.map((p, index) => <p key={index} className="mb-4">{p}</p>);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20 font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16">
        <div className="container mx-auto px-4 h-full flex justify-between items-center">
          <Button variant="ghost" onClick={handleBackNavigation} className="flex items-center gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {user ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
            <span className="hidden sm:inline font-medium">{user ? t('common.back', 'Back') : t('navigation.home', 'Home')}</span>
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

      <main className="container mx-auto px-4 pt-32 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex justify-center mb-4"><ShieldCheck className="w-12 h-12 text-[#5b8370]" /></div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-6 text-foreground drop-shadow-sm">
            {t('privacy.title', 'Privacy Policy')}
          </h1>
          <div className="text-muted-foreground text-lg max-w-4xl mx-auto text-justify space-y-4">
            {renderParagraphs('privacy.intro')}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-8 md:p-12 space-y-12 text-muted-foreground leading-relaxed text-justify">
                    
                    {/* Generar las 22 secciones dinámicamente o estructuradas */}
                    {Array.from({ length: 22 }, (_, i) => i + 1).map((num) => {
                        const sectionKey = `privacy.s${num}`;
                        const title = t(`${sectionKey}.title`, { defaultValue: '' });
                        
                        // Si la sección no existe en las traducciones (aún), la saltamos
                        if (!title || title === `${sectionKey}.title`) return null;

                        return (
                            <section key={num} className="border-b border-border/50 pb-8 last:border-0">
                                <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>
                                {renderParagraphs(`${sectionKey}.body`)}
                                {renderList(`${sectionKey}.list`)}
                            </section>
                        );
                    })}

                    <section className="pt-8 border-t border-border bg-muted/30 p-8 rounded-xl text-center">
                        <p className="font-bold text-foreground text-lg mb-2">{t('privacy.footer_note')}</p>
                    </section>

                </CardContent>
            </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;