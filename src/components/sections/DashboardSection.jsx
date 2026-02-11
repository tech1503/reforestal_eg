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
// IMPORTAMOS LA NUEVA FUNCIÓN AQUÍ
import { 
    fetchSupportLevelsForLogic, 
    getSupportLevelByAmount, 
    getVariantDetails,
    calculateDynamicCredits 
} from '@/utils/tierLogicUtils';
import { Loader2 } from 'lucide-react';
import { getVariantIcon, getBenefitIcon } from '@/components/Icons/CustomIcons';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ReforestaProjectWidget from '@/components/ReforestaProjectWidget';
import { STARTNEXT_PROJECT_URL } from '@/constants/urls';
import { format } from 'date-fns';

const DashboardSection = () => {
  const { user, profile } = useAuth();
  const { currentLanguage } = useI18n();
  const { t } = useTranslation(); 
  
  const { landDollar, impactCredits, loading: financialLoading } = useFinancial();

  const [startnextData, setStartnextData] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  // Simulador States
  const [simAmount, setSimAmount] = useState('');
  const [simVariant, setSimVariant] = useState(null);
  const [allVariants, setAllVariants] = useState([]);

  // --- FETCH DATOS ADICIONALES ---
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

  // --- LOGICA SIMULADOR ---
  useEffect(() => {
    const runSim = async () => {
      if (!simAmount || isNaN(parseFloat(simAmount))) { setSimVariant(null); return; }
      
      const id = await getSupportLevelByAmount(parseFloat(simAmount));
      
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

        // CALCULO DINÁMICO DE CRÉDITOS
        const dynamicCredits = calculateDynamicCredits(simAmount);

        setSimVariant({ 
            ...details, 
            impact_credits_reward: dynamicCredits, 
            benefits 
        });
      } else { setSimVariant(null); }
    };
    const timer = setTimeout(runSim, 300);
    return () => clearTimeout(timer);
  }, [simAmount, currentLanguage]);


  if (localLoading || financialLoading) return <div className="flex justify-center h-[60vh] items-center"><Loader2 className="animate-spin w-12 h-12 text-emerald-500"/></div>;

  // --- VISTA 1: EXPLORER (Usuario Común / No Contribuyente) ---
  if (!startnextData && !isAdmin) {
    const registrationDate = user?.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '-';
    const landDollarStatus = landDollar ? 'Active' : 'Pending';

    return (
      <div className="space-y-12 max-w-6xl mx-auto pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-8">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 drop-shadow-sm">
            {t('dashboard.explorer.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            {t('dashboard.explorer.subtitle')}
          </p>
        </motion.div>

        {/* --- NUEVA SECCIÓN DE MÉTRICAS PARA USUARIO COMÚN --- */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }} 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
            <StatCard 
                icon={Calendar} 
                iconColor="text-blue-500" 
                bgColor="bg-blue-50" 
                label="Registration Date" 
                value={registrationDate} 
            />
            <StatCard 
                icon={Wallet} 
                iconColor="text-green-600" 
                bgColor="bg-green-50" 
                label={t('dashboard.land_dollar.title')} 
                value={<span className="text-emerald-600">{landDollarStatus}</span>} 
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

        {/* WIDGET & ASSET DISPLAY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="shadow-premium rounded-3xl overflow-hidden h-full">
                <ReforestaProjectWidget />
             </motion.div>
             
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-3xl shadow-lg border border-border p-6 flex flex-col items-center text-center h-full justify-center">
                 <div className="mb-4">
                     <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                         <Leaf className="w-6 h-6 text-emerald-500"/> {t('dashboard.assets.digital_asset_title')}
                     </h3>
                     <p className="text-sm text-muted-foreground">
                        {t('dashboard.land_dollar.certificate_text')}
                     </p>
                 </div>
                 
                 <div className="w-full max-w-md transform hover:scale-[1.02] transition-normal">
                     <LandDollarDisplay user={user} landDollar={landDollar} />
                 </div>
             </motion.div>
        </div>

        {/* SIMULADOR SECCIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <Card variant="premium" className="border-2 border-emerald-500/20 bg-card">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Info className="w-6 h-6 text-emerald-500" /> {t('dashboard.explorer.simulator_title')}
              </h3>
              <div className="space-y-8">
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-2xl group-focus-within:text-gold transition-colors">€</span>
                  <Input type="number" placeholder={t('dashboard.explorer.input_placeholder')} className="pl-12 text-3xl h-16 bg-background font-bold tracking-wide" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} />
                </div>
                <AnimatePresence mode="wait">
                  {simVariant ? (
                    <motion.div key={simVariant.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-8 rounded-2xl border border-emerald-500/20 shadow-glow text-center">
                      <div className="w-20 h-20 mx-auto mb-4 text-gold drop-shadow-md">{getVariantIcon(simVariant.slug)}</div>
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 text-sm px-3 py-1 mb-3">{simVariant.logical_name}</Badge>
                      <h4 className="text-3xl font-bold text-foreground mb-2">{simVariant.variant_title}</h4>
                      
                      <div className="flex justify-center gap-4 mb-6">
                           <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                              <Coins className="w-4 h-4"/> {simVariant.impact_credits_reward} 
                           </span>
                           <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                              <Leaf className="w-4 h-4"/> {simVariant.land_dollars_reward} LD
                           </span>
                      </div>

                      <div className="pt-6 border-t border-dashed border-border text-left space-y-3">
                        {simVariant.benefits?.map((b, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                            <span className="font-medium">{b.description}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center p-10 text-muted-foreground/60 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                      {t('dashboard.explorer.empty_state')}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {allVariants.map(v => (
              <div key={v.id} className="flex items-center gap-5 p-5 bg-card rounded-2xl border border-border shadow-soft hover:shadow-premium hover:border-emerald-500/30 hover:scale-[1.02] transition-normal cursor-pointer group">
                <div className="w-14 h-14 text-emerald-600 shrink-0 bg-emerald-50 rounded-xl p-3 group-hover:text-gold transition-colors">{getVariantIcon(v.slug)}</div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-foreground group-hover:text-emerald-600 transition-colors">{v.variant_title}</h4>
                  <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-muted-foreground font-medium">{t('dashboard.explorer.min_amount')} €{v.min_amount}</p>
                      
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                          {v.impact_credits_reward} <Coins className="w-3 h-3" />
                      </span>
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">{t('dashboard.explorer.details_btn')}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <div className="text-center pt-6">
                      <div className="w-24 h-24 mx-auto text-gold mb-6 drop-shadow-lg animate-float">{getVariantIcon(v.slug)}</div>
                      
                      <DialogTitle className="text-3xl font-bold text-foreground mb-2 text-center">
                        {v.variant_title}
                      </DialogTitle>
                      
                      <DialogDescription className="text-emerald-600 font-bold text-lg mb-4 bg-emerald-50 inline-block px-4 py-1 rounded-full mx-auto">
                        {t('dashboard.explorer.contribution_level')}: €{v.min_amount}+
                      </DialogDescription>
                      
                      <div className="flex justify-center gap-4 mb-6">
                           <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl min-w-[100px]">
                               <div className="text-xs uppercase text-purple-600 font-bold">Bonus</div>
                               <div className="text-2xl font-black text-purple-800">{v.impact_credits_reward}</div>
                           </div>
                           <div className="bg-green-50 border border-green-200 p-3 rounded-xl min-w-[100px]">
                               <div className="text-xs uppercase text-green-600 font-bold">Assets</div>
                               <div className="text-2xl font-black text-green-800">{v.land_dollars_reward} LD</div>
                           </div>
                      </div>

                      <div className="bg-muted/10 rounded-2xl p-8 text-left border border-border shadow-inner">
                        <h5 className="font-bold text-muted-foreground mb-4 uppercase text-xs tracking-widest">{t('dashboard.explorer.included_benefits')}</h5>
                        <ul className="space-y-3">
                           {v.benefits?.map((b, i) => (
                             <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="font-medium">{b.description}</span>
                             </li>
                           ))}
                           {(!v.benefits || v.benefits.length === 0) && (
                               <li className="text-sm text-muted-foreground italic">No detailed benefits listed.</li>
                           )}
                        </ul>
                      </div>
                      <Button className="w-full mt-8 btn-primary text-lg h-14" onClick={() => window.open(STARTNEXT_PROJECT_URL, '_blank')}>
                        {t('dashboard.explorer.support_btn')} <ExternalLink className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA 2: CONTRIBUTOR (Startnext / Admin) ---
  const snxId = startnextData?.imported_user?.snx_id || `SNX-ACT-${user?.id?.slice(0, 4)}`;
  const tierName = startnextData?.levelName || 'Explorer';

  return (
    <div className="space-y-12 pb-16">
      <ReforestaProjectWidget />

      <Card variant="premium" className="overflow-hidden border-0 shadow-premium">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-10 md:p-14 text-white relative">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-white/20 text-white border-0 px-4 py-1.5 backdrop-blur-md">{t('dashboard.pioneer_status.active')}</Badge>
                <span className="text-xs font-mono text-emerald-100 bg-black/20 px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
                  <ShieldCheck className="w-3 h-3" /> {snxId}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md">
                {t('dashboard.pioneer_status.welcome', { name: profile?.name || 'Explorer' })}
              </h1>
              <p className="text-emerald-50 text-lg max-w-xl font-medium leading-relaxed opacity-90">
                {t('dashboard.pioneer_status.verified_msg')}
              </p>
            </div>

            <div className="flex flex-col gap-4">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-glow flex flex-col items-center min-w-[200px]">
                    <div className="w-12 h-12 text-gold mb-2 filter drop-shadow-md">{getVariantIcon(startnextData?.levelName || '')}</div>
                    <span className="text-xs text-emerald-100 uppercase font-bold tracking-widest mb-1">{t('dashboard.pioneer_status.current_tier')}</span>
                    <span className="text-xl font-bold text-white text-center">{tierName}</span> 
                </div>
                <div className="bg-emerald-900/30 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-glow flex flex-col items-center min-w-[200px]">
                    <div className="w-12 h-12 text-emerald-300 mb-2 filter drop-shadow-md p-2 bg-emerald-500/20 rounded-full">
                        <Coins className="w-8 h-8" />
                    </div>
                    <span className="text-xs text-emerald-100 uppercase font-bold tracking-widest mb-1">{t('dashboard.impact_credits')}</span>
                    <span className="text-xl font-bold text-white text-center">{(impactCredits || 0).toLocaleString()} </span>
                </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex flex-col h-full space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 shadow-sm"><Leaf className="w-6 h-6" /></div>
            <h3 className="text-2xl font-bold text-foreground">{t('dashboard.assets.digital_asset_title')}</h3>
          </div>

          <div className="hover:scale-[1.01] transition-normal duration-500">
            <LandDollarDisplay user={user} landDollar={landDollar} />
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-soft flex justify-around text-center">
            <div>
              <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t('dashboard.assets.unique_id')}</span>
              <span className="font-mono text-base font-bold text-foreground">{snxId}</span>
            </div>
            <div className="w-px bg-border" />
            <div>
              <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t('dashboard.assets.status_label')}</span>
              <span className="font-bold text-base text-emerald-600 flex items-center gap-2 justify-center"><CheckCircle className="w-4 h-4" /> {t('dashboard.assets.verified_status')}</span>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 shadow-sm"><Package className="w-6 h-6" /></div>
              <h3 className="text-2xl font-bold text-foreground">{t('dashboard.rewards.title')}</h3>
            </div>
            <Card variant="soft" className="overflow-hidden border-0 bg-card">
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {(startnextData?.processedBenefits || []).map((b, i) => (
                    <motion.li key={`ben-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (i * 0.1) }} className="flex items-start gap-5 p-6 hover:bg-muted/30 transition-colors group">
                      <div className="mt-1 bg-muted/10 p-3 rounded-xl text-emerald-600 border border-border group-hover:border-emerald-300 group-hover:scale-110 transition-all shadow-sm">
                        {getBenefitIcon(b.description, b.type, b.icon_name)}
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-lg text-foreground block mb-2 group-hover:text-emerald-700 transition-colors">{b.description}</span>
                        {b.type && (<Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground border-border">{b.type}</Badge>)}
                      </div>
                      <div className="mt-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-6 h-6" /></div>
                    </motion.li>
                  ))}
                  {(!startnextData?.processedBenefits || startnextData.processedBenefits.length === 0) && (
                    <div className="p-12 text-center text-muted-foreground italic">{t('dashboard.rewards.no_benefits')}</div>
                  )}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, iconColor, bgColor, label, value, highlight }) => (
    <Card variant="premium" className="group bg-card border-border">
       <CardContent className="flex items-center justify-between p-4">
         <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <h3 className={`text-xl font-bold ${highlight ? 'text-foreground' : 'text-foreground/90'}`}>{value}</h3>
         </div>
         <div className={`p-2.5 rounded-xl ${bgColor} dark:bg-muted group-hover:scale-110 transition-normal shadow-sm`}>
             <Icon className={`w-5 h-5 ${iconColor}`}/>
         </div>
       </CardContent>
    </Card>
);

export default DashboardSection;