import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Zap, Lock, Rocket, Check, Trophy, Target, Loader2, FileText, ExternalLink, ShoppingBag } from 'lucide-react'; 
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { executeGamificationAction } from '@/utils/gamificationEngine';
import { motion, AnimatePresence } from 'framer-motion';

const QuestsSection = ({ isReadOnly }) => {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const { refreshFinancials } = useFinancial();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const hasGenesisProfile = !!profile?.genesis_profile;
  const showDiscoveryCard = !hasGenesisProfile;

  const fetchAllMissions = useCallback(async () => {
    try {
      setLoading(true);
      const [simpleQuestsRes, complexMissionsRes, simpleHistoryRes, complexHistoryRes, purchasesRes] = await Promise.all([
          supabase.from('gamification_actions').select(`*, gamification_action_translations(language_code, action_title, description)`).in('action_type', ['Quest', 'quest', 'Mission Quest', 'mission_quest', 'Custom', 'custom', 'Gamification', 'gamification', 'Profile', 'profile', 'Contribution', 'contribution', 'Referral (MLM)', 'referral_mlm']).eq('is_active', true).eq('is_visible', true),
          supabase.from('genesis_missions').select(`*, genesis_mission_translations(language_code, title, description)`).eq('status', 'active'),
          supabase.from('gamification_history').select('action_name').eq('user_id', user.id),
          supabase.from('user_quest_responses').select('mission_id').eq('user_id', user.id).eq('is_correct', true),
          supabase.from('user_purchases').select('product_id, exchange_products!inner(unlocks_quest_id)').eq('user_id', user.id).not('exchange_products.unlocks_quest_id', 'is', null)
      ]);

      const simpleCompletedSet = new Set(simpleHistoryRes.data?.map(h => h.action_name) || []);
      const complexCompletedSet = new Set(complexHistoryRes.data?.map(h => h.mission_id) || []);
      const unlockedIds = new Set(purchasesRes.data?.map(p => p.exchange_products?.unlocks_quest_id) || []);

      const userRole = profile?.role || 'user';

      const getTrans = (item, type) => {
          const lang = i18n.language ? i18n.language.split('-')[0] : 'en';
          if (type === 'simple') {
              const tr = item.gamification_action_translations?.find(t => t.language_code === lang);
              return { title: tr?.action_title || item.action_title || item.action_name, description: tr?.description || item.description };
          } else {
              const tr = item.genesis_mission_translations?.find(t => t.language_code === lang);
              return { title: tr?.title || item.title, description: tr?.description || item.description };
          }
      };

      const simpleMapped = (simpleQuestsRes.data || [])
        .filter(q => {
            const target = q.target_role || 'all'; 
            return (target === 'all' || target === userRole || unlockedIds.has(q.id));
        })
        .map(q => {
            const trans = getTrans(q, 'simple');
            const isPremium = unlockedIds.has(q.id) && q.target_role !== 'all' && q.target_role !== userRole;
            return {
                id: q.id,
                type: 'simple',
                title: trans.title, 
                credits: q.impact_credits_value, 
                description: trans.description,
                slug: q.action_name,
                system_binding: q.system_binding,
                action_type: q.action_type, 
                completed: simpleCompletedSet.has(q.action_name),
                isPremium
            };
        });

      const complexMapped = (complexMissionsRes.data || [])
        .filter(q => {
            const target = q.target_role || 'all';
            return target === 'all' || target === userRole;
        })
        .map(q => {
            const trans = getTrans(q, 'genesis');
            return {
                id: q.id,
                type: 'genesis',
                title: trans.title,
                credits: q.impact_credit_reward,
                description: trans.description,
                slug: null, 
                completed: complexCompletedSet.has(q.id)
            };
        });

      const allQuests = [...simpleMapped, ...complexMapped].sort((a, b) => {
          if (a.completed === b.completed) return b.credits - a.credits;
          return a.completed ? 1 : -1;
      });
      
      setQuests(allQuests);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id, profile?.role, i18n.language]);

  useEffect(() => {
    if (user?.id && hasGenesisProfile) {
        fetchAllMissions();
        const sub1 = supabase.channel('gamification_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_actions' }, () => fetchAllMissions()).subscribe();
        const sub2 = supabase.channel('genesis_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'genesis_missions' }, () => fetchAllMissions()).subscribe();
        const sub3 = supabase.channel('purchases_updates').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_purchases', filter: `user_id=eq.${user.id}` }, () => fetchAllMissions()).subscribe();
        return () => { supabase.removeChannel(sub1); supabase.removeChannel(sub2); supabase.removeChannel(sub3); }
    } else {
        setLoading(false);
    }
  }, [profile?.genesis_profile, user?.id, fetchAllMissions, hasGenesisProfile]);

  const handleInteraction = async (quest) => {
      if (quest.completed) return;
      const basePath = location.pathname.includes('/startnext') ? '/startnext' : '/dashboard';
      if (quest.type === 'genesis') { navigate(`${basePath}/mission/${quest.id}`); return; }

      const binding = (quest.system_binding || '').toLowerCase();
      const actionType = (quest.action_type || '').toLowerCase();

      if (binding === 'profile' || binding === 'profile_update') { navigate(`${basePath}/profile`); return; }
      if (binding === 'referral' || binding === 'referral_mlm' || actionType.includes('referral')) { navigate(`${basePath}/referral`); return; }
      if (binding === 'contribution' || actionType.includes('contribution')) { window.open('https://www.startnext.com/reforestal', '_blank'); return; }
      
      setProcessingId(quest.id);
      const result = await executeGamificationAction(user.id, quest.slug);

      if (result.success) {
          toast({ title: t('common.success'), description: t('quest.earn_credits', { credits: result.points }), className: "bg-emerald-50 border-emerald-200 text-emerald-900"});
          await refreshFinancials();
          setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: true } : q));
      } else {
          toast({ variant: "destructive", title: t('common.error'), description: result.error });
      }
      setProcessingId(null);
  };

  if (loading) return <div className="h-64 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>;

  const getButtonText = (quest) => {
      const binding = (quest.system_binding || '').toLowerCase();
      if (quest.completed) return <span className="flex items-center gap-2"><Check className="w-4 h-4"/> {t('common.success')}</span>;
      if (isReadOnly) return <Lock className="w-4 h-4"/>;
      if (quest.type === 'genesis') return t('dashboard.start_quest');
      if (binding === 'profile') return t('navigation.profile');
      if (binding === 'referral') return "Go to Referrals";
      if (binding === 'contribution') return "Support on Startnext";
      return t('quest.complete_quest'); 
  };

  const getButtonIcon = (quest) => {
      const binding = (quest.system_binding || '').toLowerCase();
      if (binding === 'contribution') return <ExternalLink className="w-4 h-4 mr-2" />;
      if (binding === 'referral') return <Rocket className="w-4 h-4 mr-2" />;
      return null;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-lg bg-card/50 backdrop-blur-md border border-white/20">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><Trophy className="w-6 h-6"/></div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t('dashboard.available_quests')}</h2>
              <p className="text-sm text-muted-foreground">{t('quest.subtitle')}</p>
            </div>
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {showDiscoveryCard && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                    <div className="relative z-10 flex flex-col items-start justify-center h-full">
                        <h3 className="text-3xl font-bold mb-3">{t('dashboard.discover_investor_profile')}</h3>
                        <p className="mb-8 opacity-90 text-lg max-w-2xl">{t('dashboard.discover_investor_profile_desc')}</p>
                        <Button onClick={() => navigate('/genesis-quest')} className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold text-lg px-8 py-6 rounded-full shadow-lg">
                            <Rocket className="w-5 h-5 mr-3 text-emerald-600"/> {t('dashboard.start_genesis_quest')}
                        </Button>
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
                {quests.map((quest, idx) => (
                <motion.div 
                    key={`${quest.type}-${quest.id}`} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(`relative rounded-2xl border p-6 transition-all`, 
                        quest.completed 
                        ? 'bg-muted border-border opacity-70' 
                        : 'bg-card border-border hover:shadow-md hover:border-emerald-300'
                    )}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${quest.type === 'genesis' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {quest.type === 'genesis' ? <FileText className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                        </div>
                        <div className="flex gap-2">
                             {quest.isPremium && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded border border-amber-200 uppercase tracking-wider">
                                   <ShoppingBag className="w-3 h-3"/> Unlocked
                                </span>
                             )}
                             <span className="flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                <Zap className="w-3 h-3"/> +{quest.credits} 
                             </span>
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="font-bold text-lg text-foreground mb-1">{t(quest.title, quest.title)}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{t(quest.description, quest.description)}</p>
                    </div>

                    <Button
                        onClick={() => handleInteraction(quest)}
                        disabled={isReadOnly || quest.completed || processingId === quest.id}
                        className={cn(`w-full font-bold shadow-sm transition-all`, quest.completed ? 'bg-muted text-muted-foreground' : 'bg-emerald-600 text-white hover:bg-emerald-700')}
                    >
                        {processingId === quest.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <>{!quest.completed && getButtonIcon(quest)}{getButtonText(quest)}</>}
                    </Button>
                </motion.div>
                ))}
            </AnimatePresence>
            
            {quests.length === 0 && !showDiscoveryCard && !loading && (
                <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                    <p>{t('quests.empty_desc', "No active quests.")}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QuestsSection;