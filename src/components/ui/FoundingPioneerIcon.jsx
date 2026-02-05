
import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Shield, Star, Award } from 'lucide-react';

const FoundingPioneerIcon = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background Glow */}
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
        className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-40"
      />

      {/* Rotating Outer Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 20, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 border-2 border-dashed border-amber-300/50 rounded-full"
      />

      {/* Main Shield */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [-5, 5, -5] }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative z-10"
      >
        <Shield className="w-full h-full text-amber-500 fill-amber-100" strokeWidth={1.5} />
        
        {/* Crown Icon inside Shield */}
        <div className="absolute inset-0 flex items-center justify-center pb-1">
           <Crown className="w-1/2 h-1/2 text-amber-700 fill-amber-300" strokeWidth={2} />
        </div>
      </motion.div>

      {/* Floating Stars */}
      <motion.div
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], x: [10, 20, 10], y: [-10, -20, -10] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        className="absolute top-0 right-0"
      >
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-200" />
      </motion.div>
      
      <motion.div
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], x: [-10, -20, -10], y: [10, 20, 10] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
        className="absolute bottom-0 left-0"
      >
        <Star className="w-3 h-3 text-yellow-500 fill-yellow-300" />
      </motion.div>
    </div>
  );
};

export default FoundingPioneerIcon;
