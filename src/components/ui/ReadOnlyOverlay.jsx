import React, { useState } from 'react';
import { Lock, ExternalLink, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import StartnextSupportModal from '@/components/ui/StartnextSupportModal';
import { STARTNEXT_PROJECT_URL } from '@/constants/urls';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const ReadOnlyOverlay = ({ 
    title, 
    message,
    subMessage,
    link = STARTNEXT_PROJECT_URL 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation(); // HOOK

  // Usamos las props si existen, sino, usamos las traducciones por defecto
  const displayTitle = title || t('roles.explorer_level_1');
  const displayMessage = message || t('exchange.overlay.message');
  const displaySubMessage = subMessage || t('exchange.overlay.sub_message');

  return (
    <>
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-[2px] p-6 text-center transition-all duration-300 opacity-0 group-hover:opacity-100">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        className="bg-white p-4 rounded-full shadow-xl mb-4 border border-emerald-100"
      >
        <Lock className="w-8 h-8 text-emerald-600" />
      </motion.div>
      
      <h3 className="text-xl font-bold text-emerald-950 mb-2">{displayTitle}</h3>
      <p className="text-sm text-gray-600 mb-1 max-w-[260px] leading-relaxed font-medium">
        {displayMessage}
      </p>
      
      {displaySubMessage && (
          <p className="text-xs text-gray-500 mb-6 max-w-[260px] leading-relaxed">
            {displaySubMessage}
          </p>
      )}
      
      <div className="flex flex-col gap-2 w-full max-w-[220px]">
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2 w-full font-semibold text-xs"
            onClick={(e) => {
                e.stopPropagation();
                window.open(link, '_blank');
            }}
          >
            {/* Usamos una clave existente que encaja bien: "Support on Startnext" */}
            {t('dashboard.startnext_verification.support_button')} <ExternalLink className="w-3 h-3" />
          </Button>

          <Button 
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 w-full text-xs h-auto py-2 whitespace-normal leading-tight"
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