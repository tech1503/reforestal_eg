
import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Shield, Star } from 'lucide-react';

const FoundingPioneerEvaluationIcon = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-40"
      />
      <div className="relative z-10">
        <Shield className="w-full h-full text-blue-500 fill-blue-50" strokeWidth={1.5} />
        <div className="absolute inset-0 flex items-center justify-center pb-1">
           <Crown className="w-1/2 h-1/2 text-blue-700 fill-blue-300" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};

export default FoundingPioneerEvaluationIcon;
