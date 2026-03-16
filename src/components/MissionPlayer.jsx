import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Trophy, Lightbulb, Zap, Check, SkipForward, Star, Shield, ExternalLink, Sparkles, Leaf, Instagram, Youtube, Info, PlayCircle, Users, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { useTranslation } from 'react-i18next';
import { executeGamificationAction } from '@/utils/gamificationEngine';
import { cn } from '@/lib/utils';
import { createNotification } from '@/utils/notificationUtils';
import LeafBackground from '@/components/ui/LeafBackground';

const YouTubeEmbed = ({ videoId }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const { t } = useTranslation();

    const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const fallbackThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

    if (isPlaying) {
        return (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md mb-4 border border-white/10 bg-black">
                <iframe 
                    src={embedUrl} 
                    title="YouTube video player" 
                    className="absolute top-0 left-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                ></iframe>
            </div>
        );
    }

    return (
        <div 
            className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md mb-4 border border-white/10 bg-black cursor-pointer group"
            onClick={() => setIsPlaying(true)}
        >
            <img 
                src={thumbUrl} 
                onError={(e) => { e.target.src = fallbackThumb; }}
                alt="Video Preview" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" 
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex flex-col justify-between p-2 md:p-4">
                <div />
                <div className="flex justify-center transform group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-14 h-14 md:w-16 md:h-16 text-white opacity-90 drop-shadow-lg" strokeWidth={1} />
                </div>
                <div className="flex justify-between items-end w-full">
                    <div className="flex items-center gap-1.5 text-white/90 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium border border-white/10">
                        <Info className="w-3 h-3" />
                        <span>{t('mission.privacy_note', 'Privacy Note')}</span>
                    </div>
                    <Youtube className="w-8 h-8 text-white opacity-90 drop-shadow-md" strokeWidth={1.5} />
                </div>
            </div>
        </div>
    );
};

const ResourceAllocator = ({ poles, values, onChange }) => {
    const { t } = useTranslation();
    const totalAllocated = Object.values(values).reduce((a, b) => a + b, 0);
    const remaining = 100 - totalAllocated;

    const handleSliderChange = (pole, newValue) => {
        const diff = newValue - (values[pole] || 0);
        if (remaining - diff >= 0) {
            onChange({ ...values, [pole]: newValue });
        }
    };

    return (
        <div className="space-y-4 bg-card/60 backdrop-blur-xl p-4 lg:p-6 rounded-xl border border-white/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#5b8370]/10 rounded-full blur-[40px] pointer-events-none" />
            <div className="flex justify-between items-center mb-3 relative z-10">
                <span className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[#5b8370]" />
                    {t('mission.distribute_resources', 'Distribute Resources')}
                </span>
                <Badge variant={remaining === 0 ? 'default' : 'secondary'} className={cn("px-2 py-1 shadow-sm font-bold text-xs", remaining === 0 && 'bg-[#5b8370] text-white')}>
                    {remaining}% {t('mission.remaining', 'Remaining')}
                </Badge>
            </div>
            <div className="space-y-4 relative z-10">
                {poles.map((pole, idx) => (
                    <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                            <span className="uppercase tracking-widest">{pole}</span>
                            <span className="text-[#5b8370] font-black text-sm">{values[pole] || 0}%</span>
                        </div>
                        <div className="relative">
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={values[pole] || 0} 
                                onChange={(e) => handleSliderChange(pole, parseInt(e.target.value))}
                                className="w-full h-2.5 bg-muted/50 rounded-full appearance-none cursor-pointer accent-[#5b8370] hover:accent-[#063127] transition-all shadow-inner border border-white/5"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MissionPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { refreshFinancials } = useFinancial();
  const { toast } = useToast();
  const { t, i18n } = useTranslation(); 

  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepAnswers, setStepAnswers] = useState({});
  const [result, setResult] = useState(null); 
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [accumulatedPenalty, setAccumulatedPenalty] = useState(0);
  const [penalizedSteps, setPenalizedSteps] = useState(new Set()); 
  const [earnedCredits, setEarnedCredits] = useState(0);

  const [isRestartModalOpen, setIsRestartModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (id && currentStepIndex !== -1 && !result) {
        sessionStorage.setItem(`mission_progress_${id}`, JSON.stringify({
            stepIndex: currentStepIndex,
            answers: stepAnswers,
            penalty: accumulatedPenalty,
            penalizedSteps: Array.from(penalizedSteps)
        }));
    }
  }, [currentStepIndex, stepAnswers, accumulatedPenalty, penalizedSteps, id, result]);

  useEffect(() => {
      return () => {
          sessionStorage.removeItem(`mission_progress_${id}`);
      };
  }, [id]);

  const goBack = useCallback(() => {
      sessionStorage.removeItem(`mission_progress_${id}`); 
      const basePath = location.pathname.includes('/startnext') ? '/startnext/quests' : '/dashboard/quests';
      navigate(basePath);
  }, [location.pathname, navigate, id]);

  const handleRestartClick = () => {
      setIsRestartModalOpen(true);
  };

  const confirmRestart = () => {
      sessionStorage.removeItem(`mission_progress_${id}`);
      setCurrentStepIndex(-1);
      setAccumulatedPenalty(0);
      setPenalizedSteps(new Set());
      const initialAnswers = {};
      mission.parsedSteps.forEach((step, idx) => {
          if (step.ui_type === 'multiple_choice') initialAnswers[idx] = [];
          else if (step.ui_type === 'circular_slider') initialAnswers[idx] = {};
          else initialAnswers[idx] = '';
      });
      setStepAnswers(initialAnswers);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsRestartModalOpen(false); // Cierra el modal
  };

  const fetchMission = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('genesis_missions')
        .select(`*, genesis_mission_translations (language_code, title, subtitle, description, extra_info, success_message, response_options, steps_translation)`) 
        .eq('id', id)
        .limit(1)
        .single();
      
      if (error) {
          console.warn("Mission not found or DB error:", error);
          throw error;
      }

      const { data: existing } = await supabase.from('user_quest_responses')
        .select('id, review_status')
        .eq('user_id', user.id).eq('mission_id', id)
        .in('review_status', ['auto_approved', 'approved', 'pending'])
        .limit(1)
        .maybeSingle();

      if (existing) setResult('already_completed');

      const lang = i18n.language ? i18n.language.split('-')[0] : 'en';
      
      let translation = null;
      if (data.genesis_mission_translations && Array.isArray(data.genesis_mission_translations)) {
          translation = data.genesis_mission_translations.find(t => t.language_code === lang) 
                     || data.genesis_mission_translations.find(t => t.language_code === 'en');
      }
      
      let parsedSteps = [];
      if (Array.isArray(data.steps)) {
          parsedSteps = data.steps;
      } else if (typeof data.steps === 'string' && data.steps.trim() !== '') {
          try { 
              parsedSteps = JSON.parse(data.steps); 
          } catch(e) { 
              console.error("Critical error parsing mission steps:", e);
              parsedSteps = []; 
          }
      }

      let parsedStepsTrans = [];
      if (translation && translation.steps_translation) {
           if (typeof translation.steps_translation === 'string' && translation.steps_translation.trim() !== '') {
               try { 
                   parsedStepsTrans = JSON.parse(translation.steps_translation); 
               } catch(e) { 
                   console.error("Error parsing steps translation:", e);
               }
           } else if (Array.isArray(translation.steps_translation)) {
               parsedStepsTrans = translation.steps_translation;
           }
      }

      if (parsedSteps.length > 0) {
          parsedSteps = parsedSteps.map((step, idx) => {
              const transStep = parsedStepsTrans[idx] || {};
              return {
                  ...step,
                  title: transStep.title || step.title || `Step ${idx + 1}`,
                  content: transStep.content || step.content || '',
                  media_url: step.media_url || '',
                  options: (transStep.options && transStep.options.length > 0 && transStep.options.some(o => o)) 
                           ? step.options.map((o, i) => transStep.options[i] || o) 
                           : (step.options || []),
                  poles: (transStep.poles && transStep.poles.length > 0 && transStep.poles.some(p => p))
                         ? step.poles.map((p, i) => transStep.poles[i] || p)
                         : (step.poles || [])
              };
          });
      }

      const processedMission = {
          ...data,
          displayTitle: translation?.title || data.title || 'Mission',
          displaySubtitle: translation?.subtitle || data.subtitle || null,
          displayDescription: translation?.description || data.description || '',
          displayExtraInfo: translation?.extra_info || data.extra_info || null,
          successMessage: translation?.success_message || null,
          parsedSteps: parsedSteps
      };

      setMission(processedMission);

      const savedStateStr = sessionStorage.getItem(`mission_progress_${id}`);
      let savedState = null;
      if (savedStateStr) {
          try { savedState = JSON.parse(savedStateStr); } catch(e) {}
      }

      const initialAnswers = savedState?.answers || {};
      if (!savedState) {
          parsedSteps.forEach((step, idx) => {
              if (step.ui_type === 'multiple_choice') initialAnswers[idx] = [];
              else if (step.ui_type === 'circular_slider') initialAnswers[idx] = {};
              else initialAnswers[idx] = '';
          });
      }
      setStepAnswers(initialAnswers);

      if (savedState) {
          if (savedState.stepIndex !== undefined) setCurrentStepIndex(savedState.stepIndex);
          if (savedState.penalty) setAccumulatedPenalty(savedState.penalty);
          if (savedState.penalizedSteps) setPenalizedSteps(new Set(savedState.penalizedSteps));
      }

    } catch (error) {
      toast({ variant: "destructive", title: t('common.error'), description: t('mission.load_failed', "Failed to load mission.") });
      goBack();
    } finally {
      setLoading(false);
    }
  }, [id, user.id, toast, t, goBack, i18n.language]);

  useEffect(() => { fetchMission(); }, [fetchMission]);

  const currentStep = mission?.parsedSteps[currentStepIndex];
  const isLastStep = currentStepIndex === (mission?.parsedSteps.length - 1);
  const progressPercentage = mission?.parsedSteps.length > 0 
        ? ((currentStepIndex + 1) / mission.parsedSteps.length) * 100 
        : 0;

  const handleAnswerUpdate = (val) => {
      setStepAnswers(prev => ({ ...prev, [currentStepIndex]: val }));
  };

  const validateCurrentStep = async () => {
      if (!currentStep) return true;
      if (currentStep.type === 'content') return true;
      
      const answer = stepAnswers[currentStepIndex];
      
      if (currentStep.is_required) {
          let isValid = true;
          if (currentStep.ui_type === 'multiple_choice' && (!answer || answer.length === 0)) isValid = false;
          if (currentStep.ui_type === 'circular_slider') {
              const total = Object.values(answer || {}).reduce((a,b)=>a+b, 0);
              if (total !== 100) isValid = false;
          }
          if (typeof answer === 'string' && !answer.trim() && currentStep.ui_type !== 'circular_slider') isValid = false;

          if (!isValid) {
              toast({ variant: "destructive", title: t('common.error'), description: t('common.required_field', "This field is required.") });
              return false;
          }
      }

      if (currentStep.correct_answer !== undefined && currentStep.correct_answer !== null && currentStep.correct_answer !== '') {
          if (String(answer) !== String(currentStep.correct_answer)) {
              
              if (!penalizedSteps.has(currentStepIndex)) {
                  let penaltyAmount = 0;

                  if (currentStep.apply_penalty && currentStep.penalty_value > 0) {
                      if (currentStep.penalty_type === 'percentage') {
                          penaltyAmount = Math.round((mission.impact_credit_reward * currentStep.penalty_value) / 100);
                      } else {
                          penaltyAmount = currentStep.penalty_value;
                      }
                  } else if (mission.global_penalty_percentage > 0) {
                      penaltyAmount = Math.round((mission.impact_credit_reward * mission.global_penalty_percentage) / 100);
                  }

                  if (penaltyAmount > 0) {
                      setAccumulatedPenalty(prev => prev + penaltyAmount);
                      setPenalizedSteps(prev => new Set(prev).add(currentStepIndex));
                      
                      toast({ 
                          variant: "destructive", 
                          title: t('mission.incorrect_title', "Incorrect Answer"), 
                          description: t('mission.penalty_applied_credits', { amount: penaltyAmount, defaultValue: `Penalty applied: -${penaltyAmount} BP.` }) 
                      });
                  } else {
                      toast({ 
                          variant: "destructive", 
                          title: t('mission.incorrect_title', "Incorrect"), 
                          description: t('mission.review_answer', "Review your answer and try again.") 
                      });
                  }
              } else {
                  toast({ 
                      variant: "destructive", 
                      title: t('mission.incorrect_title', "Incorrect"), 
                      description: t('mission.review_answer', "Review your answer and try again.") 
                  });
              }

              if (currentStep.on_fail_redirect) {
                  toast({ 
                      variant: "destructive", 
                      title: t('mission.incorrect_title', "Incorrect Answer"), 
                      description: t('mission.redirect_msg', "You will be redirected to review the materials.") 
                  });
                  setTimeout(() => window.open(currentStep.on_fail_redirect, '_blank'), 1500);
              }
              
              return false; 
          }
      }

      return true;
  };

  const handleNextStep = async () => {
      const isValid = await validateCurrentStep();
      if (!isValid) return; 
      
      if (isLastStep) handleFinalSubmit();
      else {
          setCurrentStepIndex(prev => prev + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleSkipMission = async () => {
      if (!window.confirm(t('mission.skip_confirm', { penalty: mission.skip_penalty }))) return;
      setSubmitting(true);
      try {
          await executeGamificationAction(user.id, null, {
              dynamicAction: {
                  id: mission.id, 
                  action_name: `skip_${mission.id.slice(0,8)}`,
                  action_title: `Skipped: ${mission.displayTitle}`,
                  action_type: 'Mission Quest',
                  impact_credit_reward: 0,
                  reputation_reward: -Math.abs(mission.skip_penalty)
              },
              notes: `Mission Skipped by user.`,
              preventNotification: true
          });

          sessionStorage.removeItem(`mission_progress_${mission.id}`); 

          toast({ title: t('mission.skipped_title', "Mission Skipped"), description: t('mission.penalty_applied', { penalty: mission.skip_penalty }) });
          setResult('skipped');
          await refreshFinancials();
      } catch (err) {
          toast({ variant: "destructive", title: t('common.error'), description: err.message });
      } finally {
          setSubmitting(false);
      }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
        const needsReview = mission.parsedSteps.some(s => s.ui_type === 'free_text') && !mission.auto_approve;
        const finalStatus = needsReview ? 'pending' : 'auto_approved';

        const calculatedFinalReward = Math.max(0, mission.impact_credit_reward - accumulatedPenalty);
        setEarnedCredits(calculatedFinalReward);

        const { error: dbError } = await supabase.from('user_quest_responses').insert({
            user_id: user.id,
            mission_id: mission.id,
            response_data: stepAnswers,
            is_correct: !needsReview, 
            review_status: finalStatus,
            credits_awarded: calculatedFinalReward 
        });

        if (dbError) throw dbError;

        if (!needsReview) {
            await executeGamificationAction(user.id, null, {
                dynamicAction: {
                    id: mission.id, 
                    action_name: `mission_${mission.id.slice(0,8)}`,
                    action_title: mission.displayTitle,
                    action_type: 'Mission Quest',
                    impact_credit_reward: calculatedFinalReward, 
                    reputation_reward: mission.reputation_reward,
                    source_event: 'quest_completion'
                },
                notes: `Completed multi-step mission: ${mission.displayTitle}. Penalties: -${accumulatedPenalty}`,
                languageCode: i18n.language
            });

            if (mission.referrer_reward > 0) {
                try {
                    const { data: profileData } = await supabase.from('profiles').select('referrer_id').eq('id', user.id).single();
                    
                    if (profileData?.referrer_id) {
                        await executeGamificationAction(profileData.referrer_id, null, {
                            dynamicAction: {
                                id: mission.id,
                                action_name: `mlm_mission_${mission.id.slice(0,8)}`,
                                action_title: `Red Bonus: ${mission.displayTitle}`,
                                action_type: 'Referral (MLM)',
                                impact_credit_reward: mission.referrer_reward,
                                reputation_reward: 0,
                                source_event: 'mlm_indirect_quest'
                            },
                            preventNotification: true
                        });
                        await createNotification(
                            profileData.referrer_id, 
                            'notifications.points_earned.title', 
                            'notifications.points_earned.message', 
                            { points: mission.referrer_reward, action: mission.displayTitle }, 
                            'bonus'
                        );
                    }
                } catch (mlmErr) {
                    console.error("MLM Distribution Error:", mlmErr);
                }
            }

            setResult('success');
        } else {
            toast({ title: t('mission.submitted_title', "Mission Submitted!"), description: t('mission.review_msg', "An Admin will review your answers shortly."), className: "bg-[#063127] text-white" });
            setResult('pending_review');
        }

        sessionStorage.removeItem(`mission_progress_${mission.id}`); 
        await refreshFinancials();

    } catch (error) {
        console.error("Submission Error:", error);
        toast({ variant: "destructive", title: t('common.error'), description: t('mission.submit_failed', "Submission failed.") });
    } finally {
        setSubmitting(false);
    }
  };

  const renderMedia = (url) => {
      if (!url || typeof url !== 'string') return null;
      
      const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})/);
      
      if (ytMatch && ytMatch[1]) {
          return <YouTubeEmbed videoId={ytMatch[1]} />;
      }

      if (url.includes('instagram.com')) {
          return (
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="relative flex flex-col items-center justify-center w-full aspect-[21/9] md:aspect-[3/1] rounded-xl overflow-hidden shadow-lg mb-6 border border-white/10 group cursor-pointer bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
                title={t('mission.view_instagram', 'View on Instagram')}
              >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                  <div className="relative z-10 flex flex-col items-center transform group-hover:scale-110 transition-transform duration-500">
                      <Instagram className="w-10 h-10 md:w-12 md:h-12 text-white mb-2 drop-shadow-lg" />
                      <span className="text-white font-bold text-xs md:text-sm bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-md flex items-center gap-2">
                          <ExternalLink className="w-3 h-3 md:w-4 md:h-4" /> {t('mission.open_instagram', 'Open in Instagram')}
                      </span>
                  </div>
              </a>
          );
      }
      
      return (
        <div className="relative w-full rounded-xl overflow-hidden shadow-lg mb-4 border border-white/5 bg-black/20 flex items-center justify-center">
            <img 
                src={url} 
                alt="Media content" 
                className="w-full h-auto max-h-[250px] object-contain" 
                onError={(e) => { e.target.style.display = 'none'; }}
            />
        </div>
      );
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] bg-background"><Loader2 className="w-10 h-10 animate-spin text-[#5b8370]"/></div>;
  if (!mission) return <div className="text-center p-12 text-muted-foreground">{t('quest.not_found', "Mission not found")}</div>;

  return (
    <div className="w-full flex flex-col items-center relative min-h-[90vh] font-sans pb-10">
      
      <LeafBackground />
      
      {result === 'success' && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={300} gravity={0.2} style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }} />}

      <div className="w-full max-w-3xl relative z-10 px-3 pt-4 md:pt-6">
        <AnimatePresence mode="wait">
            
            {/* --- PANTALLA 1: INTRODUCCIÓN DE LA MISIÓN --- */}
            {currentStepIndex === -1 && !result && (
                <motion.div key="intro" initial={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                    
                    <Card className="shadow-2xl border border-white/10 overflow-hidden bg-card/90 backdrop-blur-xl rounded-3xl relative">
                        
                        {/* Botón Volver Integrado */}
                        <div className="absolute top-3 left-3 z-20">
                            <Button variant="ghost" onClick={goBack} className="text-white/90 hover:text-white font-semibold bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full px-3 py-1 h-auto text-xs transition-all border border-transparent hover:border-white/20 shadow-sm">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {t('common.back')}
                            </Button>
                        </div>

                        {mission.image_url && (
                            <div className="w-full h-36 md:h-48 relative overflow-hidden bg-slate-950 group">
                                <img src={mission.image_url} alt="Cover" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                            </div>
                        )}

                        <CardContent className={`pt-6 px-5 md:px-8 text-center pb-6 ${!mission.image_url ? 'pt-14' : ''}`}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <Badge className="mb-3 bg-[#5b8370]/20 text-[#5b8370] hover:bg-[#5b8370]/30 border border-[#5b8370]/30 uppercase tracking-[0.1em] px-2.5 py-0.5 shadow-sm font-bold rounded-full text-[10px]">
                                    <Sparkles className="w-3 h-3 mr-1 inline-block -mt-0.5"/>
                                    {mission.skill_category}
                                </Badge>
                                <h1 className="text-2xl md:text-3xl font-black text-[#063127] dark:text-white mb-2 tracking-tight drop-shadow-sm leading-tight px-4">
                                    {mission.displayTitle}
                                </h1>
                                {mission.displaySubtitle && (
                                    <p className="text-sm md:text-base text-[#063127] dark:text-[#c4d1c0] font-medium mb-4 whitespace-pre-wrap">
                                        {mission.displaySubtitle}
                                    </p>
                                )}
                            </motion.div>
                            
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/50 dark:bg-black/20 p-4 rounded-xl text-sm text-foreground/90 leading-relaxed mb-5 border border-white/10 shadow-sm text-left md:text-center backdrop-blur-sm">
                                {mission.displayDescription}
                            </motion.div>

                            {mission.displayExtraInfo && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-start gap-2.5 p-3 bg-[#c4d1c0]/20 text-[#063127] dark:text-[#c4d1c0] rounded-xl text-left mb-6 border border-[#5b8370]/30 shadow-sm">
                                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                                    <p className="text-xs font-medium leading-relaxed">{mission.displayExtraInfo}</p>
                                </motion.div>
                            )}

                            {/* RECOMPENSAS COMPACTAS */}
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap justify-center gap-2.5 mb-6">
                                {/* BP al Usuario */}
                                <div className="flex items-center gap-2 bg-[#5b8370]/10 border border-[#5b8370]/20 px-3 py-1.5 rounded-lg w-auto">
                                    <div className="bg-[#5b8370] p-1.5 rounded-md shadow-sm"><Zap className="w-4 h-4 text-white" /></div>
                                    <div className="text-left">
                                        <p className="text-[9px] uppercase font-bold text-[#063127] dark:text-[#c4d1c0]/70">{t('rewards.bonus_points', 'Bonos')}</p>
                                        <p className="font-black text-base text-[#5b8370] dark:text-white">+{mission.impact_credit_reward}</p>
                                    </div>
                                </div>
                                {/* Reputación al Usuario */}
                                {mission.reputation_reward > 0 && (
                                    <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg w-auto">
                                        <div className="bg-blue-500 p-1.5 rounded-md shadow-sm"><Shield className="w-4 h-4 text-white" /></div>
                                        <div className="text-left">
                                            <p className="text-[9px] uppercase font-bold text-blue-800 dark:text-blue-400/70">{t('rewards.reputation', 'Reputation')}</p>
                                            <p className="font-black text-base text-blue-700 dark:text-blue-300">+{mission.reputation_reward}</p>
                                        </div>
                                    </div>
                                )}
                                {/* Premio por Referir */}
                                {mission.referrer_reward > 0 && (
                                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg w-auto">
                                        <div className="bg-purple-500 p-1.5 rounded-md shadow-sm"><Users className="w-4 h-4 text-white" /></div>
                                        <div className="text-left">
                                            <p className="text-[9px] uppercase font-bold text-purple-800 dark:text-purple-400/70">{t('rewards.referral_bonus', 'Por Invitar')}</p>
                                            <p className="font-black text-base text-purple-700 dark:text-purple-300">+{mission.referrer_reward}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                                <Button size="lg" onClick={() => setCurrentStepIndex(0)} className="w-full sm:w-2/3 h-12 text-base font-bold rounded-xl bg-gradient-to-r from-[#063127] to-[#5b8370] text-white shadow-md hover:shadow-lg transition-all active:scale-95 border-none group">
                                    {t('mission.start_btn', 'Start Mission')} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                                </Button>
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* --- PANTALLA 2: PASOS Y PREGUNTAS --- */}
            {currentStepIndex >= 0 && !result && currentStep && (
                <motion.div 
                    key={`step-${currentStepIndex}`} 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full"
                >
                    {/* Progress Bar Top */}
                    <div className="mb-4 px-2">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                            <span>{t('mission.step_x_of_y', { current: currentStepIndex + 1, total: mission.parsedSteps.length })}</span>
                            <span className="text-[#5b8370]">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="relative h-2 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/10">
                            <motion.div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#063127] to-[#5b8370]"
                                initial={{ width: `${currentStepIndex === 0 ? 0 : ((currentStepIndex) / mission.parsedSteps.length) * 100}%` }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                            />
                        </div>
                    </div>

                    <Card className="shadow-xl border border-white/10 bg-card/90 backdrop-blur-xl rounded-2xl overflow-hidden relative">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#5b8370]/40 to-transparent" />

                        <CardContent className="p-5 md:p-8 relative z-10 flex flex-col min-h-[50vh]">
                            
                            {renderMedia(currentStep.media_url)}

                            <h2 className="text-xl md:text-2xl font-black text-[#063127] dark:text-white mb-3 leading-tight tracking-tight drop-shadow-sm break-words">
                                {currentStep.title}
                            </h2>
                            
                            {currentStep.content && (
                                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-5 font-medium whitespace-pre-wrap">
                                    {currentStep.content}
                                </p>
                            )}

                            <div className="flex-1 mt-1">
                                {currentStep.type === 'question' && (
                                    <div className="space-y-4">
                                        {(currentStep.ui_type === 'single_choice' || currentStep.ui_type === 'multiple_choice') && (
                                            <div className="grid gap-3">
                                                {(currentStep.options || []).map((opt, idx) => {
                                                    const isMulti = currentStep.ui_type === 'multiple_choice';
                                                    const currentAnswers = Array.isArray(stepAnswers[currentStepIndex]) ? stepAnswers[currentStepIndex] : [];
                                                    const isSelected = isMulti ? currentAnswers.includes(String(idx)) : String(stepAnswers[currentStepIndex]) === String(idx);
                                                    const letter = String.fromCharCode(65 + idx); 
                                                    
                                                    const toggleOption = () => {
                                                        if (isMulti) {
                                                            let newAnswers = [...currentAnswers];
                                                            if (isSelected) newAnswers = newAnswers.filter(val => val !== String(idx));
                                                            else newAnswers.push(String(idx));
                                                            newAnswers.sort((a, b) => Number(a) - Number(b));
                                                            handleAnswerUpdate(newAnswers);
                                                        } else {
                                                            handleAnswerUpdate(String(idx));
                                                        }
                                                    };

                                                    return (
                                                        <motion.div 
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            key={idx}
                                                            onClick={toggleOption} 
                                                            className={cn(
                                                                "flex items-center p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group overflow-hidden relative",
                                                                isSelected 
                                                                    ? "border-[#5b8370] bg-[#5b8370]/10 shadow-sm" 
                                                                    : "border-slate-200 dark:border-white/10 bg-white/5 hover:border-[#5b8370]/40"
                                                            )}
                                                        >
                                                            {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-[#5b8370]/5 to-transparent pointer-events-none" />}

                                                            <div className={cn(
                                                                "w-8 h-8 md:w-10 md:h-10 rounded-lg border-2 flex items-center justify-center mr-3 transition-colors shrink-0 z-10",
                                                                isSelected ? "border-[#5b8370] bg-[#5b8370] text-white" : "border-slate-300 dark:border-white/20 text-muted-foreground group-hover:border-[#5b8370]"
                                                            )}>
                                                                {isSelected ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <span className="font-bold text-sm">{letter}</span>}
                                                            </div>
                                                            <span className={cn(
                                                                "text-sm md:text-base font-semibold transition-colors z-10", 
                                                                isSelected ? "text-[#063127] dark:text-white" : "text-muted-foreground group-hover:text-foreground"
                                                            )}>
                                                                {opt}
                                                            </span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {currentStep.ui_type === 'circular_slider' && (
                                            <ResourceAllocator poles={currentStep.poles || []} values={stepAnswers[currentStepIndex] || {}} onChange={handleAnswerUpdate} />
                                        )}

                                        {currentStep.ui_type === 'scale_5' && (
                                            <div className="flex justify-center gap-2 md:gap-4 py-6 bg-black/5 dark:bg-white/5 rounded-xl border border-white/10 shadow-inner">
                                                {[1,2,3,4,5].map(num => {
                                                    const isActive = stepAnswers[currentStepIndex] >= num;
                                                    return (
                                                        <motion.button 
                                                            whileHover={{ scale: 1.1, y: -2 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            key={num} 
                                                            onClick={() => handleAnswerUpdate(num)}
                                                            className={cn(
                                                                "w-10 h-10 md:w-14 md:h-14 rounded-full flex flex-col items-center justify-center transition-colors shrink-0",
                                                                isActive 
                                                                    ? "bg-[#5b8370] text-white shadow-md border-2 border-transparent" 
                                                                    : "bg-white/50 dark:bg-white/10 text-muted-foreground border-2 border-slate-200 dark:border-white/10 hover:bg-white"
                                                            )}
                                                        >
                                                            <Star className={cn("w-4 h-4 md:w-5 md:h-5 mb-0.5", isActive ? "fill-white" : "")} />
                                                            <span className="text-[10px] font-bold">{num}</span>
                                                        </motion.button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {currentStep.ui_type === 'free_text' && (
                                            <div className="relative group">
                                                <Textarea 
                                                    placeholder={t('mission.write_answer', "Write your detailed answer here...")} 
                                                    value={stepAnswers[currentStepIndex] || ''}
                                                    onChange={(e) => handleAnswerUpdate(e.target.value)}
                                                    className="relative min-h-[120px] text-sm p-4 rounded-xl bg-white/50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 focus-visible:border-[#5b8370] focus-visible:ring-[#5b8370]/20 shadow-inner resize-none font-medium"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* CONTENEDOR DE ACCIONES (BOTTOM - COMPACTO Y CON BOTONES JUNTOS) */}
                            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between items-center border-t border-slate-200 dark:border-white/10 pt-4 gap-3">
                                <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
                                    <Button variant="ghost" onClick={goBack} className="text-muted-foreground hover:text-foreground font-semibold px-3 h-10 border border-slate-200 dark:border-white/10 bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 flex-1 sm:flex-none">
                                        <ArrowLeft className="w-4 h-4 mr-1.5" /> {t('common.back')}
                                    </Button>

                                    {/* BOTÓN DE REINICIAR LA MISIÓN QUE ABRE EL MODAL */}
                                    <Button variant="ghost" onClick={handleRestartClick} className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-semibold px-3 h-10 border border-slate-200 dark:border-white/10 bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex-1 sm:flex-none">
                                        <RefreshCw className="w-4 h-4 mr-1.5" /> {t('common.restart', 'Restart')}
                                    </Button>
                                    
                                    {mission.allow_skip && !result && (
                                        <Button variant="outline" onClick={handleSkipMission} className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold h-10 px-3 rounded-md flex-1 sm:flex-none">
                                            {t('mission.skip_mission', 'Skip')} <SkipForward className="w-3 h-3 ml-1.5"/>
                                        </Button>
                                    )}
                                </div>
                                
                                <Button 
                                    size="default" 
                                    onClick={handleNextStep} 
                                    disabled={submitting}
                                    className="w-full sm:w-auto px-8 h-10 text-sm font-bold rounded-lg bg-[#063127] hover:bg-[#5b8370] text-white shadow-md transition-all active:scale-95"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                                        <span className="flex items-center">
                                            {isLastStep ? t('mission.complete_btn', 'Complete') : t('mission.next_btn', 'Next')} 
                                            {isLastStep ? <Trophy className="ml-2 w-4 h-4"/> : <ArrowRight className="ml-2 w-4 h-4"/>}
                                        </span>
                                    )}
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* --- PANTALLA 3: RESULTADOS --- */}
            {result && (
                <motion.div key="result" initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4 }} className="w-full">
                    <Card className="border border-white/20 shadow-2xl overflow-hidden rounded-3xl text-center bg-card/90 backdrop-blur-xl relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#5b8370]/5 to-transparent pointer-events-none" />
                        
                        <CardContent className="p-8 md:p-12 relative z-10 flex flex-col items-center">
                            {result === 'success' && (
                                <div className="space-y-5 w-full">
                                    <motion.div 
                                        initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className="w-20 h-20 bg-gradient-to-br from-[#c4d1c0] to-[#5b8370] rounded-xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-md border-2 border-white dark:border-slate-800"
                                    >
                                        <Trophy className="w-10 h-10 text-[#063127] -rotate-12" />
                                    </motion.div>
                                    <h2 className="text-2xl md:text-4xl font-black text-[#063127] dark:text-white tracking-tight break-words">{t('mission.accomplished_title', 'Mission Accomplished!')}</h2>
                                    <p className="text-sm md:text-base text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed break-words">
                                        {mission.successMessage || t('mission.success_default', 'You have successfully completed this quest.')}
                                    </p>
                                    
                                    <div className="flex flex-col items-center justify-center gap-3 pt-6">
                                         <div className="flex justify-center gap-3 flex-wrap">
                                            <div className="px-4 py-2 text-sm font-bold bg-[#5b8370]/10 text-[#063127] dark:text-[#c4d1c0] border border-[#5b8370]/20 rounded-lg shadow-sm flex items-center">
                                                <Zap className="w-4 h-4 mr-1.5 fill-[#5b8370] text-[#5b8370]"/> +{earnedCredits} {t('rewards.bonus_points_short', 'BP')}
                                            </div>
                                            {mission.reputation_reward > 0 && (
                                                <div className="px-4 py-2 text-sm font-bold bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20 rounded-lg shadow-sm flex items-center">
                                                    <Shield className="w-4 h-4 mr-1.5 fill-blue-500 text-blue-500"/> +{mission.reputation_reward} {t('rewards.reputation', 'Rep')}
                                                </div>
                                            )}
                                            {mission.referrer_reward > 0 && (
                                                <div className="px-4 py-2 text-sm font-bold bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/20 rounded-lg shadow-sm flex items-center">
                                                    <Users className="w-4 h-4 mr-1.5 fill-purple-500 text-purple-500"/> +{mission.referrer_reward} {t('rewards.referral_bonus', 'Referrer')}
                                                </div>
                                            )}
                                         </div>
                                         
                                         {accumulatedPenalty > 0 && (
                                             <p className="text-xs text-red-500 font-semibold mt-1 text-center w-full bg-red-50 dark:bg-red-900/10 py-1.5 rounded-md border border-red-100 max-w-sm">
                                                {t('mission.penalty_applied_credits', { amount: accumulatedPenalty, defaultValue: `Penalty applied: -${accumulatedPenalty} BP.` })}
                                             </p>
                                         )}
                                    </div>
                                </div>
                            )}

                            {result === 'pending_review' && (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-[#063127]/10 border border-[#063127]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield className="w-8 h-8 text-[#063127] dark:text-[#c4d1c0]" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-[#063127] dark:text-white tracking-tight">{t('mission.under_review_title', 'Under Review')}</h2>
                                    <p className="text-sm md:text-base text-muted-foreground font-medium max-w-xl mx-auto">
                                        {t('mission.under_review_desc', 'Your answers have been submitted. An Admin will review your answers shortly.')}
                                    </p>
                                </div>
                            )}

                            {result === 'already_completed' && (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-[#5b8370]/10 border border-[#5b8370]/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <CheckCircle2 className="w-8 h-8 text-[#5b8370]" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-[#063127] dark:text-white tracking-tight">{t('mission.already_completed_title', 'Already Completed')}</h2>
                                    <p className="text-sm md:text-base text-muted-foreground font-medium max-w-xl mx-auto">{t('mission.already_completed_desc', 'You have already earned the rewards for this mission.')}</p>
                                </div>
                            )}

                            {result === 'skipped' && (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <SkipForward className="w-8 h-8 text-muted-foreground opacity-50" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-[#063127] dark:text-white tracking-tight">{t('mission.skipped_title', 'Mission Skipped')}</h2>
                                    <p className="text-sm md:text-base text-muted-foreground font-medium max-w-xl mx-auto">{t('mission.penalty_applied', { penalty: mission.skip_penalty })}</p>
                                </div>
                            )}

                            <div className="mt-8 w-full flex justify-center">
                                <Button size="lg" onClick={goBack} className="w-full sm:w-auto px-10 bg-[#063127] hover:bg-[#5b8370] text-white h-12 rounded-xl font-bold shadow-md">
                                    {t('mission.return_btn', 'Return to Quests')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>

        {/* MODAL WEB DE REINICIO */}
        <Dialog open={isRestartModalOpen} onOpenChange={setIsRestartModalOpen}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#063127] dark:text-white flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-amber-500" />
                        {t('mission.restart_title', 'Restart Mission')}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground pt-2 text-base">
                        {t('mission.restart_confirm', 'Are you sure you want to restart this mission?')}
                        <br/><br/>
                        <span className="font-semibold text-amber-600 dark:text-amber-500">
                            {t('mission.restart_warning', 'All your current progress will be lost.')}
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
                    <Button variant="outline" onClick={() => setIsRestartModalOpen(false)} className="rounded-xl border-slate-300 dark:border-white/10 font-semibold">
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={confirmRestart} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md font-bold">
                        {t('common.restart', 'Restart')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default MissionPlayer;