import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext'; 
import { useI18n } from '@/contexts/I18nContext';
import { useTranslation } from 'react-i18next'; 
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Lista de iconos completa
import { Loader2, Trees, CreditCard, Leaf, Wallet, Coins, Lock, ShieldCheck, X, Clock, CheckCircle2, Zap, Calendar } from 'lucide-react';

import LandDollarDisplay from '@/components/LandDollarDisplay';
import ReforestaProjectWidget from '@/components/ReforestaProjectWidget';
import { supabase } from '@/lib/customSupabaseClient';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { calculateDynamicCredits } from '@/utils/tierLogicUtils';
import { format, differenceInDays } from 'date-fns';

const StartnextUserDashboard = () => {
  const { profile, user } = useAuth();
  const { currentLanguage } = useI18n();
  const { t } = useTranslation(); 
  
  const { userTier, tierBenefits, impactCredits, landDollar, contributions, loading } = useFinancial();
  const [pioneerStatus, setPioneerStatus] = useState('pending');
  const [showWelcome, setShowWelcome] = useState(true);
  const [userBenefit, setUserBenefit] = useState(null); 

  useEffect(() => {
    if (user?.id) {
        const checkStatus = async () => {
            const { data } = await supabase.from('founding_pioneer_metrics').select('founding_pioneer_access_status').eq('user_id', user.id).maybeSingle();
            setPioneerStatus(data?.founding_pioneer_access_status || 'pending');
        };
        
        const fetchBenefitData = async () => {
            const { data } = await supabase
                .from('user_benefits')
                .select('assigned_date, expires_at')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .maybeSingle();
            
            if (data) {
                setUserBenefit(data);
            }
        };

        checkStatus();
        fetchBenefitData();
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
      const trans = b.support_benefit_translations?.find(trans => trans.language_code === currentLanguage) 
                || b.support_benefit_translations?.find(trans => trans.language_code === 'en');
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

       {/* FILA SUPERIOR REDISEÑADA: Todas las tarjetas con estilo Premium */}
       <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Tarjeta de Contribución Total */}
          <StatCard 
            icon={CreditCard} 
            iconColor="text-[#063127]" 
            bgColor="bg-gradient-gold shadow-glow" 
            label={t('dashboard.startnext_dash.total_contribution')} 
            value={formatCurrency(contributions?.contribution_amount)} 
            highlight 
          />
          
          {/* Reloj Contador (Centro) */}
          <PremiumCountdown benefitData={userBenefit} t={t} />
          
          {/* Tarjeta de Bonos (Bonus Points) */}
          <StatCard 
            icon={Coins} 
            iconColor="text-[#063127]" 
            bgColor="bg-gradient-gold shadow-glow" 
            label={t('dashboard.impact_credits')} 
            value={formatNumber(impactCredits)} 
            highlight 
          />
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

// ==========================================
// COMPONENTE: StatCard (Rediseño Premium)
// ==========================================
const StatCard = ({ icon: Icon, iconColor, bgColor, label, value, highlight }) => (
  <Card variant="premium" className="group relative overflow-hidden bg-[#063127] border-gold/30 shadow-lg hover:shadow-glow transition-all flex flex-col justify-center h-full min-h-[160px]">
     {/* Textura de fondo */}
     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
     
     {/* Icono de fondo gigante */}
     <div className="absolute -top-6 -right-6 opacity-10 group-hover:opacity-20 transition-all duration-700 pointer-events-none rotate-12">
        <Icon className="w-36 h-36 text-gold" />
     </div>

     <CardContent className="relative z-10 p-5 flex flex-col justify-between h-full">
       <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-2xl ${bgColor} border border-gold/20 group-hover:scale-110 transition-all duration-500 shadow-glow`}>
              <Icon className={`w-6 h-6 ${iconColor}`}/>
          </div>
          {/* Elemento decorativo */}
          <div className="h-1 w-12 bg-gold/20 rounded-full overflow-hidden">
             <div className="h-full bg-gold/40 w-2/3 rounded-full" />
          </div>
       </div>

       <div>
          <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em] mb-1 opacity-80">{label}</p>
          <h3 className="text-3xl font-black text-white drop-shadow-md tracking-tight">
            {value}
          </h3>
       </div>
     </CardContent>
  </Card>
);

// ==========================================
// COMPONENTE: PremiumCountdown (Mezcla Visual)
// ==========================================
const PremiumCountdown = ({ benefitData, t }) => {
    // Si no hay datos, mostramos una versión "Pendiente" con el mismo estilo
    if (!benefitData?.expires_at || !benefitData?.assigned_date) {
        return (
            <StatCard 
                icon={Wallet} 
                iconColor="text-[#063127]" 
                bgColor="bg-gradient-gold" 
                label={t('dashboard.land_dollar.title', 'Acceso Premium')} 
                value={t('dashboard.startnext_dash.pending', 'Pendiente')}
            />
        );
    }
  
    const startDate = new Date(benefitData.assigned_date);
    const endDate = new Date(benefitData.expires_at);
    const today = new Date();
  
    const daysRemaining = Math.max(0, differenceInDays(endDate, today));
    const totalDays = Math.max(1, differenceInDays(endDate, startDate));
    const percentage = Math.min(100, Math.max(0, ((totalDays - daysRemaining) / totalDays) * 100));
  
    if (daysRemaining === 0) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full">
            <Card variant="soft" className="relative overflow-hidden border-l-4 border-l-red-500 bg-[#063127] shadow-lg border-red-500/20 h-full flex flex-col justify-center min-h-[160px]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                <CardContent className="pt-6">
                    <p className="text-red-400 font-bold text-center">
                        {t('dashboard.premium_countdown.expired_message', 'Tu acceso Premium ha expirado.')}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
      );
    }
  
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="h-full">
            <Card variant="premium" className="relative overflow-hidden bg-[#063127] border-gold/30 shadow-glow h-full flex flex-col justify-center min-h-[160px]">
                {/* Textura e Icono de fondo */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                <div className="absolute -top-6 -right-6 opacity-10 pointer-events-none rotate-12">
                    <Clock className="w-36 h-36 text-gold" />
                </div>
                
                <CardContent className="relative z-10 p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-gold" />
                            <h3 className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-200 uppercase tracking-[0.15em]">
                                {t('dashboard.land_dollar.title', 'Acceso Premium')}
                            </h3>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-[9px] px-2 py-0 uppercase font-bold">
                            {t('common.active', 'Activo')}
                        </Badge>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-black text-white drop-shadow-md">{daysRemaining}</span>
                        <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                            {t('dashboard.premium_countdown.days_remaining_end', 'días restantes')}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] text-white/40 mb-3 font-bold uppercase tracking-tight">
                        <Calendar className="w-3 h-3" />
                        <span>{t('dashboard.premium_countdown.expires_on', 'Vence el {{date}}', { date: format(endDate, 'dd/MM/yyyy') })}</span>
                    </div>
                    
                    {/* Barra de Progreso Inyectada */}
                    <div className="w-full bg-black/50 rounded-full h-1.5 border border-white/5 overflow-hidden shadow-inner mt-auto">
                        <div 
                            className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-gold h-full rounded-full transition-all duration-1000 relative" 
                            style={{ width: `${100 - percentage}%` }}
                        >
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default StartnextUserDashboard;