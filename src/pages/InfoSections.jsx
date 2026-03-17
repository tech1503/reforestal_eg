import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, Sprout, ShieldCheck, 
  BarChart3, Coins, ChevronDown, Award,
  ArrowRight, HeartHandshake, Leaf
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const InfoSections = () => {
  const { t } = useTranslation();
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    { id: 1, icon: <HeartHandshake className="w-5 h-5 text-emerald-700" /> },
    { id: 2, icon: <Sprout className="w-5 h-5 text-emerald-700" /> },
    { id: 3, icon: <ShieldCheck className="w-5 h-5 text-emerald-700" /> },
    { id: 4, icon: <BarChart3 className="w-5 h-5 text-emerald-700" /> },
    { id: 5, icon: <Coins className="w-5 h-5 text-emerald-700" /> }
  ];

  return (
    <div className="w-full relative overflow-hidden">
      
      <section id="faq-section" className="w-full bg-white py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-bold mb-6 shadow-sm"
            >
              <HelpCircle size={18} />
              <span className="uppercase tracking-widest">
                {t('faq_pioneers.badge_knowledge', 'Knowledge Base')}
              </span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 drop-shadow-sm">
              {t('faq_pioneers.faq_title', 'Frequently Asked Questions')}
            </h2>

            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              {t('faq_pioneers.faq_subtitle', 'Understand how we are transforming conservation into a truly sustainable economic model.')}
            </p>
          </div>

          <div className="grid gap-5 mx-auto">
            {faqs.map((faq, index) => (
              <motion.div 
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                  activeFaq === faq.id 
                    ? 'bg-white border-emerald-600 shadow-md' 
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-600/50'
                }`}
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className="p-3 rounded-xl bg-emerald-100/50 shadow-inner">
                      {faq.icon}
                    </div>

                    <span className={`font-bold text-lg pr-4 ${activeFaq === faq.id ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {t(`faq_pioneers.faq_q${faq.id}`, `Question ${faq.id} missing translation`)}
                    </span>
                  </div>

                  <ChevronDown className={`w-6 h-6 shrink-0 text-emerald-700 transform transition-transform duration-300 ${
                    activeFaq === faq.id ? 'rotate-180' : ''
                  }`} />
                </button>
                
                <AnimatePresence>
                  {activeFaq === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="px-6 pb-6 text-slate-600 leading-relaxed ml-[4.5rem] text-base"
                    >
                      {t(`faq_pioneers.faq_a${faq.id}`, `Answer ${faq.id} missing translation`)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pioneers-section" className="relative py-24 md:py-32 overflow-hidden bg-darkBgDeep border-t border-olive/10">
        
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay z-0" />
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[140px] z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px] z-0 pointer-events-none" />
        
        <motion.div animate={{ y: [0, -25, 0], rotate: [0, 15, -5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="absolute top-24 right-20 z-10 opacity-30">
            <Leaf className="w-16 h-16 text-emerald-500" />
        </motion.div>
        <motion.div animate={{ y: [0, 30, 0], rotate: [0, -20, 15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-40 left-16 z-10 opacity-20">
            <Leaf className="w-24 h-24 text-emerald-400" />
        </motion.div>
        
        <div className="relative z-20 max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 text-darkBgDeep font-bold tracking-widest text-xs uppercase mb-6 bg-gold px-4 py-2 rounded-full shadow-glow">
                <Award size={18} />
                <span>{t('faq_pioneers.pioneers_badge', 'Limited Edition')}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6 drop-shadow-md">
                {t('faq_pioneers.pioneers_title', 'The 10 Founding Pioneers')}
              </h2>
              <p className="text-light/80 text-lg md:text-xl leading-relaxed font-light">
                {t('faq_pioneers.pioneers_text1', 'With the funds from Startnext, we will lay the legal foundation. We prefer to give away participation rather than buy advertising.')}
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col gap-6 pt-4 border-t border-olive/20">
              <div className="flex gap-5 items-start group">
                <div className="mt-1 bg-olive/20 p-2 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <ArrowRight className="text-emerald-500 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xl mb-1">
                    {t('faq_pioneers.pioneers_sub1', 'More than donating, co-founding')}
                  </h4>
                  <p className="text-light/60 font-medium">
                    {t('faq_pioneers.pioneers_sub1_text', 'Be part of the legal structure from day 1 and build with us.')}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="bg-olive/10 border border-olive/20 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full z-0" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="h-16 w-16 rounded-2xl bg-[#063127] shadow-glow flex items-center justify-center text-white font-black text-3xl border border-[#4c6e5e]/80">
                  10
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  {t('faq_pioneers.pioneers_role_title', 'Your Role and Rewards')}
                </h3>
              </div>
              
              <p className="text-light/90 mb-8 italic text-lg leading-relaxed bg-darkBgDeep/50 p-5 rounded-2xl border-l-4 border-[#4c6e5e] shadow-inner">
                "{t('faq_pioneers.pioneers_role_text', 'We are looking for the 10 most committed users to grant them special status, greater participation, and voting rights in strategic decisions.')}"
              </p>
              
              <ul className="space-y-4 mb-10">
                {[
                  t('faq_pioneers.pioneers_list_1', 'Active Voting Rights'), 
                  t('faq_pioneers.pioneers_list_2', 'Direct Participation'), 
                  t('faq_pioneers.pioneers_list_3', 'Exclusive Access to Decisions')
                ].map((item, i) => (
                  <motion.li initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + (i * 0.1) }} key={i} className="flex items-center gap-4 text-light/90 font-medium">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#4c6e5e] shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                    {item}
                  </motion.li>
                ))}
              </ul>
              
              <button 
                onClick={() => window.open('https://www.startnext.com/reforestal', '_blank')}
                className="w-full py-4 bg-[#063127] hover:bg-[#4c6e5e] text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 group border border-[#4c6e5e]/80"
              >
                {t('faq_pioneers.pioneers_cta', 'Discover the Packages')}
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </motion.div>

        </div>
      </section>

    </div>
  );
};

export default InfoSections;