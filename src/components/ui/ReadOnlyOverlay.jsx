import React from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next'; 

const ReadOnlyOverlay = ({ 
    title, 
    message,
    subMessage
}) => {
  const { t } = useTranslation();

  const displayTitle = title || t('roles.explorer_level_1');
  const displayMessage = message || t('exchange.overlay.message');
  const displaySubMessage = subMessage || t('exchange.overlay.sub_message');

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-md p-6 text-center transition-all duration-300 opacity-0 group-hover:opacity-100 rounded-xl border border-transparent dark:border-white/10">
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        className="bg-[#c4d1c0] dark:bg-[#063127] p-4 rounded-full shadow-lg mb-4 border border-[#5b8370]/50"
      >
        <Lock className="w-8 h-8 text-[#063127] dark:text-[#5b8370]" />
      </motion.div>
      
      <h3 className="text-xl font-bold text-[#063127] dark:text-white mb-2 drop-shadow-sm">{displayTitle}</h3>
      <p className="text-sm text-[#063127]/90 dark:text-gray-300 mb-1 max-w-[260px] leading-relaxed font-medium">
        {displayMessage}
      </p>
      
      {displaySubMessage && (
          <p className="text-xs text-[#063127]/70 dark:text-gray-400 mb-2 max-w-[260px] leading-relaxed">
            {displaySubMessage}
          </p>
      )}
    </div>
  );
};

export default ReadOnlyOverlay;
