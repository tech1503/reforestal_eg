import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext'; 
import { useI18n } from '@/contexts/I18nContext';
import { useTranslation } from 'react-i18next'; 
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trees, Calendar, CreditCard, Leaf, Wallet, Coins, Lock, ShieldCheck, Clock, Package } from 'lucide-react';
import BenefitsDisplay from '@/components/ui/BenefitsDisplay';
import { format } from 'date-fns';
import LandDollarDisplay from '@/components/LandDollarDisplay';
import ReforestaProjectWidget from '@/components/ReforestaProjectWidget';
import { supabase } from '@/lib/customSupabaseClient';
//import { getBenefitIcon } from '@/components/Icons/CustomIcons';

const StartnextUserDashboard = () => {
  const { profile, user } = useAuth();
  const { currentLanguage } = useI18n();
  const { t } = useTranslation(); 
  
  const { userTier, tierBenefits, impactCredits, landDollar, contributions, loading } = useFinancial();
  const [pioneerStatus, setPioneerStatus] = useState('pending');

  useEffect(() => {
    if (user?.id) {
        const checkStatus = async () => {
            const { data } = await supabase.from('founding_pioneer_metrics').select('founding_pioneer_access_status').eq('user_id', user.id).maybeSingle();
            setPioneerStatus(data?.founding_pioneer_access_status || 'pending');
        };
        checkStatus();
    }
  }, [user]);

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-emerald-500"/></div>;

  const snxId = contributions?.imported_user_id ? 'SNX-IMP' : 'SNX-ACT';
  const tierName = userTier?.displayName || 'Explorer Standard';
  
  const displayBenefits = tierBenefits.map(b => {
      const trans = b.support_benefit_translations?.find(t => t.language_code === currentLanguage) 
                || b.support_benefit_translations?.find(t => t.language_code === 'en');
      return {
          ...b,
          translated_desc: trans?.description || t('dashboard.startnext_dash.benefit_available')
      };
  });

  const landDollarDisplayValue = landDollar ? (
      <span className="text-emerald-600 text-lg">{t('dashboard.startnext_dash.active_asset')}</span>
  ) : t('dashboard.startnext_dash.pending');

  const isPioneerApproved = pioneerStatus === 'approved';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 py-4">
       
       {/* SECCIÓN LAND DOLLAR */}
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8">
           <Card variant="premium" className="overflow-hidden bg-card border-border">
                <CardContent className="flex flex-col items-center">
                    <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
                        <Leaf className="w-8 h-8 text-emerald-500"/> 
                        {t('dashboard.startnext_dash.digital_asset_title')}
                    </h2>
                    <div className="w-full max-w-4xl transform hover:scale-[1.01] transition-normal">
                        <LandDollarDisplay user={user} landDollar={landDollar} />
                    </div>
                </CardContent>
           </Card>
       </motion.div>

       {/* HERO WELCOME */}
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="relative overflow-hidden rounded-3xl shadow-premium p-10 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <div className="absolute top-0 right-0 w-2/3 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                 <div className="flex items-center gap-3 mb-4">
                    {/* BADGE DE ESTADO PIONERO */}
                    <Badge className={`border-0 px-4 py-1.5 backdrop-blur-md shadow-sm flex items-center gap-2 ${isPioneerApproved ? 'bg-white/20 text-white' : 'bg-amber-500/80 text-white'}`}>
                        {isPioneerApproved ? (
                            <><ShieldCheck className="w-4 h-4"/> {t('dashboard.pioneer_status.active')}</>
                        ) : (
                            <><Clock className="w-4 h-4"/> {t('pioneer.restricted.pending', 'Pioneer Review')}</>
                        )}
                    </Badge>
                    <span className="text-xs font-mono text-emerald-100 bg-black/20 px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
                        <ShieldCheck className="w-3 h-3"/> {snxId}
                    </span>
                 </div>
                 <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-sm">
                    {t('dashboard.pioneer_status.welcome', { name: profile?.name || 'Explorer' })}
                 </h1>
                 <p className="text-emerald-50 text-lg max-w-xl font-medium leading-relaxed">
                    {t('dashboard.startnext_dash.hero_msg')}
                 </p>
              </div>
              
              {/* TIER BADGE */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-lg flex flex-col items-center min-w-[200px] hover:bg-white/15 transition-normal">
                 <div className="w-14 h-14 text-gold mb-3 filter drop-shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                        <path d="M3 20l5-10 4 6 5-8 4 12H3z" />
                        <path d="M8 20c0-4 3-6 4-6s4 2 4 6" />
                    </svg>
                 </div>
                 <span className="text-xs text-emerald-100 uppercase font-bold tracking-widest mb-1">{t('dashboard.pioneer_status.current_tier')}</span>
                 <span className="text-2xl font-bold text-white text-center leading-tight">
                    {tierName}
                 </span>
              </div>
          </div>
       </motion.div>

       {/* METRICS ROW */}
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={Calendar} 
            iconColor="text-emerald-600" 
            bgColor="bg-emerald-50" 
            label={t('dashboard.startnext_dash.contribution_date')} 
            value={contributions ? format(new Date(contributions.contribution_date), 'MMM d, yyyy') : '-'} 
          />
          <StatCard 
            icon={CreditCard} 
            iconColor="text-blue-500" 
            bgColor="bg-blue-50" 
            label={t('dashboard.startnext_dash.total_contribution')} 
            value={`€${(Number(contributions?.contribution_amount) || 0).toFixed(2)}`} 
          />
          <StatCard 
            icon={Wallet} 
            iconColor="text-green-600" 
            bgColor="bg-green-50" 
            label={t('dashboard.land_dollar.title')} 
            value={landDollarDisplayValue} 
            highlight 
          />
          <StatCard 
            icon={Coins} 
            iconColor="text-gold" 
            bgColor="bg-yellow-50" 
            label={t('dashboard.impact_credits')} 
            value={(impactCredits || 0).toFixed(0)} 
            highlight 
          />
       </motion.div>

       {/* BENEFITS GRID */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <BenefitsDisplay benefits={displayBenefits} tierName={tierName} loading={loading} />
          </div>
          <div className="lg:col-span-1 space-y-8">
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                 <Card variant="soft" className="border-l-4 border-l-gold bg-card">
                    <CardContent className="pt-6">
                       <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-xl">
                           <Trees className="w-6 h-6 text-gold" /> 
                           {t('dashboard.startnext_dash.rights_acquisition')}
                       </h3>
                       <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                           {t('dashboard.startnext_dash.rights_desc')}
                       </p>
                       <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center border border-border shadow-inner">
                           <span className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
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
  <Card variant="premium" className="group bg-card border-border">
     <CardContent className="flex items-center justify-between p-4">
       <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          <h3 className={`text-2xl font-bold ${highlight ? 'text-foreground' : 'text-foreground/90'}`}>{value}</h3>
       </div>
       <div className={`p-3 rounded-xl ${bgColor} dark:bg-muted group-hover:scale-110 transition-normal shadow-sm`}>
           <Icon className={`w-6 h-6 ${iconColor}`}/>
       </div>
     </CardContent>
  </Card>
);

export default StartnextUserDashboard;