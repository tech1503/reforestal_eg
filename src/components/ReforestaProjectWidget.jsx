import React from 'react';
import { useTranslation } from 'react-i18next';
import projectImage from '@/assets/logo-proyecto.webp';

const ReforestaProjectWidget = () => {
  const { t } = useTranslation();

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl group border border-emerald-100/20">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${projectImage})` }}
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
        
        <p className="text-lg md:text-xl text-emerald-50 mb-2 font-medium drop-shadow-sm leading-relaxed max-w-xl">
           "{t('home.widget.quote')}"
        </p>
      </div>
    </div>
  );
};

export default ReforestaProjectWidget;