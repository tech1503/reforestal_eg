import React, { useState } from 'react';
import { Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import StartnextSupportModal from '@/components/ui/StartnextSupportModal';
import { STARTNEXT_PROJECT_URL } from '@/constants/urls';
import { useTranslation } from 'react-i18next'; 

const ReadOnlyOverlay = ({ 
    title, 
    message,
    subMessage,
    link = STARTNEXT_PROJECT_URL 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  const displayTitle = title || t('roles.explorer_level_1');
  const displayMessage = message || t('exchange.overlay.message');
  const displaySubMessage = subMessage || t('exchange.overlay.sub_message');

  return (
    <>
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
          <p className="text-xs text-[#063127]/70 dark:text-gray-400 mb-6 max-w-[260px] leading-relaxed">
            {displaySubMessage}
          </p>
      )}
      
      <div className="flex flex-col gap-3 w-full max-w-[220px]">
          <Button 
            className="bg-[#5b8370] hover:bg-[#4a6b5c] text-white shadow-lg shadow-[#5b8370]/30 gap-2 w-full font-bold text-xs border border-[#5b8370]"
            onClick={(e) => {
                e.stopPropagation();
                window.open(link, '_blank');
            }}
          >
            {t('dashboard.startnext_verification.support_button')} <ExternalLink className="w-3 h-3" />
          </Button>

          <Button 
            variant="outline"
            className="bg-white/50 dark:bg-black/50 border-[#063127] dark:border-[#5b8370] text-[#063127] dark:text-[#c4d1c0] hover:bg-[#063127] hover:text-white dark:hover:bg-[#5b8370] dark:hover:text-white gap-2 w-full text-xs h-auto py-2.5 whitespace-normal leading-tight shadow-sm font-semibold"
            onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
            }}
          >
             {t('exchange.cta.support_startnext')}
          </Button>
      </div>
    </div>

    <StartnextSupportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default ReadOnlyOverlay;