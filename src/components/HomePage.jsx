import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Award, Users, TrendingUp, Instagram, Check, Maximize2, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'; 
import heroImg from '@/assets/hero-reforestal.png';
import heroImg1 from '@/assets/hero-home-reforestal.png';
import logoLandDollar from '@/assets/land-dollar-base.png';
import vegReforest from '@/assets/vegetacion-reforestal.png';

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const ctaPoints = t('home.cta_final_points', { returnObjects: true });

  const IMAGES = {
      hero: heroImg1, 
      m2_land: heroImg, 
      hands_plant: vegReforest, 
      widget_logo: logoLandDollar, 
      patterns: {
          carbon: "https://www.transparenttextures.com/patterns/carbon-fibre.png",
          cubes: "https://www.transparenttextures.com/patterns/cubes.png",
          stardust: "https://www.transparenttextures.com/patterns/stardust.png"
      }
  };

  const STARTNEXT_URL = "https://www.startnext.com/reforestal";

  const features = [
    { icon: <TrendingUp className="w-8 h-8" />, title: t('home.feature_invest_title'), description: t('home.feature_invest_desc'), color: "from-emerald-400 to-teal-500" },
    { icon: <Award className="w-8 h-8" />, title: t('home.feature_earn_title'), description: t('home.feature_earn_desc'), color: "from-teal-400 to-cyan-500" },
    { icon: <Users className="w-8 h-8" />, title: t('home.feature_join_title'), description: t('home.feature_join_desc'), color: "from-cyan-400 to-blue-500" }
  ];
  
  const scrollTo = id => { const element = document.getElementById(id); if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="bg-light dark:bg-darkBgDeep text-forest font-sans selection:bg-gold selection:text-darkBgDeep overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <motion.header 
        initial={{ y: -100 }} 
        animate={{ y: 0 }} 
        transition={{ duration: 0.5, ease: 'easeOut' }} 
        className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-darkBgDeep/90 backdrop-blur-xl border-b border-olive/10 shadow-soft"
      >
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2 md:p-2.5 rounded-xl text-white shadow-glow">
               <Leaf className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-lg md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 tracking-tight">
                Reforestal eG
            </span>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <LanguageSwitcher className="text-olive hover:bg-light rounded-full transition-fast" />
            <Button 
                onClick={() => navigate('/auth')} 
                className="rounded-full px-5 md:px-8 h-auto min-h-[2.5rem] md:h-12 text-sm md:text-base btn-primary shadow-glow whitespace-nowrap py-2"
            >
                {t('auth.sign_in')}
            </Button>
          </div>
        </div>
      </motion.header>

      <main>
        {/* 1. HERO SECTION */}
        <section className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center text-center text-white overflow-hidden pt-20">
          <div className="absolute inset-0 z-0">
            <img 
                alt="Bosque denso" 
                className="w-full h-full object-cover scale-105 animate-[kenburns_20s_infinite_alternate] brightness-[0.6] saturate-[1.2]" 
                src={IMAGES.hero} 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-darkBg/10 via-darkBg/30 to-darkBgDeep"></div>
            <div className="absolute inset-0 opacity-0 mix-blend-overlay"></div>
          </div>

          <div className="relative z-10 p-4 md:p-6 max-w-6xl mx-auto flex flex-col items-center">
            
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="inline-flex items-center gap-3 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/20 mb-8 md:mb-10 hover:bg-white/10 transition-normal cursor-default">
               <span className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-gold"></span>
               </span>
               <span className="text-xs md:text-sm font-bold text-gold uppercase tracking-widest">
                  {t('home.hero_badge')}
               </span>
            </motion.div>
            
            {/* Title */}
            <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 md:mb-8 leading-[1.1] tracking-tight drop-shadow-2xl">
              {t('home.main_title')}
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-base sm:text-lg md:text-3xl max-w-4xl mx-auto mb-10 md:mb-12 text-gray-200 font-light leading-relaxed drop-shadow-md px-2">
              {t('home.subtitle')}
            </motion.p>
            
            {/* Buttons Container - Responsive Stack */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full px-4">
              
              <Button 
                onClick={() => scrollTo('genesis-section')} 
                className="w-full sm:w-auto h-auto min-h-[3.5rem] py-4 px-8 rounded-full bg-white text-forest hover:bg-light shadow-glow-lg text-base md:text-xl font-bold hover:scale-105 transition-all whitespace-normal text-center leading-tight"
              >
                {t('home.cta_buttons.start_your_mission')}
              </Button>
              
              <Button 
                onClick={() => window.open(STARTNEXT_URL, '_blank')} 
                variant="outline" 
                className="w-full sm:w-auto h-auto min-h-[3.5rem] py-4 px-8 rounded-full border-2 border-white/30 text-white hover:bg-white/10 hover:border-white backdrop-blur-sm text-base md:text-xl font-bold transition-all whitespace-normal text-center leading-tight"
              >
                {t('home.cta_buttons.supported_startnext')}
              </Button>

            </motion.div>
          </div>
        </section>

        {/* 2. REAL IMPACT METRICS (M2) */}
        <section className="py-20 md:py-24 bg-darkBgDeep relative overflow-hidden flex items-center">
            <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: `url(${IMAGES.patterns.cubes})`, opacity: 0.05}}></div>
            
            <div className="hidden md:block absolute top-1/4 -left-64 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-glow"></div>
            <div className="hidden md:block absolute bottom-1/4 -right-64 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[120px]"></div>

            <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                    <div className="flex items-center gap-3 mb-4 md:mb-6 text-emerald-400">
                        <Maximize2 className="w-5 h-5 md:w-6 md:h-6" />
                        <span className="uppercase tracking-widest font-bold text-xs md:text-sm">
                            {t('home.m2_section.label')}
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6 md:mb-8 leading-tight text-white">
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-200 to-gold bg-clip-text text-transparent animate-gradient-x">
                            {t('home.m2_section.title')}
                        </span>
                    </h2>
                    <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed">
                        {t('home.m2_section.body')}
                    </p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group w-full">
                    <img 
                        src={IMAGES.m2_land}
                        alt="Amazon Land" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-darkBgDeep/90 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 text-white">
                        <div className="text-3xl md:text-4xl font-mono font-bold mb-1 text-gold">1 m²</div>
                        <div className="text-xs md:text-sm opacity-80 uppercase tracking-widest">
                            {t('home.m2_section.caption')}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>

        {/* 3. ECOSYSTEM SECTION */}
        <section className="py-20 md:py-32 bg-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url(${IMAGES.patterns.carbon})`}}></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-transparent to-white"></div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16 md:mb-24">
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-forest to-emerald-600 mb-6 drop-shadow-sm px-2">
                {t('home.ecosystem_title')}
              </motion.h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {features.map((feature, index) => (
                <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 40 }} 
                    whileInView={{ opacity: 1, y: 0 }} 
                    viewport={{ once: true }} 
                    transition={{ delay: index * 0.15 }} 
                    whileHover={{ scale: 1.03, y: -10 }} 
                    className="p-8 md:p-10 rounded-[2.5rem] bg-white border border-emerald-100 shadow-xl hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500 group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <motion.div 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: index * 1 }}
                        className={`w-16 h-16 md:w-20 md:h-20 mb-6 md:mb-8 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500`}
                    >
                        {feature.icon}
                    </motion.div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-forest group-hover:text-emerald-700 transition-colors">
                        {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-base md:text-lg group-hover:text-slate-800 transition-colors">
                        {feature.description}
                    </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. GENESIS REVOLUTION SECTION */}
        <section id="genesis-section" className="py-24 md:py-32 bg-forest relative overflow-hidden flex flex-col items-center justify-center text-center">
            <div className="absolute inset-0" style={{backgroundImage: `url(${IMAGES.patterns.stardust})`, opacity: 0.3}}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/50 to-darkBgDeep"></div>
            
            <div className="container mx-auto px-4 relative z-10 max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <span className="text-emerald-300 font-mono text-xs md:text-sm tracking-[0.3em] uppercase mb-4 block animate-pulse">
                        {t('home.genesis_section.badge')}
                    </span>
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 md:mb-8 tracking-tighter leading-tight drop-shadow-2xl">
                        {t('home.genesis_section.intro')}
                    </h2>
                    <p className="text-xl md:text-2xl text-emerald-100/90 font-light mb-10 md:mb-12 leading-relaxed px-4">
                        {t('home.genesis_section.hook')}
                    </p>
                    
                    <Button 
                        onClick={() => navigate('/genesis-quest')} 
                        className="h-auto w-auto py-4 px-10 rounded-full bg-white text-forest hover:bg-emerald-50 hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all text-lg font-bold border-1 border-transparent hover:border-emerald-200 whitespace-normal"
                    >
                        {t('home.genesis_section.cta')} <ArrowRight className="ml-3 w-5 h-5 shrink-0"/>
                    </Button>
                </motion.div>
            </div>
        </section>

        {/* 5. STARTNEXT FOUNDING MEMBER SECTION */}
        <section className="py-24 md:py-32 bg-light relative overflow-hidden">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="max-w-6xl mx-auto rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 relative group min-h-[600px] flex items-center">
                    
                    <div className="absolute inset-0 z-0">
                        <img src={IMAGES.hands_plant} alt="Hands holding plant" className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-r from-darkBgDeep/90 via-darkBgDeep/70 to-darkBgDeep/40"></div>
                    </div>

                    <div className="relative z-10 p-8 md:p-12 lg:p-16 w-full grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-white text-center lg:text-left">
                            <Badge className="bg-gold text-darkBgDeep border-none font-bold text-base md:text-lg px-4 py-1 mb-6 shadow-glow inline-block">
                                {t('home.widget.badge')}
                            </Badge>
                            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight drop-shadow-lg">
                                {t('home.startnext_section.title')}
                            </h2>
                            <p className="text-base md:text-lg text-emerald-100 mb-8 leading-relaxed lg:max-w-lg mx-auto lg:mx-0">
                                {t('home.startnext_section.body')}
                            </p>
                            
                            <Button 
                                onClick={() => window.open(STARTNEXT_URL, '_blank')} 
                                className="btn-gold h-auto w-full sm:w-auto min-w-[200px] text-base md:text-lg px-8 py-5 rounded-full shadow-lg hover:scale-105 hover:shadow-gold/50 transition-all flex items-center justify-center gap-3 whitespace-normal"
                            >
                                <Heart className="w-5 h-5 fill-darkBgDeep shrink-0" />
                                <span>{t('home.startnext_section.cta')}</span>
                            </Button>
                        </div>

                        <div className="flex flex-col items-center">
                             <motion.div 
                                whileHover={{ rotate: 2, scale: 1.05 }} 
                                transition={{ duration: 0.5 }}
                                className="w-full max-w-xs md:max-w-md transform rotate-2 hover:rotate-0 transition-all duration-500 mb-8"
                            >
                                <img src={IMAGES.widget_logo} alt="Land Dollar" className="w-full h-auto rounded-lg shadow-2xl border border-white/20" />
                            </motion.div>
                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-xl max-w-md">
                                <p className="text-white font-medium italic text-center text-sm md:text-base">
                                    "{t('home.startnext_section.offer')}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* 6. TRANSPARENCY SECTION */}
        <section className="bg-darkBgDeep text-white relative overflow-hidden py-24 md:py-32">
          <div className="container mx-auto px-6 text-center relative z-10">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-bold mb-16 tracking-tight drop-shadow-lg">
                {t('home.cta_final_title')}
            </motion.h2>

            <div className="max-w-4xl mx-auto mb-20 grid gap-6 text-left">
                {Array.isArray(ctaPoints) && ctaPoints.map((point, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 md:gap-6 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors group"
                    >
                        <div className="bg-emerald-500/20 p-3 rounded-full shrink-0 mt-1 group-hover:bg-emerald-500/30 transition-colors">
                            <Check className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 group-hover:text-emerald-300" />
                        </div>
                        <div>
                            <h4 className="text-xl md:text-2xl font-bold text-white mb-2">{point.title}</h4>
                            <p className="text-slate-300 font-light text-base md:text-lg leading-relaxed">{point.text}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <Button 
                onClick={() => navigate('/genesis-quest')} 
                className="btn-gold h-auto w-full sm:w-auto text-lg md:text-xl px-10 py-6 rounded-full shadow-glow-lg hover:scale-105 transition-transform whitespace-normal"
            >
                {t('home.cta_final_button')}
            </Button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-darkBgDeep text-olive border-t border-olive/10 py-12 md:py-16">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            
            {/* Copyright */}
            <div className="flex items-center space-x-3">
              <div className="bg-olive/20 p-2 rounded-lg">
                  <Leaf className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-light/80 font-semibold text-lg">
                  {/* Puedes dejarlo fijo o usar la traducción si prefieres */}
                  Reforestal eG &copy; 2026
              </span>
            </div>

            {/* Links legales y contacto TRADUCIDOS */}
            <div className="flex gap-6 md:gap-8 text-sm font-medium">
              <a href="#" className="hover:text-gold transition-colors">
                  {t('footer.privacy')}
              </a>
              <a href="#" className="hover:text-gold transition-colors">
                  {t('footer.terms')}
              </a>
              <button onClick={() => navigate('/contact')} className="hover:text-gold transition-colors">
                  {t('footer.contact')}
              </button>
            </div>

            {/* Redes Sociales - Instagram */}
            <div className="flex space-x-6">
              <a 
                href="https://www.instagram.com/reforestal" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-light/60 hover:text-white hover:bg-olive/30 p-2 rounded-full transition-all"
                aria-label={t('footer.socials.instagram')} 
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
            
        </div>
      </footer>
    </div>
  );
};
export default HomePage;