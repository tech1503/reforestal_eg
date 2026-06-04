import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Zap, Lock, Rocket, Check, Trophy, Target, Loader2, FileText, ExternalLink, ShoppingBag, ShieldAlert, Clock } from 'lucide-react'; 
import { useToast } from '@/components/ui/use-toast';
import { cn, formatNumber } from '@/lib/utils'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { executeGamificationAction } from '@/utils/gamificationEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const QuestsSection = () => {
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

      const [simpleQuestsRes, complexMissionsRes, simpleHistoryRes, complexHistoryRes, purchasesRes, pioneerRes] = await Promise.all([
          supabase.from('gamification_actions').select(`*, gamification_action_translations(language_code, action_title, description)`).in('action_type', ['Quest', 'quest', 'Mission Quest', 'mission_quest', 'Custom', 'custom', 'Gamification', 'gamification', 'Profile', 'profile', 'Contribution', 'contribution', 'Referral (MLM)', 'referral_mlm']).eq('is_active', true).eq('is_visible', true),
          supabase.from('genesis_missions').select(`*, genesis_mission_translations!genesis_mission_translations_genesis_mission_id_fkey(language_code, title, description)`).eq('status', 'active'),
          supabase.from('gamification_history').select('action_name').eq('user_id', user.id),
          supabase.from('user_quest_responses').select('mission_id, review_status, is_correct').eq('user_id', user.id),
          supabase.from('user_purchases').select('product_id, exchange_products!inner(unlocks_quest_id)').eq('user_id', user.id).not('exchange_products.unlocks_quest_id', 'is', null),
          supabase.from('founding_pioneer_metrics').select('founding_pioneer_access_status').eq('user_id', user.id).maybeSingle()
      ]);

      const simpleCompletedSet = new Set(simpleHistoryRes.data?.map(h => h.action_name) || []);
      const unlockedIds = new Set(purchasesRes.data?.map(p => p.exchange_products?.unlocks_quest_id) || []);

      const complexCompletedSet = new Set();
      const complexPendingSet = new Set();
      
      (complexHistoryRes.data || []).forEach(h => {
          if (h.review_status === 'approved' || h.review_status === 'auto_approved' || h.is_correct) {
              complexCompletedSet.add(h.mission_id);
          } else if (h.review_status === 'pending') {
              complexPendingSet.add(h.mission_id);
          }
      });

      const userRole = profile?.role || 'user';
      const isPioneer = pioneerRes.data?.founding_pioneer_access_status === 'approved';
      const now = new Date(); 

      const checkAccess = (targetRoleRaw, isPremium = false, systemBinding = '') => {
          const targetRole = (targetRoleRaw || 'all').toLowerCase().trim();
          const binding = (systemBinding || '').toLowerCase().trim();

          if (userRole === 'admin') return { locked: false };
          
          if (binding === 'genesis_quest' || binding === 'initial_profile_quest') {
              return { locked: false };
          }
          
          if (!hasGenesisProfile) return { locked: true, reason: 'genesis_required' };
          if (isPremium) return { locked: false };
          
          if (targetRole === 'startnext_user') {
              if (userRole !== 'startnext_user' && !isPioneer) return { locked: true, reason: 'startnext_required' };
          }
          if (targetRole === 'pioneer') {
              if (!isPioneer) return { locked: true, reason: 'pioneer_required' };
          }
          
          return { locked: false }; 
      };

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
              const binding = (q.system_binding || '').toLowerCase().trim();
              return binding !== 'initial_profile_quest' && binding !== 'genesis_quest';
          })
          .map(q => {
              const trans = getTrans(q, 'simple');
              const isPremium = unlockedIds.has(q.id) && q.target_role !== 'all' && q.target_role !== userRole;
              const access = checkAccess(q.target_role, isPremium, q.system_binding);

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
                  isPending: false,
                  isPremium,
                  targetRole: q.target_role,
                  isLocked: access.locked,
                  lockReason: access.reason
              };
          });

      const complexMapped = (complexMissionsRes.data || [])
        .filter(q => {
            if (q.start_date) {
                const sDate = new Date(q.start_date);
                if (!isNaN(sDate.getTime()) && sDate > now) return false;
            }
            if (q.end_date) {
                const eDate = new Date(q.end_date);
                if (!isNaN(eDate.getTime()) && eDate < now) return false;
            }
            return true;
        })
        .map(q => {
            const trans = getTrans(q, 'genesis');
            const access = checkAccess(q.target_role, false, 'genesis_rpg_mission');

            return {
                id: q.id,
                type: 'genesis',
                title: trans.title,
                credits: q.impact_credit_reward,
                description: trans.description,
                slug: null, 
                completed: complexCompletedSet.has(q.id),
                isPending: complexPendingSet.has(q.id),
                targetRole: q.target_role,
                isLocked: access.locked,
                lockReason: access.reason
            };
        });

      const allQuests = [...simpleMapped, ...complexMapped].sort((a, b) => b.credits - a.credits);
      
      setQuests(allQuests);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id, profile?.role, i18n.language, hasGenesisProfile]);

  useEffect(() => {
    if (user?.id) {
        fetchAllMissions();
        const sub1 = supabase.channel('gamification_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_actions' }, () => fetchAllMissions()).subscribe();
        const sub2 = supabase.channel('genesis_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'genesis_missions' }, () => fetchAllMissions()).subscribe();
        const sub3 = supabase.channel('purchases_updates').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_purchases', filter: `user_id=eq.${user.id}` }, () => fetchAllMissions()).subscribe();
        const sub4 = supabase.channel('user_responses_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'user_quest_responses', filter: `user_id=eq.${user.id}` }, () => fetchAllMissions()).subscribe();
        return () => { supabase.removeChannel(sub1); supabase.removeChannel(sub2); supabase.removeChannel(sub3); supabase.removeChannel(sub4); }
    } else {
        setLoading(false);
    }
  }, [user?.id, fetchAllMissions]);

  const handleInteraction = async (quest) => {
      if (quest.completed || quest.isPending || quest.isLocked) return;
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
          toast({ title: t('common.success'), description: t('quest.earn_credits', { credits: formatNumber(result.points) }), className: "bg-card text-foreground border-border"});
          await refreshFinancials();
          setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: true } : q));
      } else {
          toast({ variant: "destructive", title: t('common.error'), description: result.error });
      }
      setProcessingId(null);
  };

  if (loading) return <div className="h-64 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-gold" /></div>;

  const getButtonText = (quest) => {
      if (quest.completed) return <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4"/> {t('common.success', 'Completado')}</span>;
      if (quest.isPending) return <span className="flex items-center justify-center gap-1.5"><Clock className="w-4 h-4"/> {t('quest.status_in_review', 'En Revisión')}</span>;
      
      if (quest.isLocked) {
          if (quest.lockReason === 'genesis_required') return <span className="flex items-center justify-center gap-1.5"><Lock className="w-4 h-4"/> {t('quest.requires_genesis', 'Requiere Inicial')}</span>;
          if (quest.lockReason === 'startnext_required') return <span className="flex items-center justify-center gap-1.5"><Lock className="w-4 h-4"/> {t('quest.requires_startnext', 'Startnext')}</span>;
          if (quest.lockReason === 'pioneer_required') return <span className="flex items-center justify-center gap-1.5"><Lock className="w-4 h-4"/> {t('quest.requires_pioneer', 'Pionero')}</span>;
          return <span className="flex items-center justify-center gap-1.5"><Lock className="w-4 h-4"/> {t('common.locked', 'Bloqueado')}</span>;
      }

      const binding = (quest.system_binding || '').toLowerCase();
      if (quest.type === 'genesis') return t('dashboard.start_quest', 'Comenzar');
      if (binding === 'profile') return t('navigation.profile', 'Ir a Perfil');
      if (binding === 'referral') return t('quest.go_to_referrals', 'Ir a Referidos');
      if (binding === 'contribution') return t('quest.support_startnext', 'Apoyar en Startnext');
      return t('quest.complete_quest', 'Completar Acción'); 
  };

  const getButtonIcon = (quest) => {
      if (quest.isLocked || quest.completed || quest.isPending) return null;
      const binding = (quest.system_binding || '').toLowerCase();
      if (binding === 'contribution') return <ExternalLink className="w-4 h-4 mr-1.5" />;
      if (binding === 'referral') return <Rocket className="w-4 h-4 mr-1.5" />;
      return null;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-sm bg-card border border-border">
      <div className="p-5 md:p-8">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-gold shadow-glow rounded-xl text-[#063127]">
                <Trophy className="w-5 h-5 md:w-6 md:h-6"/>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">{t('quest.title', 'Misiones')}</h2>
              <p className="text-xs md:text-sm text-white/70">{t('quest.subtitle', 'Completa misiones para ganar puntos.')}</p>
            </div>
        </div>
      
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {/* Tarjeta Discovery para nuevos usuarios */}
            {showDiscoveryCard && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full bg-[#063127] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-gold/30">
                    <div className="relative z-10 flex flex-col items-start justify-center h-full">
                        <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">{t('dashboard.discover_investor_profile')}</h3>
                        <p className="mb-6 opacity-90 text-sm md:text-base max-w-xl leading-relaxed">{t('dashboard.discover_investor_profile_desc')}</p>
                        <Button onClick={() => navigate('/genesis-quest')} className="bg-gradient-gold text-white cale-105 font-bold text-sm md:text-base px-6 py-5 rounded-xl shadow-glow transition-all active:scale-95 border-none">
                            <Rocket className="w-4 h-4 mr-2 text-white"/> {t('dashboard.start_genesis_quest')}
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Listado de Misiones */}
            <AnimatePresence>
                {quests.map((quest, idx) => (
                <motion.div 
                    key={`${quest.type}-${quest.id}`} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(`relative rounded-2xl border p-4 md:p-5 transition-all flex flex-col justify-between`, 
                        (quest.completed || quest.isPending)
                        ? 'bg-black/20 border-white/10 opacity-80 shadow-none' 
                        : quest.isLocked 
                          ? 'bg-black/40 border-dashed border-white/20 opacity-70' 
                          : 'bg-[#063127] border-gold/30 shadow-lg hover:shadow-glow hover:border-gold/50'
                    )}
                >
                    <div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-wrap items-center gap-2">

                                <div className={cn(
                                    "p-1.5 rounded-lg flex items-center justify-center shadow-glow",
                                    quest.isLocked ? 'bg-white/10 text-white/40 shadow-none' 
                                    : 'bg-gradient-gold text-[#063127]'
                                )}>
                                    {quest.type === 'genesis' ? <FileText className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                </div>
                                
                                {quest.isLocked && quest.lockReason === 'genesis_required' && (
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-white/50 border-white/20 bg-white/5"><ShieldAlert className="w-3 h-3 mr-1"/> {t('quest.requires_genesis', 'Inicio')}</Badge>
                                )}
                                {quest.targetRole === 'startnext_user' && (
                                    <Badge variant="outline" className={`text-[9px] uppercase font-bold ${quest.isLocked ? 'text-white/50 border-white/20 bg-white/5' : 'text-gold border-gold/30 bg-gold/10'}`}><Lock className={`w-3 h-3 mr-1 text-gold ${!quest.isLocked && 'hidden'}`}/> Startnext</Badge>
                                )}
                                {quest.targetRole === 'pioneer' && (
                                    <Badge variant="outline" className={`text-[9px] uppercase font-bold ${quest.isLocked ? 'text-white/50 border-white/20 bg-white/5' : 'text-gold border-gold/30 bg-gold/10'}`}><Lock className={`w-3 h-3 mr-1 text-gold ${!quest.isLocked && 'hidden'}`}/> Pionero</Badge>
                                )}
                                {quest.isPremium && (
                                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-gold bg-gold/10 border-gold/30"><ShoppingBag className="w-3 h-3 mr-1 text-gold"/> Premium</Badge>
                                )}
                            </div>

                            <span className={cn(
                                "flex items-center gap-1 text-xs font-black px-2 py-1 rounded-md shrink-0",
                                quest.isLocked 
                                  ? 'text-white/50 bg-white/10 border border-transparent' 
                                  : 'text-gradient-gold bg-gold/10 border border-gold/20'
                            )}>
                                <Zap className="w-3 h-3 text-gold"/> +{formatNumber(quest.credits)} 
                            </span>
                        </div>

                        <div className="mb-2">
                            <h3 className={cn("font-bold text-base leading-tight mb-1.5", quest.isLocked ? 'text-white/50' : 'text-white')}>
                                {t(quest.title, quest.title)}
                            </h3>
                            <p className="text-[13px] text-white/70 leading-snug line-clamp-2">
                                {t(quest.description, quest.description)}
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => handleInteraction(quest)}
                        disabled={quest.completed || quest.isPending || processingId === quest.id || quest.isLocked}
                        className={cn(
                            "w-full font-bold transition-all mt-4 h-10 text-xs sm:text-sm rounded-xl border", 
                            quest.completed 
                                ? 'bg-white/10 text-gold border-transparent cursor-default shadow-none'
                                : quest.isPending
                                ? 'bg-gold/20 text-gold border-gold/30 cursor-default shadow-none'
                                : quest.isLocked
                                ? 'bg-white/5 text-white border-white/10 cursor-not-allowed' 
                                : 'bg-gradient-gold text-white border-transparent shadow-glow hover:scale-105'
                        )}
                    >
                        {processingId === quest.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <div className="flex items-center justify-center">{getButtonIcon(quest)}{getButtonText(quest)}</div>}
                    </Button>
                </motion.div>
                ))}
            </AnimatePresence>
            
            {quests.length === 0 && !showDiscoveryCard && !loading && (
                <div className="col-span-full text-center py-12 text-white/60 border border-dashed border-gold/30 rounded-2xl bg-black/20">
                    <Target className="w-8 h-8 mx-auto mb-3 opacity-50 text-gold"/>
                    <p className="text-sm font-medium">{t('quest.empty_desc', "No hay misiones activas en este momento.")}</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QuestsSection;