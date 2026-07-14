import React from 'react';
import { motion } from 'framer-motion';

const PagePeter = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-white text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl bg-white/5 backdrop-blur-md p-10 rounded-3xl border border-blue-500/30 shadow-lg"
      >
        <h1 className="text-5xl font-black text-blue-400 mb-6">Hola, Peter</h1>
        <p className="text-lg text-white/80 leading-relaxed">
          Esta es tu landing page personalizada. 
          Aquí podemos agregar tu historia, tu impacto en Reforestal o cualquier mensaje que quieras compartir.
        </p>
      </motion.div>
    </div>
  );
};

export default PagePeter;