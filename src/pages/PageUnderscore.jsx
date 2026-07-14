import React from 'react';
import { motion } from 'framer-motion';

const PageUnderscore = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-white text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl bg-white/5 backdrop-blur-md p-10 rounded-3xl border border-gold-500/30 shadow-lg"
      >
        <h1 className="text-5xl font-black text-gold-400 mb-6">Página Secreta (_)</h1>
        <p className="text-lg text-white/80 leading-relaxed">
          ¡Has encontrado el enlace oculto! 
          Usa este espacio para contenido exclusivo, misiones especiales o sorpresas para la comunidad.
        </p>
      </motion.div>
    </div>
  );
};

export default PageUnderscore;