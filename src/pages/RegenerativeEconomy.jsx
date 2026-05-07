import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Leaf, TrendingUp, Layers, Sprout, TreePine, Coins, ShieldCheck, Globe, Target, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const RegenerativeEconomy = () => {
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
          <div className="flex justify-center mb-4"><TrendingUp className="w-12 h-12 text-[#5b8370]" /></div>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 text-foreground drop-shadow-sm">
            {t('economy.title', 'Regenerative Economy & Profitability')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            {t('economy.subtitle')}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-8 md:p-12 space-y-10 text-muted-foreground leading-relaxed">
                    
                    {/* Sección 1: La Chakra */}
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2"><Layers className="w-6 h-6 text-[#5b8370]" /> {t('economy.s1.title')}</h2>
                        <p>{t('economy.s1.p1')}</p>
                        <p className="mt-3">{t('economy.s1.p2')}</p>
                    </section>

                    {/* Sección 2: Sinergias y Estructura */}
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2"><Sprout className="w-6 h-6 text-[#5b8370]" /> {t('economy.s2.title')}</h2>
                        <p>{t('economy.s2.p1')}</p>
                        <ul className="list-disc pl-5 mt-4 space-y-2">
                            <li>{t('economy.s2.l1')}</li>
                            <li>{t('economy.s2.l2')}</li>
                            <li>{t('economy.s2.l3')}</li>
                            <li>{t('economy.s2.l4')}</li>
                        </ul>
                        <p className="mt-4">{t('economy.s2.p2')}</p>
                        <div className="mt-6 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 shadow-sm">
                            <h4 className="font-bold flex items-center gap-2 mb-2"><Sun className="w-5 h-5"/> {t('economy.s2.pilot_title')}</h4>
                            <p className="text-sm font-medium">{t('economy.s2.pilot_desc')}</p>
                        </div>
                    </section>

                    {/* Sección 3: Fases de Rentabilidad */}
                    <section>
                        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2"><Coins className="w-6 h-6 text-amber-500" /> {t('economy.s3.title')}</h2>
                        <p className="mb-6">{t('economy.s3.p1')}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Fase 1 */}
                            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-[#5b8370]/50 relative overflow-hidden group">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 font-black">1</div>
                                <h3 className="text-lg font-bold text-foreground mb-2">{t('economy.s3.phase1.title')}</h3>
                                <p className="text-sm mb-4">{t('economy.s3.phase1.desc')}</p>
                                <div className="mt-auto">
                                    <p className="text-xs font-semibold text-foreground bg-muted p-3 rounded-lg border border-border">{t('economy.s3.phase1.projection')}</p>
                                </div>
                            </div>
                            
                            {/* Fase 2 */}
                            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-amber-500/50 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4 font-black relative z-10">2</div>
                                <h3 className="text-lg font-bold text-foreground mb-2 relative z-10">{t('economy.s3.phase2.title')}</h3>
                                <p className="text-sm mb-4 relative z-10">{t('economy.s3.phase2.desc')}</p>
                                <div className="mt-auto relative z-10">
                                    <p className="text-xs font-semibold text-foreground bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">{t('economy.s3.phase2.projection')}</p>
                                </div>
                            </div>

                            {/* Fase 3 */}
                            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-[#063127]/50 flex flex-col">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 font-black">3</div>
                                <h3 className="text-lg font-bold text-foreground mb-2">{t('economy.s3.phase3.title')}</h3>
                                <p className="text-sm mb-4 flex-1">{t('economy.s3.phase3.desc')}</p>
                                <div className="mt-auto">
                                    <p className="text-xs font-semibold text-foreground bg-muted p-3 rounded-lg border border-border">{t('economy.s3.phase3.projection')}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Sección 4: Triple Impacto y Pluralidad */}
                    <section className="pt-6 border-t border-border">
                        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2"><Globe className="w-6 h-6 text-blue-500" /> {t('economy.s4.title')}</h2>
                        <p className="mb-6">{t('economy.s4.p1')}</p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background">
                                <TreePine className="w-6 h-6 text-emerald-500 shrink-0" />
                                <div><strong className="text-foreground text-lg">{t('economy.s4.l1_title')}</strong> <p className="text-sm mt-1">{t('economy.s4.l1_desc')}</p></div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background">
                                <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
                                <div><strong className="text-foreground text-lg">{t('economy.s4.l2_title')}</strong> <p className="text-sm mt-1">{t('economy.s4.l2_desc')}</p></div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background">
                                <Coins className="w-6 h-6 text-amber-500 shrink-0" />
                                <div><strong className="text-foreground text-lg">{t('economy.s4.l3_title')}</strong> <p className="text-sm mt-1">{t('economy.s4.l3_desc')}</p></div>
                            </div>
                        </div>
                        <p className="mt-8 font-medium text-foreground text-center bg-muted/30 p-4 rounded-xl">{t('economy.s4.p2')}</p>
                    </section>

                    {/* Sección 5: Horizonte 2027 (Call to Action) */}
                    <section className="pt-8 border-t border-border">
                        <div className="bg-gradient-to-br from-[#063127] to-[#5b8370] rounded-3xl p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-[80px] pointer-events-none" />
                            <Target className="w-12 h-12 text-gold mx-auto mb-4 relative z-10" />
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-md relative z-10">
                                {t('economy.s5.title')}
                            </h2>
                            <p className="text-lg md:text-xl font-medium text-[#c4d1c0] max-w-2xl mx-auto mb-6 relative z-10">
                                {t('economy.s5.p1')}
                            </p>
                            <p className="text-base text-white/90 max-w-2xl mx-auto mb-8 relative z-10">
                                {t('economy.s5.p2')}
                            </p>
                            <Button 
                                onClick={() => navigate('/genesis-quest')}
                                className="bg-gradient-gold text-[#063127] font-black text-lg px-8 py-6 rounded-full shadow-glow hover:scale-105 transition-all border-none relative z-10"
                            >
                                {t('home.cta_final_button', 'Begin the Mission')}
                            </Button>
                        </div>
                    </section>

                </CardContent>
            </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default RegenerativeEconomy;