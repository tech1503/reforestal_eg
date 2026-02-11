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
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

const ReferralSection = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const { userTier, landDollar, loading: financialLoading } = useFinancial();
  useRealtimeProfileUpdate();

  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0, credits: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isLocked = !user; 
  const isSuspended = landDollar?.status === 'suspended' || landDollar?.status === 'blocked';

  useEffect(() => {
    let mounted = true;

    if (user?.id) {
      const fetchReferralData = async () => {
        try {
          let code = landDollar?.link_ref || profile?.referral_code;
          
          if (!code) {
             const { data } = await supabase.from('land_dollars').select('link_ref').eq('user_id', user.id).maybeSingle();
             code = data?.link_ref;
          }

          if (mounted) {
            setReferralCode(code || 'GENERATING...');
          }

          const { count: totalCount } = await supabase
            .from('referrals')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id); 

          const { data: creditData } = await supabase
            .from('gamification_history')
            .select('impact_credits_awarded')
            .eq('user_id', user.id)
            .ilike('action_type', '%referral%');
            
          const totalCredits = creditData ? creditData.reduce((sum, item) => sum + (Number(item.impact_credits_awarded) || 0), 0) : 0;

          if (mounted) {
            setReferralStats({
              total: totalCount || 0,
              active: totalCount || 0, 
              credits: totalCredits
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          if (mounted) setStatsLoading(false);
        }
      };

      fetchReferralData();
      
      const subscription = supabase.channel('public:referrals_update')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'referrals', filter: `user_id=eq.${user.id}` }, () => fetchReferralData())
        .subscribe();

      return () => { mounted = false; supabase.removeChannel(subscription); };
    } else {
      setStatsLoading(false);
    }
  }, [user, profile, landDollar]);

  const handleCopyLink = () => {
    if (isSuspended) {
        toast({ variant: "destructive", title: "Account Suspended", description: "Referral actions are disabled." });
        return;
    }
    if (!referralCode || referralCode === 'GENERATING...') return;

    const link = `${window.location.origin}/ref/${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast({ title: t('common.copied_clipboard'), description: link });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statsCards = [
      { title: t('dashboard.referrals.total', 'Total Referrals'), value: referralStats.total, icon: Users, color: 'blue' },
      { title: t('dashboard.referrals.active', 'Active'), value: referralStats.active, icon: TrendingUp, color: 'green' },
      { title: t('dashboard.referrals.credits', 'Credits Earned'), value: referralStats.credits, icon: Gift, color: 'purple' }
  ];

  if (authLoading || (financialLoading && !isLocked)) {
    return <div className="space-y-6 p-4"><Skeleton className="h-10 w-64 rounded-full" /></div>;
  }

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-3">{t('dashboard.referrals.program_title', 'Referral Program')}</h2>
        {userTier && <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{userTier.name}</span>}
        <p className="text-muted-foreground max-w-2xl mx-auto">{t('dashboard.referrals.program_desc', 'Invite friends and earn rewards.')}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-500" /> : stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-muted`}><Icon className={`w-6 h-6 text-${stat.color}-600`} /></div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-8 text-white shadow-xl relative overflow-hidden transition-colors ${isSuspended ? 'bg-slate-600' : 'bg-emerald-700 shadow-emerald-200/50'}`}>
        <div className="relative z-10 text-center">
          <h3 className="text-2xl font-bold mb-2">{t('dashboard.referrals.unique_code', 'Your Code')}</h3>
          <div className={`max-w-md mx-auto bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/20 flex justify-between items-center gap-4 ${isSuspended ? 'opacity-50' : ''}`}>
            <span className="text-2xl font-mono font-bold tracking-wider">{statsLoading || !referralCode ? "..." : referralCode}</span>
            <Button onClick={() => {navigator.clipboard.writeText(referralCode); toast({ title: "Code Copied" });}} variant="ghost" size="icon" className="bg-white/20 hover:bg-white/30" disabled={!referralCode}>
                <Copy className="w-5 h-5" />
            </Button>
          </div>
          {isSuspended ? (
              <div className="inline-flex items-center justify-center gap-2 text-red-200 font-bold bg-red-900/30 p-2 rounded-lg px-6"><AlertCircle className="w-5 h-5"/> ACCOUNT SUSPENDED</div>
          ) : (
              <div className="flex justify-center gap-3">
                  <Button onClick={handleCopyLink} className="bg-white text-emerald-900 hover:bg-emerald-500 font-bold min-w-[200px]">
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />} {copied ? t('common.success', 'Copied!') : t('dashboard.referrals.copy_link', 'Copy Link')}
                  </Button>
              </div>
          )}
        </div>
      </motion.div>

      <div className="mt-12 border-t border-border pt-10">
        <h3 className="text-2xl font-bold text-center mb-8 text-foreground">{t('dashboard.land_dollar.title', 'Your Digital Asset')}</h3>
        <LandDollarDisplay user={user} landDollar={landDollar} />
      </div>
    </div>
  );
};

export default ReferralSection;