import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/contexts/I18nContext';
import { useTranslation } from 'react-i18next'; // IMPORTADO
import { Leaf, Award, Globe, Zap } from 'lucide-react';

const TierBenefitsPreview = ({ tier, amount }) => {
  const { currentLanguage } = useI18n();
  const { t } = useTranslation(); // HOOK

  if (!amount || amount < 5) {
     return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
            <p className="text-sm text-slate-500">Enter an amount of €5.00 or more to see eligible tier and benefits.</p>
        </div>
     );
  }

  if (!tier) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
            <Zap className="w-5 h-5" />
            <span className="text-sm font-medium">No active tier found for this amount.</span>
        </div>
      );
  }

  // Helper to get translated string
  const getTrans = (translations, field) => {
      const tVal = translations?.find(x => x.language_code === currentLanguage) 
              || translations?.find(x => x.language_code === 'en');
      return tVal?.[field] || 'Missing Translation';
  };

  const tierName = getTrans(tier.support_level_translations, 'name');
  const tierDesc = getTrans(tier.support_level_translations, 'description');

  return (
    <div className="bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-100 rounded-xl p-5 shadow-sm space-y-4">
       <div className="flex justify-between items-start">
           <div>
               <h4 className="text-emerald-900 font-bold text-lg">{tierName}</h4>
               <p className="text-emerald-700/80 text-sm">{tierDesc}</p>
           </div>
           <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-3 py-1 text-sm">
               Tier Level
           </Badge>
       </div>

       <div className="grid grid-cols-2 gap-4 pt-2">
           <div className="bg-white/60 p-3 rounded-lg border border-emerald-100/50">
               <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-2">Rewards</span>
               <div className="space-y-1">
                   <div className="flex justify-between text-sm">
                       <span className="text-slate-600">{t('dashboard.land_dollar.title')}:</span>
                       <span className="font-mono font-bold text-emerald-600">{tier.land_dollars_reward}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                       <span className="text-slate-600">{t('dashboard.impact_credits')}:</span>
                       <span className="font-mono font-bold text-blue-600">{tier.impact_credits_reward}</span>
                   </div>
               </div>
           </div>

           <div className="bg-white/60 p-3 rounded-lg border border-emerald-100/50">
               <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-2">Benefits</span>
               <ul className="space-y-1.5">
                   {tier.support_benefits?.map((benefit, i) => {
                       const desc = getTrans(benefit.support_benefit_translations, 'description');
                       return (
                           <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                               <CheckIcon type={benefit.benefit_type} />
                               <span className="leading-tight">{desc}</span>
                           </li>
                       );
                   })}
                   {(!tier.support_benefits || tier.support_benefits.length === 0) && (
                       <li className="text-xs text-slate-400 italic">No specific benefits listed.</li>
                   )}
               </ul>
           </div>
       </div>
    </div>
  );
};

const CheckIcon = ({ type }) => {
    const cls = "w-3 h-3 mt-0.5 flex-shrink-0";
    if (type === 'physical') return <Award className={`${cls} text-amber-500`} />;
    if (type === 'experience') return <Globe className={`${cls} text-blue-500`} />;
    return <Leaf className={`${cls} text-emerald-500`} />;
};

export default TierBenefitsPreview;