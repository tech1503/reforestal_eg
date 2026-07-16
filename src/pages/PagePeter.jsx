import React from 'react';
import { motion } from 'framer-motion';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const PagePeter = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-white text-center">

      <header className="absolute top-0 left-0 w-full z-50 p-6 lg:px-12 flex justify-end">
        <LanguageSwitcher />
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl bg-white/5 backdrop-blur-md p-10 rounded-3xl border border-blue-500/30 shadow-lg"
      >
        <h1 className="text-5xl font-black text-blue-400 mb-6">Hola</h1>
        <p className="text-lg text-white/80 leading-relaxed">
            ¡Has encontrado el QR /qr-peter! 
        </p>
      </motion.div>
    </div>
  );
};

export default PagePeter;