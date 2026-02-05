import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, Users, Gift, TrendingUp, Lock, AlertCircle, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { useRealtimeProfileUpdate } from '@/hooks/useRealtimeProfileUpdate';
import { supabase } from '@/lib/customSupabaseClient';
import LandDollarDisplay from '@/components/LandDollarDisplay'; 
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

const ReferralSection = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Usamos el contexto financiero para datos globales
  const { userTier, landDollar, loading: financialLoading } = useFinancial();
  useRealtimeProfileUpdate();

  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0, credits: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Lógica de Bloqueo: Bloqueado si es usuario común Y no tiene perfil genesis
  const isLocked = !user || (profile?.role === 'user' && !profile?.genesis_profile);
  
  // Lógica de Suspensión: Si el Land Dollar está suspendido
  const isSuspended = landDollar?.status === 'suspended' || landDollar?.status === 'blocked';

  useEffect(() => {
    let mounted = true;

    if (user?.id && !isLocked) {
      const fetchReferralData = async () => {
        try {
          // 1. OBTENER CÓDIGO REAL (Desde Land Dollars)
          // Buscamos el código corto (REF-XXXX) que coincide con el QR
          const { data: ldData, error: ldError } = await supabase
            .from('land_dollars')
            .select('link_ref')
            .eq('user_id', user.id)
            .maybeSingle();

          if (mounted) {
            if (ldData && ldData.link_ref) {
              setReferralCode(ldData.link_ref); 
            } else {
              setReferralCode('PENDING-ALLOCATION');
            }
          }

          // 2. Total Referrals
          const { count: totalCount } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', user.id);

          // 3. Créditos Ganados por Referidos
          const { data: creditData } = await supabase
            .from('gamification_history')
            .select('impact_credits_awarded')
            .eq('user_id', user.id)
            .ilike('action_type', '%referral%');

          const totalCredits = creditData
            ? creditData.reduce((sum, item) => sum + (Number(item.impact_credits_awarded) || 0), 0)
            : 0;

          if (mounted) {
            setReferralStats({
              total: totalCount || 0,
              active: totalCount || 0, 
              credits: totalCredits
            });
          }
        } catch (err) {
          console.error("[ReferralSection] Error:", err);
        } finally {
          if (mounted) setStatsLoading(false);
        }
      };

      fetchReferralData();

      const subscription = supabase
        .channel('public:referrals_update')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'referrals', filter: `referrer_id=eq.${user.id}` },
          () => {
            fetchReferralData();
            toast({ title: t('dashboard.referrals.new_title', 'New Referral!'), description: t('dashboard.referrals.new_desc', 'You have a new referral.') });
          }
        )
        .subscribe();

      return () => {
        mounted = false;
        supabase.removeChannel(subscription);
      };
    } else {
      setStatsLoading(false);
    }
  }, [user, isLocked, toast, t]);

  const handleCopyLink = () => {
    if (isSuspended) {
        toast({ variant: "destructive", title: "Account Suspended", description: "Referral actions are disabled." });
        return;
    }
    if (!referralCode || referralCode === 'PENDING-ALLOCATION') return;

    // Genera el link dinámico basado en donde esté corriendo la app (localhost o reforest.al)
    const link = `${window.location.origin}/ref/${referralCode}`;
    
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast({
        title: t('common.copied_clipboard', 'Copied to clipboard'),
        description: link,
        className: "bg-emerald-50 border-emerald-200"
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (authLoading || (financialLoading && !isLocked)) {
    return <div className="space-y-6 p-4"><Skeleton className="h-10 w-64 rounded-full" /><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div></div>;
  }

  // --- VISTA BLOQUEADA (NO TIENE GENESIS PROFILE) ---
  if (isLocked) {
    return (
      <AnimatePresence>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-8 md:p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-md z-10" />
          <div className="relative z-20 flex flex-col items-center">
            <div className="relative bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6 ring-4 ring-white dark:ring-slate-700 shadow-xl">
              <Lock className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('dashboard.genesis_quest_locked', 'Section Locked')}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
              {t('dashboard.complete_genesis_to_unlock', 'Complete Genesis Quest to unlock.')}
            </p>
            <Button onClick={() => navigate('/genesis-quest')} size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full px-8">
              {t('dashboard.start_genesis_quest', 'Start Genesis Quest')}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- VISTA HABILITADA ---
  const statsCards = [
    { title: t('dashboard.referrals.total', 'Total Referrals'), value: referralStats.total, icon: Users, color: 'blue' },
    { title: t('dashboard.referrals.active', 'Active'), value: referralStats.active, icon: TrendingUp, color: 'green' },
    { title: t('dashboard.referrals.credits', 'Credits Earned'), value: (referralStats.credits || 0).toLocaleString(), icon: Gift, color: 'purple' }
  ];

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h2 className="text-3xl font-bold text-emerald-950 dark:text-emerald-50 mb-3">{t('dashboard.referrals.program_title', 'Referral Program')}</h2>
        {userTier && (
          <div className="mb-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {userTier.name || userTier.slug?.replace('explorer-', '').toUpperCase()}
            </span>
          </div>
        )}
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">{t('dashboard.referrals.program_desc', 'Invite friends and earn rewards.')}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">{stat.title}</p>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-500" /> : stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800`}><Icon className={`w-6 h-6 text-${stat.color}-600`} /></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-colors ${isSuspended ? 'bg-slate-600' : 'bg-emerald-600 shadow-emerald-200/50'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center">
          <h3 className="text-2xl font-bold mb-2">{t('dashboard.referrals.unique_code', 'Your Code')}</h3>
          
          <div className={`max-w-md mx-auto bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/20 flex justify-between items-center gap-4 ${isSuspended ? 'opacity-50' : ''}`}>
            <span className="text-2xl font-mono font-bold tracking-wider">
                {statsLoading ? "..." : referralCode}
            </span>
            {/* Botón simple para copiar solo el código */}
            <Button 
                onClick={() => {navigator.clipboard.writeText(referralCode); toast({ title: "Code Copied" });}} 
                variant="ghost" size="icon" 
                className="text-white hover:bg-white/20"
                disabled={!referralCode || referralCode === 'PENDING-ALLOCATION'}
            >
                <Copy className="w-5 h-5" />
            </Button>
          </div>

          {isSuspended ? (
              /* AQUÍ ESTÁ EL CAMBIO DE CSS: inline-flex */
              <div className="inline-flex items-center justify-center gap-2 text-red-200 font-bold bg-red-900/30 p-2 rounded-lg px-6">
                  <AlertCircle className="w-5 h-5"/> ACCOUNT SUSPENDED - REFERRALS DISABLED
              </div>
          ) : (
              <div className="flex justify-center gap-3">
                  <Button 
                    onClick={handleCopyLink} 
                    className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold min-w-[200px]"
                    disabled={!referralCode || referralCode === 'PENDING-ALLOCATION'}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />} 
                    {copied ? t('common.success', 'Copied!') : t('dashboard.referrals.copy_link', 'Copy Link')}
                  </Button>
              </div>
          )}
        </div>
      </motion.div>

      {/* --- LAND DOLLAR SECTION --- */}
      {!isLocked && (
        <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-10">
          <h3 className="text-2xl font-bold text-center mb-8 text-emerald-900 dark:text-emerald-50">
            {t('dashboard.land_dollar.title', 'Your Digital Asset')}
          </h3>
          <LandDollarDisplay user={user} landDollar={landDollar} />
        </div>
      )}
    </div>
  );
};

export default ReferralSection;