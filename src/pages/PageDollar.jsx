import React from 'react';
import { motion } from 'framer-motion';

const PageDollar = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-white text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl bg-white/5 backdrop-blur-md p-10 rounded-3xl border border-gold/30 shadow-glow"
      >
        <h1 className="text-5xl font-black text-gold mb-6">Página Dólar ($)</h1>
        <p className="text-lg text-white/80 leading-relaxed">
          ¡Bienvenido! Has escaneado el QR con el símbolo "$". 
          Esta es una página interna de Reforestal. 
          Aquí puedes poner información sobre inversiones, impacto económico o la campaña de Startnext.
        </p>
      </motion.div>
    </div>
  );
};

export default PageDollar;