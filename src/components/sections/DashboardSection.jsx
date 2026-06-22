import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle, ShieldCheck, Package, ExternalLink, Coins, Leaf, Zap, Calendar, Wallet, Users, Target, Rocket, Key } from 'lucide-react';
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
import { getBenefitIcon } from '@/components/Icons/CustomIcons';
import ReforestaProjectWidget from '@/components/ReforestaProjectWidget';
import { STARTNEXT_PROJECT_URL } from '@/constants/urls';
import { format, differenceInDays } from 'date-fns';
import StartnextSupportModal from '@/components/ui/StartnextSupportModal'; 
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const TIER_IMAGES = {
  'explorer_mountain_spring': '', 
  'explorer_mountain_stream': '/src/assets/Plan1.png', 
  'explorer_cash_flow': '',       
  'explorer_riverbed': '/src/assets/Plan2.png',        
  'explorer_lifeline': '/src/assets/Plan3.png'         
};

const getTierImage = (slug) => {
    const s = (slug || '').toLowerCase();
    if (s.includes('spring') || s.includes('quelle')) return TIER_IMAGES['explorer_mountain_spring'];
    if (s.includes('stream') || s.includes('bach')) return TIER_IMAGES['explorer_mountain_stream'];
    if (s.includes('cash_flow') || s.includes('geldfluss')) return TIER_IMAGES['explorer_cash_flow'];
    if (s.includes('river') || s.includes('fluss')) return TIER_IMAGES['explorer_riverbed'];
    if (s.includes('lifeline') || s.includes('lebensader')) return TIER_IMAGES['explorer_lifeline'];
    return 'https://images.unsplash.com/photo-1511497584788-876760111969?w=400&q=80'; 
};


const DashboardSection = () => {
  const { user, profile } = useAuth();
  const { currentLanguage } = useI18n();
  const { t } = useTranslation(); 
  
  const { landDollar, impactCredits, loading: financialLoading } = useFinancial();

  const [startnextData, setStartnextData] = useState(null);
  const [userBenefit, setUserBenefit] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);

  const [simAmount, setSimAmount] = useState('');
  const [simVariant, setSimVariant] = useState(null);
  const [allVariants, setAllVariants] = useState([]);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false); 
  const [isLandDollarModalOpen, setIsLandDollarModalOpen] = useState(false);

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
            let levelName = 'Legacy Tier';
       
            const dynamicCredits = calculateDynamicCredits(data.contribution_amount);
            
            let processedBenefits = [
                {
                    description: `+${formatNumber(dynamicCredits)} ${t('rewards.bonus_points', 'Bonos')} (${t('dashboard.startnext_dash.total_contribution', 'Aporte')})`,
                    type: 'digital',
                    icon_name: 'zap'
                }
            ];
            
            if (data.support_levels) {
              const sl = data.support_levels;
              const slTrans = sl.support_level_translations?.find(t => t.language_code === currentLanguage) 
                           || sl.support_level_translations?.find(t => t.language_code === 'en');
              levelName = slTrans?.name || sl.slug;
              
              const dbBenefits = (sl.support_benefits || [])
                .filter(b => b.is_active === true && b.icon_name !== 'credit' && b.icon_name !== 'star')
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
                
              processedBenefits = [...processedBenefits, ...dbBenefits];
            }
            setStartnextData({ ...data, levelName, processedBenefits });
        }
        
        // Fetch Beneficios Premium 
        const { data: benefitRes } = await supabase
            .from('user_benefits')
            .select('assigned_date, expires_at')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();
            
        if (benefitRes) {
            setUserBenefit(benefitRes);
        }

        // Fetch de niveles de soporte (simulador)
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
  }, [user, currentLanguage, t]);

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

  // =========================================================================
  // VISTA 1: USUARIOS NUEVOS O SIN STARTNEXT (CON SIMULADOR)
  // =========================================================================
  if (!startnextData && !(profile?.role === 'admin')) {
    const registrationDate = user?.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-';
    const landDollarStatus = landDollar ? t('common.active', 'Activo') : t('dashboard.startnext_dash.pending', 'Pendiente');

    return (
      <div className="relative w-full min-h-screen">
        <div className="relative z-10 space-y-12 max-w-6xl mx-auto pb-12 pt-6">
            <StartnextSupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} initialAmount={simAmount} />
            <LandDollarInfoModal isOpen={isLandDollarModalOpen} onClose={() => setIsLandDollarModalOpen(false)} t={t} />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-8">
            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#053127] to-[#5b8370] dark:from-[#5b8370] dark:to-[#c2d2c1] drop-shadow-sm">
                {t('dashboard.explorer.title', 'Bienvenido a Reforestal')}
            </h1>
            <p className="text-xl text-[#5b8370] max-w-2xl mx-auto font-light leading-relaxed">
                {t('dashboard.explorer.subtitle', 'Asegura tu parcela de selva tropical, gana puntos y sé parte de la revolución.')}
            </p>
            </motion.div>

            {/* FILA SUPERIOR REDISEÑADA ESTILO PREMIUM (SIN RELOJ) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-stretch">
                <StatCard 
                    icon={Calendar} 
                    iconColor="text-[#063127]" 
                    bgColor="bg-gradient-gold shadow-glow" 
                    label={t('dashboard.registration_date', 'Fecha de Registro')} 
                    value={registrationDate} 
                />
                <StatCard 
                    icon={Wallet} 
                    iconColor="text-[#063127]" 
                    bgColor="bg-gradient-gold shadow-glow" 
                    label={t('dashboard.land_dollar.title.simple', 'Land Dollar Status')} 
                    value={landDollarStatus} 
                />
                <StatCard 
                    icon={Coins} 
                    iconColor="text-[#063127]" 
                    bgColor="bg-gradient-gold shadow-glow" 
                    label={t('dashboard.impact_credits', 'Impact Credits')} 
                    value={formatNumber(impactCredits)} 
                />
            </motion.div>

            <ProjectVisionWidget t={t} setIsSupportModalOpen={setIsSupportModalOpen} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="shadow-premium rounded-3xl overflow-hidden h-full">
                    <ReforestaProjectWidget />
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg border border-border p-6 flex flex-col items-center text-center h-full justify-center relative">
                    
                    {/* BOTÓN DE INFORMACIÓN DEL LAND DOLLAR */}
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsLandDollarModalOpen(true)}
                        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-gradient-gold text-[#063127] rounded-full transition-all shadow-glow z-20"
                    >
                        <span className="text-xs font-bold">{t('dashboard.land_dollar.button_quest', '¿Qué es el Land Dollar?')}</span>
                        <Info className="w-4 h-4" />
                    </motion.button>

                    <div className="mb-4 mt-8">
                        <h3 className="text-2xl font-bold text-[#5b8370] dark:text-[#c2d2c1] mb-2 flex items-center justify-center gap-2">
                            <Leaf className="w-6 h-6 text-emerald-500"/> {t('dashboard.assets.digital_asset_title', 'Tu Activo Digital')}
                        </h3>
                        <p className="text-sm text-[#5b8370]">
                            {t('dashboard.land_dollar.certificate_text', 'Al participar en nuestra campaña, este certificado se activará vinculándote legalmente con tus m² en el Amazonas.')}
                        </p>
                    </div>
                    
                    <div className="w-full max-w-md transform hover:scale-[1.02] transition-normal">
                        <LandDollarDisplay user={user} profile={profile} landDollar={landDollar} loading={financialLoading} />
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
                <Card variant="premium" className="border-2 border-[#5b8370]/30 bg-card/95 backdrop-blur-sm sticky top-24">
                <CardContent className="pt-8">
                    <h3 className="text-2xl font-bold text-[#053127] dark:text-[#c2d2c1] mb-6 flex items-center gap-3">
                    <Info className="w-6 h-6 text-emerald-500" /> {t('dashboard.explorer.simulator_title', 'Simulador Startnext')}
                    </h3>
                    <div className="space-y-8">
                    <div className="relative group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gold font-bold text-2xl transition-colors">€</span>
                        <Input 
                            type="number" placeholder="0" min="0"
                            className="pl-12 text-4xl h-20 bg-background font-bold tracking-wide border-2 focus:border-gold text-[#053127] dark:text-[#c2d2c1]" 
                            value={simAmount} onChange={(e) => setSimAmount(e.target.value)} 
                        />
                        <p className="text-xs text-[#5b8370] mt-2 text-right">
                            {t('dashboard.explorer.simulator_hint', 'Ingresa cualquier monto (Mín. €5)')}
                        </p>
                    </div>
                    
                    <AnimatePresence mode="wait">
                        {simVariant ? (
                        <motion.div key={simVariant.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#053127] to-[#5b8370] p-4 rounded-2xl border border-[#c2d2c1]/20 shadow-lg text-center">
                            
                            {/* REEMPLAZO DE ICONO POR IMAGEN PARA EL SIMULADOR */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 rounded-2xl overflow-hidden shadow-glow border-2 border-gold relative bg-[#063127]">
                                <img src={getTierImage(simVariant.slug)} alt={simVariant.variant_title} className="w-full h-full object-cover" />
                            </div>

                            <Badge className="bg-gradient-gold text-[#063127] shadow-sm font-black border-0 text-sm px-3 py-1 mb-2 uppercase tracking-wide">{simVariant.logical_name}</Badge>
                            <h4 className="text-3xl font-black text-gradient-gold drop-shadow-md mb-1">{simVariant.variant_title}</h4>
                            
                            <div className="flex flex-col gap-2 mb-6 bg-white/90 dark:bg-black/20 p-4 rounded-xl border border-white/10 mt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[#053127] dark:text-[#c2d2c1] font-medium">{t('dashboard.impact_credits', 'Impact Credits')}</span>
                                    <span className="text-lg font-black text-gradient-gold drop-shadow-md flex items-center gap-1">
                                        <Coins className="w-5 h-5 text-gold"/> {formatNumber(simVariant.impact_credits_reward)}
                                    </span>
                                </div>
                                <div className="w-full h-px bg-[#c2d2c1]/30 my-1"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[#053127] dark:text-[#c2d2c1] font-medium">Land Dollars</span>
                                    <span className="text-lg font-bold text-green-600 flex items-center gap-1">
                                        <Leaf className="w-4 h-4"/> {formatNumber(simVariant.land_dollars_reward)} LD
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-dashed border-white/20 text-left space-y-3">
                            {simVariant.benefits?.map((b, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm text-[#c2d2c1]">
                                <CheckCircle className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                                <span className="font-medium">{b.description}</span>
                                </div>
                            ))}
                            </div>

                            <div className="mt-6 flex flex-col gap-3">
                                <Button className="w-full btn-primary text-lg h-12 shadow-lg" onClick={() => window.open(STARTNEXT_PROJECT_URL, '_blank')}>
                                    {t('dashboard.explorer.support_btn', 'Apoyar en Startnext')} <ExternalLink className="ml-2 w-5 h-5" />
                                </Button>
                                <Button variant="outline" className="w-full h-12 border-[#c2d2c1]/30 text-[#c2d2c1] hover:bg-[#c2d2c1]/10 hover:text-white" onClick={() => setIsSupportModalOpen(true)}>
                                    {t('exchange.cta.support_startnext', 'I already supported')}
                                </Button>
                            </div>

                        </motion.div>
                        ) : (
                        <div className="text-center p-10 text-[#5b8370] border-2 border-dashed border-[#5b8370]/30 rounded-2xl bg-[#5b8370]/5">
                            {t('dashboard.explorer.empty_state', 'Ingresa un monto para ver tus recompensas')}
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
                    className={`flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl border cursor-pointer transition-all duration-300 group ${isHighlighted ? 'bg-[#c2d2c1]/20 border-gold shadow-glow scale-[1.02] ring-1 ring-gold' : 'bg-card/80 backdrop-blur-sm border-border shadow-sm hover:shadow-md hover:border-gold/50 hover:bg-muted/50'}`}
                >
                    {/* REEMPLAZO DE ICONO POR IMAGEN EN LA LISTA */}
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden transition-all duration-300 border-2 bg-[#063127] ${isHighlighted ? 'border-gold shadow-glow' : 'border-transparent group-hover:border-gold/50'}`}>
                        <img src={getTierImage(v.slug)} alt={v.variant_title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left">
                    <h4 className={`font-bold text-lg transition-colors ${isHighlighted ? 'text-gold' : 'text-[#053127] dark:text-[#c2d2c1] group-hover:text-gold'}`}>{v.variant_title}</h4>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-1">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-300 px-2 py-1 rounded">
                            {t('dashboard.explorer.min_amount', 'Desde')} {formatCurrency(v.min_amount)}
                        </span>
                        <span className="text-xs font-bold text-[#053127] dark:text-[#c2d2c1] bg-[#c2d2c1]/50 px-2 py-1 rounded flex items-center gap-1 border border-gold/30 shadow-sm">
                            Base: {formatNumber(v.impact_credits_reward)} <Coins className="w-3 h-3 text-gold" />
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

  // =========================================================================
  // VISTA 2: ADMIN / VISTA ALTERNATIVA 
  // =========================================================================
  const snxId = startnextData?.imported_user?.snx_id || `SNX-ACT-${user?.id?.slice(0, 4)}`;
  const tierDisplayName = startnextData?.levelName || 'Explorer';

  return (
    <div className="relative w-full min-h-screen">
       <div className="relative z-10 space-y-12 pb-16 pt-6">
        <ReforestaProjectWidget />
        <LandDollarInfoModal isOpen={isLandDollarModalOpen} onClose={() => setIsLandDollarModalOpen(false)} t={t} />

        <Card variant="premium" className="overflow-hidden border-0 shadow-premium bg-card/90 backdrop-blur-sm">
            <div className="bg-gradient-to-r from-[#053127] to-[#5b8370] p-10 md:p-14 text-[#c2d2c1] relative">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                <div>
                <div className="flex items-center gap-3 mb-6">
                    <Badge className="bg-gradient-gold text-[#063127] font-black shadow-glow border-0 px-4 py-1.5 backdrop-blur-md">{t('dashboard.pioneer_status.active', 'Activo')}</Badge>
                    <span className="text-xs font-mono text-[#c2d2c1] bg-black/20 px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> {snxId}
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md text-[#c2d2c1]">
                    {t('dashboard.pioneer_status.welcome', { name: profile?.name || 'Explorer' })}
                </h1>
                <p className="text-[#c2d2c1]/90 text-lg max-w-xl font-medium leading-relaxed opacity-90">
                    {t('dashboard.pioneer_status.verified_msg', 'Tu estatus de pionero está verificado.')}
                </p>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-[#053127]/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-glow flex flex-col items-center min-w-[200px]">
                        
                        {/* REEMPLAZO DE ICONO POR IMAGEN EN LA VISTA APROBADA */}
                        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-3 shadow-glow border-2 border-gold bg-black/20">
                            <img src={getTierImage(startnextData?.support_levels?.slug || '')} alt="Tier" className="w-full h-full object-cover" />
                        </div>

                        <span className="text-xs text-[#c2d2c1]/70 uppercase font-bold tracking-widest mb-1">{t('dashboard.pioneer_status.current_tier', 'Nivel Actual')}</span>
                        <span className="text-2xl font-black text-gradient-gold text-center leading-tight drop-shadow-md">{tierDisplayName}</span> 
                    </div>
                    <div className="bg-[#053127]/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-glow flex flex-col items-center min-w-[200px]">
                        <div className="w-14 h-14 text-[#063127] bg-gradient-gold p-2 rounded-full mb-3 shadow-glow">
                            <Coins className="w-full h-full text-[#063127]" />
                        </div>
                        <span className="text-xs text-[#c2d2c1]/70 uppercase font-bold tracking-widest mb-1">{t('dashboard.impact_credits', 'Impact Credits')}</span>
                        <span className="text-3xl font-black text-gradient-gold text-center leading-tight drop-shadow-md">{formatNumber(impactCredits)} </span>
                    </div>
                </div>
            </div>
            </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col h-full space-y-6 relative">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-[#5b8370]/20 rounded-2xl shadow-sm"><Leaf className="w-6 h-6 text-emerald-500" /></div>
                <h3 className="text-2xl font-bold text-[#053127] dark:text-[#c2d2c1]">{t('dashboard.assets.digital_asset_title', 'Activo Digital')}</h3>
            </div>

            {/* BOTÓN DE INFORMACIÓN DEL LAND DOLLAR EN LA VISTA 2 */}
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsLandDollarModalOpen(true)}
                    className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-gradient-gold text-[#063127] rounded-full transition-all shadow-glow z-20"
                >
                    <span className="text-xs font-bold">{t('dashboard.land_dollar.button_quest', '¿Qué es el Land Dollar?')}</span>
                    <Info className="w-4 h-4" />
                </motion.button>

            <div className="hover:scale-[1.01] transition-normal duration-500">
                <LandDollarDisplay user={user} profile={profile} landDollar={landDollar} loading={financialLoading} />
            </div>
            </motion.div>

            <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#c2d2c1]/30 rounded-2xl shadow-sm"><Package className="w-6 h-6 text-blue-600" /></div>
                <h3 className="text-2xl font-bold text-[#053127] dark:text-[#c2d2c1]">{t('dashboard.rewards.title', 'Beneficios')}</h3>
                </div>
                <Card variant="soft" className="overflow-hidden border-0 bg-card/90 backdrop-blur-sm">
                <CardContent className="p-0">
                    <ul className="divide-y divide-border">
                    {(startnextData?.processedBenefits || []).map((b, i) => (
                        <motion.li key={`ben-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (i * 0.1) }} className="flex items-start gap-5 p-6 hover:bg-muted/30 transition-colors group">
                        <div className="mt-1 bg-muted/10 p-3 rounded-xl border border-border group-hover:border-gold group-hover:shadow-glow group-hover:scale-110 transition-all shadow-sm">
                            {b.icon_name === 'zap' ? <Zap className="w-6 h-6 text-gold"/> : getBenefitIcon(b.description, b.type, b.icon_name)}
                        </div>
                        <div className="flex-1">
                            <span className="font-bold text-lg text-[#053127] dark:text-[#c2d2c1] block mb-2 group-hover:text-gold transition-colors">{b.description}</span>
                            {b.type && (<Badge variant="outline" className="text-[10px] uppercase tracking-wider text-[#5b8370] border-border">{b.type}</Badge>)}
                        </div>
                        <div className="mt-3 text-gold opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-6 h-6 text-gold" /></div>
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

// ==========================================
// COMPONENTE: StatCard (Diseño Premium Oscuro sin Reloj)
// ==========================================
const StatCard = ({ icon: Icon, iconColor, bgColor, label, value }) => (
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
// COMPONENTE NUEVO: Visión del Proyecto / Startnext (4 Pasos)
// ==========================================
const ProjectVisionWidget = ({ t, setIsSupportModalOpen }) => {
    // ESTADO PARA EL POP-UP INFORMATIVO DE LOS PASOS 1, 2 Y 3
    const [selectedInfo, setSelectedInfo] = useState(null);

    // Contenido dinámico del Pop-up
    const getModalContent = (step) => {
        switch(step) {
            case 1:
                return {
                    icon: Leaf,
                    iconColor: "text-[#cf9c2a]",
                    title: t('dashboard.vision.pop_up_title1', 'Nuestra Misión - Protección Garantizada'),
                    desc: t('dashboard.vision.pop_up_desc1', 'Nuestra misión va más allá de plantar árboles. Buscamos adquirir y proteger de forma legal metros cuadrados (m²) de la selva amazónica. Esto garantiza que la tierra no pueda ser explotada, deforestada o vendida a corporaciones destructivas. Creamos un santuario permanente para la biodiversidad y un escudo contra el cambio climático.'),
                    otherTitle: t('dashboard.vision.pop_up_otherTitle1', '¿Por qué es importante?'),
                    otherDesc: t('dashboard.vision.pop_up_otherDesc1', 'El Amazonas es el pulmón del planeta, pero enfrenta una deforestación alarmante. Al proteger m² reales, aseguramos un impacto tangible y duradero, creando un legado verde para las futuras generaciones.')
                };
            case 2:
                return {
                    icon: ShieldCheck,
                    iconColor: "text-emerald-400",
                    title: t('dashboard.vision.pop_up_title2', 'Cooperativa Alemana (eG) - Transparencia Total'),
                    desc: t('dashboard.vision.pop_up_desc2', 'Para garantizar que el dinero se use exactamente para lo que prometemos, fundaremos una Eingetragene Genossenschaft (eG) en Alemania. Esta figura legal es una de las más estrictas y seguras del mundo. Significa que el proyecto será auditado, transparente, y cada miembro tendrá voz y voto equitativo.')
                };
            case 3:
                return {
                    icon: Target,
                    iconColor: "text-blue-400",
                    title: t('dashboard.vision.pop_up_title3', 'Simulador y Startnext - Visualiza tu Impacto'),
                    desc: t('dashboard.vision.pop_up_desc3', 'Usa la calculadora interactiva de esta página para ver qué nivel de recompensas (Impact Credits y Land Dollars) obtendrás según tu aporte. Luego, haciendo clic en el botón de apoyar o en la foto del proyecto, te llevaremos a Startnext, la plataforma de crowdfunding más segura de Europa, donde estamos reuniendo a nuestros primeros pioneros.')
                };
            default:
                return null;
        }
    };

    const modalData = selectedInfo ? getModalContent(selectedInfo) : null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.15 }}
            className="mb-10"
        >
            <div className="flex flex-col items-center text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-black text-[#053127] dark:text-[#c2d2c1]">
                    {t('dashboard.vision.title', 'Cómo Funciona Reforestal y Startnext')}
                </h3>
                <p className="text-muted-foreground mt-2 max-w-3xl leading-relaxed font-medium">
                    {t('dashboard.vision.subtitle', 'Entiende paso a paso nuestra misión, cómo puedes apoyarnos en Startnext y cómo reclamar tus beneficios exclusivos en esta plataforma. Haz clic en las tarjetas para leer más.')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Paso 1: Misión (Leaf) */}
                <Card 
                    onClick={() => setSelectedInfo(1)}
                    className="cursor-pointer bg-[#053127] border-gold/20 shadow-glow text-white p-6 rounded-3xl group hover:-translate-y-2 transition-transform duration-300 flex flex-col"
                >
                    <div className="w-14 h-14 bg-[#cf9c2a]/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shrink-0">
                        <Leaf className="w-7 h-7 text-[#cf9c2a]" />
                    </div>
                    <h4 className="text-lg font-bold mb-3 text-gradient-gold group-hover:underline decoration-gold underline-offset-4">
                        {t('dashboard.vision.step1_title', '1. Nuestra Misión Real')}
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed flex-1">
                        {t('dashboard.vision.step1_desc', 'Buscamos proteger metros cuadrados (m²) del Amazonas de forma permanente. No se trata solo de plantar árboles, sino de asegurar biodiversidad y sumideros de carbono reales.')}
                    </p>
                </Card>

                {/* Paso 2: Cooperativa (ShieldCheck) */}
                <Card 
                    onClick={() => setSelectedInfo(2)}
                    className="cursor-pointer bg-[#053127] border-gold/20 shadow-glow text-white p-6 rounded-3xl group hover:-translate-y-2 transition-transform duration-300 delay-75 flex flex-col"
                >
                    <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shrink-0">
                        <ShieldCheck className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-3 text-gradient-gold group-hover:underline decoration-emerald-400 underline-offset-4">
                        {t('dashboard.vision.step2_title', '2. Cooperativa Alemana')}
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed flex-1">
                        {t('dashboard.vision.step2_desc', 'Para hacer esto transparente y seguro, fundaremos una Cooperativa Alemana (eG). Nuestro proyecto en Startnext busca recaudar los fondos iniciales para hacer esto realidad.')}
                    </p>
                </Card>

                {/* Paso 3: Simulador (Target) */}
                <Card 
                    onClick={() => setSelectedInfo(3)}
                    className="cursor-pointer bg-[#053127] border-gold/20 shadow-glow text-white p-6 rounded-3xl group hover:-translate-y-2 transition-transform duration-300 delay-150 flex flex-col"
                >
                    <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shrink-0">
                        <Target className="w-7 h-7 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-3 text-gradient-gold group-hover:underline decoration-blue-400 underline-offset-4">
                        {t('dashboard.vision.step3_title', '3. Explora y Simula')}
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed flex-1">
                        {t('dashboard.vision.step3_desc', 'Usa nuestro simulador interactivo más abajo para ver los planes de Startnext. Haz clic en la foto del proyecto en el dashboard para ir a leer toda la campaña en profundidad.')}
                    </p>
                </Card>

                {/* Paso 4: Reclamar Acceso (Key) - ABRE FORMULARIO */}
                <Card 
                    onClick={() => setIsSupportModalOpen(true)}
                    className="cursor-pointer bg-[#053127] border-gold/20 shadow-glow text-white p-6 rounded-3xl group hover:-translate-y-2 transition-transform duration-300 delay-200 flex flex-col"
                >
                    <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shrink-0">
                        <Key className="w-7 h-7 text-purple-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-3 text-gradient-gold group-hover:underline decoration-purple-400 underline-offset-4">
                        {t('dashboard.vision.step4_title', '4. Reclama tu Acceso Premium')}
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed flex-1">
                        {t('dashboard.vision.step4_desc', '¿Apoyaste en Startnext? Haz clic en esta tarjeta y completa un breve formulario. ¡Te daremos acceso a misiones exclusivas y estatus Premium!')}
                    </p>
                </Card>
            </div>

            {/* POP-UP INFORMATIVO PARA PASOS 1, 2 Y 3 */}
            <Dialog open={selectedInfo !== null} onOpenChange={(open) => !open && setSelectedInfo(null)}>
                {selectedInfo !== null && <div className="fixed inset-0 z-[9998] bg-[#063127]/80 backdrop-glow-sm" />}
                
                <DialogContent className="fixed left-[50%] top-[50%] z-[9999] w-[95vw] sm:max-w-2xl translate-x-[-50%] translate-y-[-50%] bg-[#063127] border border-[#cf9c2a]/40 shadow-glow-lg rounded-3xl p-5 sm:p-6 md:p-8 outline-none overflow-hidden flex flex-col items-center">
                    {modalData && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                        >
                            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
                            
                            <DialogHeader className="flex flex-col items-center space-y-4 w-full">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-lg mb-2 relative">
                                    <modalData.icon className={`w-10 h-10 ${modalData.iconColor} drop-shadow-md z-10`} />
                                </div>
                                
                                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                                    {modalData.title}
                                </DialogTitle>

                                <DialogDescription className="text-[#c4d1c0] text-sm sm:text-base leading-relaxed mt-3 px-2 font-medium">
                                    {modalData.desc}
                                </DialogDescription>
                                    {modalData.otherTitle && (
                                    <h4 className="text-lg sm:text-xl font-bold tracking-tight text-gradient-gold mt-6">
                                        {modalData.otherTitle}
                                    </h4>
                                )}

                                {modalData.otherDesc && (
                                    <DialogDescription className="text-[#c4d1c0] text-sm sm:text-base leading-relaxed mt-2 px-2 font-medium">
                                        {modalData.otherDesc}
                                    </DialogDescription>
                                )}
                            </DialogHeader>

                            <DialogFooter className="mt-8 flex w-full justify-center">
                                <Button 
                                    onClick={() => setSelectedInfo(null)} 
                                    className="w-full bg-gradient-gold text-white hover:brightness-110 font-bold rounded-xl h-12 shadow-glow transition-all active:scale-95 border-none"
                                >
                                    {t('dashboard.vision.button', 'Entendido')}
                                </Button>
                            </DialogFooter>
                        </motion.div>
                    )}
                </DialogContent>
            </Dialog>

        </motion.div>
    );
}

// ==========================================
// COMPONENTE NUEVO: Modal Informativo del Land Dollar
// ==========================================
const LandDollarInfoModal = ({ isOpen, onClose, t }) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {isOpen && <div className="fixed inset-0 z-[9998] bg-[#063127]/80 backdrop-blur-sm" />}
            
            {/* Clases actualizadas: Redujimos el padding en móvil (p-4 en lugar de p-5) para ganar ancho útil */}
            <DialogContent className="fixed left-[50%] top-[50%] z-[9999] w-[95vw] max-w-[95vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] bg-[#063127] border border-[#cf9c2a]/40 shadow-glow-lg rounded-3xl p-4 sm:p-8 outline-none overflow-hidden flex flex-col items-center">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#cf9c2a]/10 rounded-full blur-[80px] pointer-events-none" />

                <DialogHeader className="flex flex-col items-center space-y-2 sm:space-y-3 w-full relative z-10">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-lg mb-1 relative shrink-0">
                        <Leaf className="w-6 h-6 sm:w-10 sm:h-10 text-emerald-400 drop-shadow-md z-10" />
                    </div>
                    <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight text-white leading-tight text-center">
                        {t('dashboard.land_dollar.modal_title', 'Descubre como funciona tu Land Dollar')}
                    </DialogTitle>
                    <DialogDescription className="text-[#c4d1c0] text-xs sm:text-sm text-center leading-relaxed font-medium">
                        {t('dashboard.land_dollar.modal_subtitle', 'El Land Dollar es el corazón de nuestro ecosistema. Aquí te explicamos cómo funciona tu nuevo activo digital.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-5 relative z-10 max-h-[60vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                    {/* TARJETA 1 */}
                    {/* En móvil: padding p-3, iconos h-4 w-4, texto más compacto */}
                    <div className="flex gap-2.5 sm:gap-4 items-start bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 hover:border-[#cf9c2a]/50 transition-colors">
                        <div className="bg-[#cf9c2a]/20 p-1.5 sm:p-2 rounded-xl text-[#cf9c2a] shrink-0"><Coins className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <div className="text-left">
                            <h4 className="text-white text-[13px] sm:text-base font-bold mb-0.5 sm:mb-1 leading-tight">{t('dashboard.land_dollar.q1_title', '¿Qué es el Land Dollar?')}</h4>
                            <p className="text-[#c4d1c0] text-[11px] sm:text-sm leading-relaxed">{t('dashboard.land_dollar.q1_desc', 'Es un activo digital único que representa tu contribución a la protección del Amazonas.')}</p>
                        </div>
                    </div>
                    {/* TARJETA 2 */}
                    <div className="flex gap-2.5 sm:gap-4 items-start bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 hover:border-emerald-400/50 transition-colors">
                        <div className="bg-emerald-500/20 p-1.5 sm:p-2 rounded-xl text-emerald-400 shrink-0"><ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <div className="text-left">
                            <h4 className="text-white text-[13px] sm:text-base font-bold mb-0.5 sm:mb-1 leading-tight">{t('dashboard.land_dollar.q2_title', '¿Qué representa?')}</h4>
                            <p className="text-[#c4d1c0] text-[11px] sm:text-sm leading-relaxed">{t('dashboard.land_dollar.q2_desc', 'Representa la cantidad de metros cuadrados (m²) de selva amazónica que has protegido y es de uso único para ti.')}</p>
                        </div>
                    </div>
                    {/* TARJETA 3 */}
                    <div className="flex gap-2.5 sm:gap-4 items-start bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 hover:border-blue-400/50 transition-colors">
                        <div className="bg-blue-500/20 p-1.5 sm:p-2 rounded-xl text-blue-400 shrink-0"><Target className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <div className="text-left">
                            <h4 className="text-white text-[13px] sm:text-base font-bold mb-0.5 sm:mb-1 leading-tight">{t('dashboard.land_dollar.q3_title', '¿Para qué sirve el Código QR?')}</h4>
                            <p className="text-[#c4d1c0] text-[11px] sm:text-sm leading-relaxed">{t('dashboard.land_dollar.q3_desc', 'Es tu sello de autenticidad. Al escanearlo, esa persona queda como verificada dentro de tus amigos, aliados y referidos')}</p>
                        </div>
                    </div>
                    {/* TARJETA 4 */}
                    <div className="flex gap-2.5 sm:gap-4 items-start bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 hover:border-purple-400/50 transition-colors">
                        <div className="bg-purple-500/20 p-1.5 sm:p-2 rounded-xl text-purple-400 shrink-0"><Users className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <div className="text-left">
                            <h4 className="text-white text-[13px] sm:text-base font-bold mb-0.5 sm:mb-1 leading-tight">{t('dashboard.land_dollar.q4_title', '¿Y el Link de Referido como funciona?')}</h4>
                            <p className="text-[#c4d1c0] text-[11px] sm:text-sm leading-relaxed">{t('dashboard.land_dollar.q4_desc', 'Es tu llave maestra para invitar a otros a unirse a esta misión. Comparte tu enlace único y cada nuevo aliado que se una a través de él fortalecerá el bosque y tu impacto colectivo.')}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-5 sm:mt-6 flex w-full justify-center relative z-10">
                    <Button 
                        onClick={onClose} 
                        className="w-full sm:w-[250px] mx-auto bg-gradient-gold text-white hover:brightness-110 text-sm sm:text-base font-bold rounded-xl h-10 sm:h-12 shadow-glow transition-all active:scale-95 border-none"
                    >
                        {t('dashboard.land_dollar.button_info', 'Cerrar')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default DashboardSection;