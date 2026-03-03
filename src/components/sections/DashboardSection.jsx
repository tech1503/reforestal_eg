import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle, ShieldCheck, Package, ExternalLink, Coins, Leaf, Calendar, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useFinancial } from '@/contexts/FinancialContext'; 
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/contexts/I18nContext';
import { useTranslation } from 'react-i18next'; 
import LandDollarDisplay from '@/components/LandDollarDisplay';
import { 
    fetchSupportLevelsForLogic, 
    getSupportLevelByAmount, 
    getVariantDetails,
    calculateDynamicCredits 
} from '@/utils/tierLogicUtils';
import { Loader2 } from 'lucide-react';
import { getVariantIcon, getBenefitIcon } from '@/components/Icons/CustomIcons';
import ReforestaProjectWidget from '@/components/ReforestaProjectWidget';
import { STARTNEXT_PROJECT_URL } from '@/constants/urls';
import { format } from 'date-fns';
import StartnextSupportModal from '@/components/ui/StartnextSupportModal'; 
//import LeafBackground from '@/components/ui/LeafBackground'; 

const DashboardSection = () => {
  const { user, profile } = useAuth();
  const { currentLanguage } = useI18n();
  const { t } = useTranslation(); 
  
  const { landDollar, impactCredits, loading: financialLoading } = useFinancial();

  const [startnextData, setStartnextData] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);

  // Estados del Simulador y Modal
  const [simAmount, setSimAmount] = useState('');
  const [simVariant, setSimVariant] = useState(null);
  const [allVariants, setAllVariants] = useState([]);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false); 

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
            .from('startnext_contributions')
            .select(`
                *, 
                imported_user:imported_user_id(snx_id), 
                support_levels:new_support_level_id(
                    id, slug, 
                    support_benefits(id, benefit_type, icon_name, display_order, is_active, support_benefit_translations(language_code, description)), 
                    support_level_translations(language_code, name)
                )
            `)
            .eq('user_id', user.id)
            .order('contribution_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) {
            let processedBenefits = [];
            let levelName = 'Legacy Tier';
            
            if (data.support_levels) {
              const sl = data.support_levels;
              const slTrans = sl.support_level_translations?.find(t => t.language_code === currentLanguage) 
                           || sl.support_level_translations?.find(t => t.language_code === 'en');
              levelName = slTrans?.name || sl.slug;
              
              processedBenefits = (sl.support_benefits || [])
                .filter(b => b.is_active === true)
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map(b => {
                  const bTrans = b.support_benefit_translations?.find(t => t.language_code === currentLanguage) 
                              || b.support_benefit_translations?.find(t => t.language_code === 'en');
                  return { 
                      description: bTrans?.description || 'Benefit', 
                      type: b.benefit_type, 
                      icon_name: b.icon_name 
                  };
                });
            }
            setStartnextData({ ...data, levelName, processedBenefits });
        }
        
        const levels = await fetchSupportLevelsForLogic();
        const enriched = await Promise.all(levels.map(async (l) => {
            const details = await getVariantDetails(l.id, currentLanguage);
            const { data: bData } = await supabase.from('support_benefits')
                .select('benefit_type, icon_name, support_benefit_translations(language_code, description)')
                .eq('support_level_id', l.id)
                .eq('is_active', true);

            const benefits = (bData || []).map(b => ({
                type: b.benefit_type,
                description: b.support_benefit_translations?.find(t => t.language_code === currentLanguage)?.description || 'Benefit',
                icon_name: b.icon_name
            }));

            return { ...l, ...details, benefits };
        }));
        setAllVariants(enriched);

      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLocalLoading(false);
      }
    };

    fetchData();
  }, [user, currentLanguage]);

  useEffect(() => {
    const runSim = async () => {
      if (!simAmount || isNaN(parseFloat(simAmount)) || parseFloat(simAmount) <= 0) { 
          setSimVariant(null); 
          return; 
      }
      
      const amountVal = parseFloat(simAmount);
      const id = await getSupportLevelByAmount(amountVal);
      
      if (id) {
        const details = await getVariantDetails(id, currentLanguage);
        const { data: bData } = await supabase.from('support_benefits')
            .select('benefit_type, support_benefit_translations(language_code, description)')
            .eq('support_level_id', id)
            .eq('is_active', true);
        
        const benefits = (bData || []).map(b => ({
            type: b.benefit_type,
            description: b.support_benefit_translations?.find(t => t.language_code === currentLanguage)?.description || 'Benefit'
        }));

        const dynamicCredits = calculateDynamicCredits(amountVal);

        setSimVariant({ 
            ...details, 
            impact_credits_reward: dynamicCredits, 
            benefits 
        });
      } else { 
          setSimVariant(null); 
      }
    };

    const timer = setTimeout(runSim, 200); 
    return () => clearTimeout(timer);
  }, [simAmount, currentLanguage]);


  if (localLoading || financialLoading) return <div className="flex justify-center h-[60vh] items-center"><Loader2 className="animate-spin w-12 h-12 text-[#5b8370]"/></div>;

  // --- VISTA 1: EXPLORER / SIMULADOR ---
  if (!startnextData && !(profile?.role === 'admin')) {
    const registrationDate = user?.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-';
    const landDollarStatus = landDollar ? 'Active' : 'Pending';

    return (
      <div className="relative w-full min-h-screen">

        <div className="relative z-10 space-y-12 max-w-6xl mx-auto pb-12 pt-6">
            
            <StartnextSupportModal 
                isOpen={isSupportModalOpen} 
                onClose={() => setIsSupportModalOpen(false)} 
                initialAmount={simAmount} 
            />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-8">

            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#053127] to-[#5b8370] dark:from-[#5b8370] dark:to-[#c2d2c1] drop-shadow-sm">
                {t('dashboard.explorer.title')}
            </h1>
            <p className="text-xl text-[#5b8370] max-w-2xl mx-auto font-light leading-relaxed">
                {t('dashboard.explorer.subtitle')}
            </p>
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }} 
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            >
                <StatCard icon={Calendar} iconColor="text-blue-500" bgColor="bg-blue-50 dark:bg-blue-900/20" label="Registration Date" value={registrationDate} />
                <StatCard icon={Wallet} iconColor="text-green-600" bgColor="bg-green-50 dark:bg-green-900/20" label={t('dashboard.land_dollar.title')} value={<span className="text-[#5b8370]">{landDollarStatus}</span>} highlight />
                <StatCard icon={Coins} iconColor="text-gold" bgColor="bg-yellow-50 dark:bg-yellow-900/20" label={t('dashboard.impact_credits')} value={(impactCredits || 0).toFixed(0)} highlight />
            </motion.div>

            {/* --- SECCIÓN : WIDGET Y LAND DOLLAR DISPLAY --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="shadow-premium rounded-3xl overflow-hidden h-full">
                    <ReforestaProjectWidget />
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg border border-border p-6 flex flex-col items-center text-center h-full justify-center">
                    <div className="mb-4">
                        <h3 className="text-2xl font-bold text-[#5b8370] dark:text-[#c2d2c1] mb-2 flex items-center justify-center gap-2">
                            <Leaf className="w-6 h-6 text-emerald-500"/> {t('dashboard.assets.digital_asset_title')}
                        </h3>
                        <p className="text-sm text-[#5b8370]">
                            {t('dashboard.land_dollar.certificate_text')}
                        </p>
                    </div>
                    
                    <div className="w-full max-w-md transform hover:scale-[1.02] transition-normal">
                        <LandDollarDisplay user={user} landDollar={landDollar} />
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <div className="lg:col-span-5">
                <Card variant="premium" className="border-2 border-[#5b8370]/30 bg-card/95 backdrop-blur-sm sticky top-24">
                <CardContent className="pt-8">
                    <h3 className="text-2xl font-bold text-[#053127] dark:text-[#c2d2c1] mb-6 flex items-center gap-3">
                    <Info className="w-6 h-6 text-emerald-500" /> {t('dashboard.explorer.simulator_title')}
                    </h3>
                    <div className="space-y-8">
                    <div className="relative group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#5b8370] font-bold text-2xl transition-colors">€</span>
                        <Input 
                            type="number" 
                            placeholder="50" 
                            min="0"
                            className="pl-12 text-4xl h-20 bg-background font-bold tracking-wide border-2 focus:border-[#5b8370] text-[#053127] dark:text-[#c2d2c1]" 
                            value={simAmount} 
                            onChange={(e) => setSimAmount(e.target.value)} 
                        />
                        <p className="text-xs text-[#5b8370] mt-2 text-right">
                            {t('dashboard.explorer.simulator_hint', 'Ingresa cualquier monto (Mín. €5)')}
                        </p>
                    </div>
                    
                    <AnimatePresence mode="wait">
                        {simVariant ? (
                        <motion.div key={simVariant.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#053127] to-[#5b8370] p-4 rounded-2xl border border-[#c2d2c1]/20 shadow-lg text-center">
                            <div className="w-16 h-16 mx-auto mb-4 text-[#053127] drop-shadow-md bg-[#c2d2c1] rounded-full p-2">{getVariantIcon(simVariant.slug)}</div>
                            <Badge className="bg-[#c2d2c1] text-[#053127] border-0 text-sm px-3 py-1 mb-2 uppercase tracking-wide">{simVariant.logical_name}</Badge>
                            <h4 className="text-3xl font-bold text-[#c2d2c1] mb-1">{simVariant.variant_title}</h4>
                            
                            <div className="flex flex-col gap-2 mb-6 bg-white/90 dark:bg-black/20 p-4 rounded-xl border border-white/10 mt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[#053127] dark:text-[#c2d2c1] font-medium">{t('dashboard.impact_credits')}</span>
                                    <span className="text-lg font-bold text-green-600 flex items-center gap-1">
                                        <Coins className="w-5 h-5"/> {simVariant.impact_credits_reward.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full h-px bg-[#c2d2c1]/30 my-1"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[#053127] dark:text-[#c2d2c1] font-medium">Land Dollars</span>
                                    <span className="text-lg font-bold text-green-600 flex items-center gap-1">
                                        <Leaf className="w-4 h-4"/> {simVariant.land_dollars_reward.toLocaleString()} LD Pyshical
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-dashed border-white/20 text-left space-y-3">
                            {simVariant.benefits?.map((b, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm text-[#c2d2c1]">
                                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="font-medium">{b.description}</span>
                                </div>
                            ))}
                            </div>

                            <div className="mt-6 flex flex-col gap-3">
                                <Button 
                                    className="w-full btn-primary text-lg h-12 shadow-lg" 
                                    onClick={() => window.open(STARTNEXT_PROJECT_URL, '_blank')}
                                >
                                    {t('dashboard.explorer.support_btn')} <ExternalLink className="ml-2 w-5 h-5" />
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full h-12 border-[#c2d2c1]/30 text-[#c2d2c1] hover:bg-[#c2d2c1]/10 hover:text-white"
                                    onClick={() => setIsSupportModalOpen(true)}
                                >
                                    {t('exchange.cta.support_startnext', 'I already supported')}
                                </Button>
                            </div>

                        </motion.div>
                        ) : (
                        <div className="text-center p-10 text-[#5b8370] border-2 border-dashed border-[#5b8370]/30 rounded-2xl bg-[#5b8370]/5">
                            {t('dashboard.explorer.empty_state')}
                        </div>
                        )}
                    </AnimatePresence>
                    </div>
                </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 gap-4">
                {allVariants.map(v => {
                const isHighlighted = simVariant && simVariant.id === v.id;
                
                return (
                <div 
                    key={v.id} 
                    onClick={() => setSimAmount(v.min_amount.toString())} 
                    className={`
                        flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl border cursor-pointer transition-all duration-300 group
                        ${isHighlighted 
                            ? 'bg-[#c2d2c1]/20 border-[#5b8370] shadow-md scale-[1.02] ring-1 ring-[#5b8370]' 
                            : 'bg-card/80 backdrop-blur-sm border-border shadow-sm hover:shadow-md hover:border-[#5b8370]/50 hover:bg-muted/50'
                        }
                    `}
                >
                    <div className={`w-14 h-14 shrink-0 rounded-xl p-3 transition-colors ${isHighlighted ? 'bg-[#5b8370] text-[#c2d2c1]' : 'bg-[#c2d2c1]/30 text-[#5b8370] group-hover:text-[#053127] dark:group-hover:text-white'}`}>
                        {getVariantIcon(v.slug)}
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left">
                    <h4 className={`font-bold text-lg transition-colors ${isHighlighted ? 'text-[#5b8370]' : 'text-[#053127] dark:text-[#c2d2c1] group-hover:text-[#5b8370]'}`}>{v.variant_title}</h4>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-1">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-300 px-2 py-1 rounded">
                            {t('dashboard.explorer.min_amount')} €{v.min_amount}
                        </span>
                        <span className="text-xs font-bold text-[#053127] dark:text-[#c2d2c1] bg-[#c2d2c1]/50 px-2 py-1 rounded flex items-center gap-1 border border-[#c2d2c1]/30">
                            Base: {v.impact_credits_reward} <Coins className="w-3 h-3" />
                        </span>
                    </div>
                    </div>
                </div>
                );
                })}
            </div>
            </div>
        </div>
      </div>
    );
  }

  const snxId = startnextData?.imported_user?.snx_id || `SNX-ACT-${user?.id?.slice(0, 4)}`;
  const tierDisplayName = startnextData?.levelName || 'Explorer';

  return (
    <div className="relative w-full min-h-screen">

       <div className="relative z-10 space-y-12 pb-16 pt-6">
        <ReforestaProjectWidget />

        <Card variant="premium" className="overflow-hidden border-0 shadow-premium bg-card/90 backdrop-blur-sm">
            <div className="bg-gradient-to-r from-[#053127] to-[#5b8370] p-10 md:p-14 text-[#c2d2c1] relative">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                <div>
                <div className="flex items-center gap-3 mb-6">
                    <Badge className="bg-[#5b8370] text-[#c2d2c1] border-0 px-4 py-1.5 backdrop-blur-md">{t('dashboard.pioneer_status.active')}</Badge>
                    <span className="text-xs font-mono text-[#c2d2c1] bg-black/20 px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> {snxId}
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md text-[#c2d2c1]">
                    {t('dashboard.pioneer_status.welcome', { name: profile?.name || 'Explorer' })}
                </h1>
                <p className="text-[#c2d2c1]/90 text-lg max-w-xl font-medium leading-relaxed opacity-90">
                    {t('dashboard.pioneer_status.verified_msg')}
                </p>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-[#053127]/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-glow flex flex-col items-center min-w-[200px]">
                        <div className="w-12 h-12 text-gold mb-2 filter drop-shadow-md">{getVariantIcon(startnextData?.levelName || '')}</div>
                        <span className="text-xs text-[#c2d2c1]/70 uppercase font-bold tracking-widest mb-1">{t('dashboard.pioneer_status.current_tier')}</span>
                        <span className="text-xl font-bold text-white text-center">{tierDisplayName}</span> 
                    </div>
                    <div className="bg-[#053127]/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-glow flex flex-col items-center min-w-[200px]">
                        <div className="w-12 h-12 text-[#c2d2c1] mb-2 filter drop-shadow-md p-2 bg-[#5b8370]/40 rounded-full">
                            <Coins className="w-8 h-8 text-amber-500" />
                        </div>
                        <span className="text-xs text-[#c2d2c1]/70 uppercase font-bold tracking-widest mb-1">{t('dashboard.impact_credits')}</span>
                        <span className="text-xl font-bold text-white text-center">{(impactCredits || 0).toLocaleString()} </span>
                    </div>
                </div>
            </div>
            </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-[#5b8370]/20 rounded-2xl shadow-sm"><Leaf className="w-6 h-6 text-emerald-500" /></div>
                <h3 className="text-2xl font-bold text-[#053127] dark:text-[#c2d2c1]">{t('dashboard.assets.digital_asset_title')}</h3>
            </div>

            <div className="hover:scale-[1.01] transition-normal duration-500">
                <LandDollarDisplay user={user} landDollar={landDollar} />
            </div>
            </motion.div>

            <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#c2d2c1]/30 rounded-2xl shadow-sm"><Package className="w-6 h-6 text-blue-600" /></div>
                <h3 className="text-2xl font-bold text-[#053127] dark:text-[#c2d2c1]">{t('dashboard.rewards.title')}</h3>
                </div>
                <Card variant="soft" className="overflow-hidden border-0 bg-card/90 backdrop-blur-sm">
                <CardContent className="p-0">
                    <ul className="divide-y divide-border">
                    {(startnextData?.processedBenefits || []).map((b, i) => (
                        <motion.li key={`ben-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (i * 0.1) }} className="flex items-start gap-5 p-6 hover:bg-muted/30 transition-colors group">
                        <div className="mt-1 bg-muted/10 p-3 rounded-xl border border-border group-hover:border-[#5b8370] group-hover:scale-110 transition-all shadow-sm">
                            {getBenefitIcon(b.description, b.type, b.icon_name)}
                        </div>
                        <div className="flex-1">
                            <span className="font-bold text-lg text-[#053127] dark:text-[#c2d2c1] block mb-2 group-hover:text-[#5b8370] transition-colors">{b.description}</span>
                            {b.type && (<Badge variant="outline" className="text-[10px] uppercase tracking-wider text-[#5b8370] border-border">{b.type}</Badge>)}
                        </div>
                        <div className="mt-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-6 h-6 text-emerald-500" /></div>
                        </motion.li>
                    ))}
                    </ul>
                </CardContent>
                </Card>
            </motion.div>
            </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, iconColor, bgColor, label, value, highlight }) => (
    <Card variant="premium" className="group bg-card/90 backdrop-blur-sm border-border">
       <CardContent className="flex items-center justify-between p-4">
         <div>
            <p className="text-xs font-bold text-[#5b8370] dark:text-[#c2d2c1] uppercase tracking-wide mb-1">{label}</p>
            <h3 className={`text-xl font-bold ${highlight ? 'text-[#5b8370]' : 'text-[#5b8370] dark:text-[#c2d2c1]'}`}>{value}</h3>
         </div>
         <div className={`p-2.5 rounded-xl ${bgColor} group-hover:scale-110 transition-normal shadow-sm`}>
             <Icon className={`w-5 h-5 ${iconColor}`}/>
         </div>
       </CardContent>
    </Card>
);

export default DashboardSection;