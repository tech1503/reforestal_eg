import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Crown, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const FoundingPioneerLockedSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(); // HOOK

  const handleApply = () => {
    navigate('/startnext?source=founding_pioneer');
  };

  return (
    <div className="w-full flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-esmerald-700 to-forest border border-esmerald-500/30"
      >
        {/* --- Background Effects --- */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-esmerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-gold-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Tech Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center p-10 md:p-16 gap-12">
          
          {/* --- Animated Icon Section --- */}
          <div className="flex-shrink-0 relative group">
            {/* Outer Rotating Ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-esmerald-300/20 border-dashed"
            />
            
            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                boxShadow: [
                  "0 0 20px rgba(23, 162, 119, 0.2)",
                  "0 0 50px rgba(23, 162, 119, 0.4)",
                  "0 0 20px rgba(23, 162, 119, 0.2)"
                ]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="w-40 h-40 md:w-48 md:h-48 bg-gradient-to-b from-esmerald-700 to-darkBgDeep rounded-full border-2 border-esmerald-500/40 flex items-center justify-center backdrop-blur-md relative z-10"
            >
              <div className="relative">
                <Shield className="w-20 h-20 md:w-24 md:h-24 text-esmerald-300/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-110" />
                <Lock className="w-12 h-12 md:w-14 md:h-14 text-esmerald-300 drop-shadow-[0_0_15px_rgba(23,162,119,0.6)] relative z-10" />
                
                {/* Floating Crown */}
                <motion.div 
                  animate={{ y: [-2, 2, -2], rotate: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 bg-darkBgDeep rounded-full p-2 border border-gold-500/30 shadow-lg"
                >
                   <Crown className="w-6 h-6 text-gold-500 fill-gold-500" />
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* --- Content Section --- */}
          <div className="flex-1 text-center md:text-left space-y-6">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
              {t('founding_pioneer.locked_section.title_prefix')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-esmerald-300 to-white">{t('founding_pioneer.locked_section.title_highlight')}</span>
            </h2>
            
            <p className="text-lg md:text-xl text-esmerald-100/90 font-light leading-relaxed max-w-2xl mx-auto md:mx-0">
              {t('founding_pioneer.locked_section.description')}
            </p>

            <div className="pt-6 flex flex-col md:items-start items-center">
              <Button 
                onClick={handleApply}
                className="group relative overflow-hidden bg-esmerald-500 hover:bg-esmerald-500/90 text-white font-bold text-lg px-10 py-7 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-glow border border-esmerald-300/20"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {t('founding_pioneer.locked_section.cta_button')}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
                
                {/* Shimmer Effect */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shimmer" />
              </Button>
              
              <p className="mt-5 text-xs text-esmerald-300/70 uppercase tracking-[0.2em] font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse"></span>
                {t('founding_pioneer.locked_section.footer_note')}
              </p>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default FoundingPioneerLockedSection;