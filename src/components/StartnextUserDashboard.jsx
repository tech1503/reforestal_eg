import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext'; 
import { useI18n } from '@/contexts/I18nContext';
import { useTranslation } from 'react-i18next'; 
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trees, CreditCard, Leaf, Wallet, Coins, Lock, ShieldCheck, X, Clock,CheckCircle2, Zap } from 'lucide-react';
import LandDollarDisplay from '@/components/LandDollarDisplay';
import ReforestaProjectWidget from '@/components/ReforestaProjectWidget';
import { supabase } from '@/lib/customSupabaseClient';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { calculateDynamicCredits } from '@/utils/tierLogicUtils';

const StartnextUserDashboard = () => {
  const { profile, user } = useAuth();
  const { currentLanguage } = useI18n();
  const { t } = useTranslation(); 
  
  const { userTier, tierBenefits, impactCredits, landDollar, contributions, loading } = useFinancial();
  const [pioneerStatus, setPioneerStatus] = useState('pending');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (user?.id) {
        const checkStatus = async () => {
            const { data } = await supabase.from('founding_pioneer_metrics').select('founding_pioneer_access_status').eq('user_id', user.id).maybeSingle();
            setPioneerStatus(data?.founding_pioneer_access_status || 'pending');
        };
        checkStatus();
    }
  }, [user]);

  useEffect(() => {
    if (localStorage.getItem('welcome_dismissed') === 'true') {
        setShowWelcome(false);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem('welcome_dismissed', 'true');
    setShowWelcome(false);
  };

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-gold"/></div>;

  const snxId = contributions?.imported_user_id ? 'SNX-IMP' : 'SNX-ACT';
  const tierName = userTier?.displayName || 'Explorer Standard';
  
 
  const dynamicCredits = contributions?.contribution_amount ? calculateDynamicCredits(contributions.contribution_amount) : 0;

  const baseBenefits = tierBenefits.filter(b => b.icon_name !== 'credit' && b.icon_name !== 'star').map(b => {
      const trans = b.support_benefit_translations?.find(t => t.language_code === currentLanguage) 
                || b.support_benefit_translations?.find(t => t.language_code === 'en');
      return {
          ...b,
          translated_desc: trans?.description || t('dashboard.startnext_dash.benefit_available')
      };
  });

  const displayBenefits = [
      {
          id: 'dynamic_bp',
          benefit_type: 'digital',
          translated_desc: `+${formatNumber(dynamicCredits)} ${t('rewards.bonus_points', 'Bonos')} (${t('dashboard.startnext_dash.total_contribution', 'Aporte')})`
      },
      ...baseBenefits
  ];

  const landDollarDisplayValue = landDollar ? t('dashboard.startnext_dash.active_asset') : t('dashboard.startnext_dash.pending');

  const isPioneerApproved = pioneerStatus === 'approved';
  const firstName = profile?.name ? profile.name.trim().split(' ')[0] : 'Explorer';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 py-4">
       
       

       <AnimatePresence>
         {showWelcome && (
           <motion.div 
             initial={{ y: 20, opacity: 0, height: 0 }} 
             animate={{ y: 0, opacity: 1, height: 'auto' }} 
             exit={{ opacity: 0, scale: 0.95, height: 0, marginTop: 0, marginBottom: 0 }} 
             transition={{ duration: 0.4 }} 
             className="relative overflow-hidden rounded-3xl shadow-premium p-10 bg-[#063127] border border-gold/30 text-white mb-8"
           >
              <button onClick={dismissWelcome} className="absolute top-5 right-5 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors" title={t('common.close', 'Close')}>
                 <X className="w-5 h-5" />
              </button>

              <div className="absolute top-0 right-0 w-2/3 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div>
                     <div className="flex items-center gap-3 mb-4 pr-10">
                        <Badge className={`border-0 px-4 py-1.5 backdrop-blur-md shadow-sm flex items-center gap-2 ${isPioneerApproved ? 'bg-gradient-gold text-[#063127] font-bold shadow-glow' : 'bg-[#063127] border border-gold/50 text-gold'}`}>
                            {isPioneerApproved ? (
                                <><ShieldCheck className="w-4 h-4"/> {t('dashboard.pioneer_status.active')}</>
                            ) : (
                                <><Clock className="w-4 h-4"/> {t('pioneer.restricted.pending', 'Pioneer Review')}</>
                            )}
                        </Badge>
                        <span className="text-xs font-mono text-gold bg-gold/10 px-3 py-1 rounded-full flex items-center gap-2 border border-gold/30">
                            <ShieldCheck className="w-3 h-3 text-gold"/> {snxId}
                        </span>
                     </div>
                     <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-sm text-white">
                        {t('dashboard.pioneer_status.welcome', { name: firstName })}
                     </h1>
                     <p className="text-white/80 text-lg max-w-xl font-medium leading-relaxed">
                        {t('dashboard.startnext_dash.hero_msg')}
                     </p>
                  </div>
                  
                  <div className="bg-[#063127]/80 backdrop-blur-md border border-gold/50 p-6 rounded-2xl shadow-glow flex flex-col items-center min-w-[200px] transition-normal mt-4 md:mt-0">
                     <div className="w-14 h-14 text-[#063127] bg-gradient-gold p-2 rounded-full mb-3 shadow-glow">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M3 20l5-10 4 6 5-8 4 12H3z" /><path d="M8 20c0-4 3-6 4-6s4 2 4 6" /></svg>
                     </div>
                     <span className="text-xs text-gold uppercase font-bold tracking-widest mb-1">{t('dashboard.pioneer_status.current_tier')}</span>
                     <span className="text-3xl font-black text-gradient-gold text-center leading-tight drop-shadow-md">
                        {tierName}
                     </span>
                  </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={CreditCard} iconColor="text-[#063127]" bgColor="bg-gradient-gold shadow-glow" label={t('dashboard.startnext_dash.total_contribution')} value={formatCurrency(contributions?.contribution_amount)} highlight />
          <StatCard icon={Wallet} iconColor="text-[#063127]" bgColor="bg-gradient-gold shadow-glow" label={t('dashboard.land_dollar.title')} value={landDollarDisplayValue} highlight />
          <StatCard icon={Coins} iconColor="text-[#063127]" bgColor="bg-gradient-gold shadow-glow" label={t('dashboard.impact_credits')} value={formatNumber(impactCredits)} highlight />
       </motion.div>

       

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center gap-3 mb-2">
                 <div className="p-2.5 bg-gradient-gold rounded-xl shadow-glow">
                     <CheckCircle2 className="w-6 h-6 text-[#063127]" />
                 </div>
                 <h3 className="text-2xl font-bold text-foreground">
                     {t('dashboard.benefits.title', 'Your Startnext Benefits')}
                 </h3>
             </div>
             
             <Card className="border-gold/30 bg-[#063127] shadow-lg overflow-hidden">
             
                <CardContent className="p-0">
                   <ul className="divide-y divide-gold/10">
                      {displayBenefits.length === 0 ? (
                         <li className="p-6 text-center text-white/50">{t('dashboard.benefits.no_benefits', 'No benefits found.')}</li>
                      ) : (
                         displayBenefits.map((b, i) => (
                           <li key={i} className="flex items-start gap-4 p-5 hover:bg-white/5 transition-colors">
                             <div className="mt-0.5 text-[#063127] bg-gradient-gold shadow-glow p-1.5 rounded-full shrink-0">
                               {b.id === 'dynamic_bp' ? <Zap className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                             </div>
                             <div className="flex flex-col gap-1.5">
                               <span className="text-base font-semibold text-white leading-snug">
                                   {b.translated_desc}
                               </span>
                               {b.benefit_type && (
                                 <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-gold border-gold/30 bg-gold/10 w-fit">
                                   {b.benefit_type}
                                 </Badge>
                               )}
                             </div>
                           </li>
                         ))
                      )}
                   </ul>
                </CardContent>
             </Card>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6">
                <Card variant="premium" className="overflow-hidden bg-[#063127] border-gold/30 shadow-xl">
                        <CardContent className="flex flex-col items-center pt-4 pb-2">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Leaf className="w-5 h-5 text-gold"/> 
                                {t('dashboard.startnext_dash.digital_asset_title')}
                            </h2>
                            <div className="w-full max-w-2xl transform hover:scale-[1.01] transition-normal">
                                <LandDollarDisplay user={user} profile={profile} landDollar={landDollar} loading={loading} />
                            </div>
                        </CardContent>
                </Card>
            </motion.div>

          </div>
          <div className="lg:col-span-1 space-y-8">
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                 <Card variant="soft" className="border-l-4 border-l-gold bg-[#063127] shadow-lg border-gold/20">
                    <CardContent className="pt-6">
                       <h3 className="font-black text-gray-300 mb-3 flex items-center gap-2 text-xl drop-shadow-sm">
                           <Trees className="w-6 h-6 text-gold" /> 
                           {t('dashboard.startnext_dash.rights_acquisition')}
                       </h3>
                       <p className="text-sm text-white/80 mb-6 leading-relaxed">
                           {t('dashboard.startnext_dash.rights_desc')}
                       </p>
                       <div className="bg-black/30 rounded-xl p-4 flex items-center justify-center border border-gold/20 shadow-inner">
                           <span className="flex items-center gap-2 text-gold font-bold text-sm">
                               <Lock className="w-4 h-4 text-gold" /> 
                               {t('dashboard.startnext_dash.system_locked')}
                           </span>
                       </div>
                    </CardContent>
                 </Card>
                 
             </motion.div>
             
             <ReforestaProjectWidget />
          </div>
       </div>
    </motion.div>
  );
};

const StatCard = ({ icon: Icon, iconColor, bgColor, label, value, highlight }) => (
  <Card variant="premium" className={`group bg-[#063127] border-gold/30 shadow-lg hover:shadow-glow transition-all`}>
     <CardContent className="flex items-center justify-between p-4">
       <div>
          <p className="text-sm font-medium text-white/70 mb-1">{label}</p>
          <h3 className={`${highlight ? 'text-2xl font-black text-gradient-gold drop-shadow-md mt-1' : 'text-2xl font-bold text-white'}`}>{value}</h3>
       </div>
       <div className={`p-3 rounded-xl ${bgColor} group-hover:scale-110 transition-normal shadow-sm`}>
           <Icon className={`w-6 h-6 ${iconColor}`}/>
       </div>
     </CardContent>
  </Card>
);

export default StartnextUserDashboard;