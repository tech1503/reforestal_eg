import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { STARTNEXT_PROJECT_URL, PROJECT_BANNER_IMAGE_URL } from '@/constants/urls';

const ReforestaProjectWidget = () => {
  const { t } = useTranslation();

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl group border border-emerald-100/20">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${PROJECT_BANNER_IMAGE_URL})` }}
      >
        {/* Soft Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-transparent" />
      </div>
      
      {/* Content Container */}
      <div className="relative z-10 p-8 md:p-12 flex flex-col items-start text-left max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-sm mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              {t('home.widget.badge')}
            </span>
        </div>

        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-sm leading-tight">
           {t('home.widget.title')}
        </h2>
        
        <p className="text-lg md:text-xl text-emerald-50 mb-8 font-medium drop-shadow-sm leading-relaxed max-w-xl">
           "{t('home.widget.quote')}"
        </p>
        
        <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg px-8 py-6 h-auto shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-1 rounded-xl"
              onClick={() => window.open(STARTNEXT_PROJECT_URL, '_blank')}
            >
              {t('home.widget.button')} <ExternalLink className="ml-2 h-5 w-5" />
            </Button>
        </div>
      </div>
    </div>
  );
};

export default ReforestaProjectWidget;