import React from 'react';
import { motion } from 'framer-motion';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const PageUnderscore = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-gold-700 flex items-center justify-center p-6 text-white text-center">

      <header className="absolute top-0 left-0 w-full z-50 p-6 lg:px-12 flex justify-end">
        <LanguageSwitcher />
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl bg-white/5 backdrop-blur-md p-10 rounded-3xl border border-gold-500/30 shadow-lg"
      >
        <h1 className="text-5xl font-black text-gold-400 mb-6">Página Secreta (_)</h1>
        <p className="text-lg text-white/80 leading-relaxed">
          ¡Has encontrado el QR /_!
        </p>
      </motion.div>
    </div>
  );
};

export default PageUnderscore;