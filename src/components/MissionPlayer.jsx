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
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Trophy, Lightbulb, Zap, Check, SkipForward, Star, Shield, ExternalLink, Sparkles, Leaf, Instagram, Youtube, Info, PlayCircle } from 'lucide-react';
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
            <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.2)] mb-10 border border-white/10 bg-black">
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
            className="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.2)] mb-10 border border-white/10 bg-black cursor-pointer group"
            onClick={() => setIsPlaying(true)}
        >
            <img 
                src={thumbUrl} 
                onError={(e) => { e.target.src = fallbackThumb; }}
                alt="Video Preview" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" 
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex flex-col justify-between p-4 md:p-6">
                <div />
                <div className="flex justify-center transform group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-20 h-20 md:w-24 md:h-24 text-white opacity-90 drop-shadow-lg" strokeWidth={1} />
                </div>
                <div className="flex justify-between items-end w-full">
                    <div className="flex items-center gap-2 text-white/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10">
                        <Info className="w-4 h-4" />
                        <span>{t('mission.privacy_note', 'Privacy Note')}</span>
                    </div>
                    <Youtube className="w-10 h-10 text-white opacity-90 drop-shadow-md" strokeWidth={1.5} />
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
        <div className="space-y-6 bg-card/60 backdrop-blur-xl p-6 lg:p-8 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#5b8370]/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="flex justify-between items-center mb-6 relative z-10">
                <span className="font-bold text-foreground text-lg flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-[#5b8370]" />
                    {t('mission.distribute_resources', 'Distribute Resources')}
                </span>
                <Badge variant={remaining === 0 ? 'default' : 'secondary'} className={cn("px-4 py-1.5 shadow-md font-bold text-sm", remaining === 0 && 'bg-[#5b8370] text-white shadow-[0_0_20px_rgba(91,131,112,0.5)]')}>
                    {remaining}% {t('mission.remaining', 'Remaining')}
                </Badge>
            </div>
            <div className="space-y-8 relative z-10">
                {poles.map((pole, idx) => (
                    <div key={idx} className="space-y-3">
                        <div className="flex justify-between text-sm font-bold text-muted-foreground">
                            <span className="uppercase tracking-widest text-xs">{pole}</span>
                            <span className="text-[#5b8370] font-black text-lg">{values[pole] || 0}%</span>
                        </div>
                        <div className="relative">
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={values[pole] || 0} 
                                onChange={(e) => handleSliderChange(pole, parseInt(e.target.value))}
                                className="w-full h-4 bg-muted/50 rounded-full appearance-none cursor-pointer accent-[#5b8370] hover:accent-[#063127] transition-all shadow-inner border border-white/5"
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

  // ESTADOS DE PENALIZACIÓN
  const [accumulatedPenalty, setAccumulatedPenalty] = useState(0);
  const [penalizedSteps, setPenalizedSteps] = useState(new Set()); 
  const [earnedCredits, setEarnedCredits] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const goBack = useCallback(() => {
      const basePath = location.pathname.includes('/startnext') ? '/startnext/quests' : '/dashboard/quests';
      navigate(basePath);
  }, [location.pathname, navigate]);

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

      const initialAnswers = {};
      parsedSteps.forEach((step, idx) => {
          if (step.ui_type === 'multiple_choice') initialAnswers[idx] = [];
          else if (step.ui_type === 'circular_slider') initialAnswers[idx] = {};
          else initialAnswers[idx] = '';
      });
      setStepAnswers(initialAnswers);

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
              
              // LÓGICA HÍBRIDA DE PENALIZACIÓN (Específica o Global)
              if (!penalizedSteps.has(currentStepIndex)) {
                  let penaltyAmount = 0;

                  // 1. Intentar cobrar penalización específica del paso
                  if (currentStep.apply_penalty && currentStep.penalty_value > 0) {
                      if (currentStep.penalty_type === 'percentage') {
                          penaltyAmount = Math.round((mission.impact_credit_reward * currentStep.penalty_value) / 100);
                      } else {
                          penaltyAmount = currentStep.penalty_value;
                      }
                  } 
                  // 2. Si el paso no tiene, intentar cobrar la penalización global de la misión
                  else if (mission.global_penalty_percentage > 0) {
                      penaltyAmount = Math.round((mission.impact_credit_reward * mission.global_penalty_percentage) / 100);
                  }

                  if (penaltyAmount > 0) {
                      // Acumulamos en la bolsa y marcamos la pregunta
                      setAccumulatedPenalty(prev => prev + penaltyAmount);
                      setPenalizedSteps(prev => new Set(prev).add(currentStepIndex));
                      
                      toast({ 
                          variant: "destructive", 
                          title: t('mission.incorrect_title', "Incorrect Answer"), 
                          description: t('mission.penalty_applied_credits', { amount: penaltyAmount, defaultValue: `Penalty applied: -${penaltyAmount} BP.` }) 
                      });
                  } else {
                      // Si no hay ninguna penalidad en absoluto, mostramos error simple
                      toast({ 
                          variant: "destructive", 
                          title: t('mission.incorrect_title', "Incorrect"), 
                          description: t('mission.review_answer', "Review your answer and try again.") 
                      });
                  }
              } else {
                  // Si ya había sido penalizado por esta pregunta en este intento, no le volvemos a cobrar
                  toast({ 
                      variant: "destructive", 
                      title: t('mission.incorrect_title', "Incorrect"), 
                      description: t('mission.review_answer', "Review your answer and try again.") 
                  });
              }

              // Si falla la respuesta y hay enlace de ayuda, redirigimos
              if (currentStep.on_fail_redirect) {
                  toast({ 
                      variant: "destructive", 
                      title: t('mission.incorrect_title', "Incorrect Answer"), 
                      description: t('mission.redirect_msg', "You will be redirected to review the materials.") 
                  });
                  setTimeout(() => window.open(currentStep.on_fail_redirect, '_blank'), 1500);
              }
              
              return false; // Detiene el avance al siguiente paso
          }
      }

      return true;
  };

  const handleNextStep = async () => {
      const isValid = await validateCurrentStep();
      if (!isValid) return; // Si fue incorrecta, no avanza.
      
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

        // CÁLCULO FINAL DE LA RECOMPENSA (Restando TODAS las penalizaciones acumuladas)
        const calculatedFinalReward = Math.max(0, mission.impact_credit_reward - accumulatedPenalty);
        setEarnedCredits(calculatedFinalReward);

        // Guardar la respuesta descontada en la base de datos
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
            // 1. PAGO AL USUARIO QUE REALIZA LA MISIÓN (Solo entrega lo que sobró tras errores)
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

            // 2. SISTEMA MLM: PAGO AUTOMÁTICO AL REFERIDOR
            if (mission.referrer_reward > 0) {
                try {
                    const { data: profileData } = await supabase.from('profiles').select('referrer_id').eq('id', user.id).single();
                    
                    if (profileData?.referrer_id) {
                        // Dar puntos al padrino (referidor)
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
                        // Notificarle
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
                className="relative flex flex-col items-center justify-center w-full aspect-[21/9] md:aspect-[3/1] rounded-[2rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.2)] mb-10 border border-white/10 group cursor-pointer bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
                title={t('mission.view_instagram', 'View on Instagram')}
              >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                  <div className="relative z-10 flex flex-col items-center transform group-hover:scale-110 transition-transform duration-500">
                      <Instagram className="w-12 h-12 md:w-16 md:h-16 text-white mb-4 drop-shadow-lg" />
                      <span className="text-white font-bold text-sm md:text-lg bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 md:w-5 md:h-5" /> {t('mission.open_instagram', 'Open in Instagram')}
                      </span>
                  </div>
              </a>
          );
      }
      
      return (
        <div className="relative w-full rounded-[2rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.15)] mb-10 border border-white/5 bg-black/20 flex items-center justify-center">
            <img 
                src={url} 
                alt="Media content" 
                className="w-full h-auto max-h-[500px] object-contain" 
                onError={(e) => { e.target.style.display = 'none'; }}
            />
        </div>
      );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="w-12 h-12 animate-spin text-[#5b8370]"/></div>;
  if (!mission) return <div className="text-center p-20 text-muted-foreground">{t('quest.not_found', "Mission not found")}</div>;

  return (
    <div className="w-full flex flex-col items-center relative min-h-screen font-sans pb-20">
      
      <LeafBackground />
      
      {result === 'success' && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={800} gravity={0.15} style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }} />}

      <div className="w-full max-w-4xl relative z-10 px-4 pt-8 md:pt-12">
        
        {/* BOTONES SUPERIORES */}
        <div className="flex justify-between items-center mb-10">
            <Button variant="ghost" onClick={goBack} className="text-foreground/80 hover:text-foreground font-bold hover:bg-white/10 backdrop-blur-sm rounded-full px-6 transition-all border border-transparent hover:border-white/20">
                <ArrowLeft className="w-5 h-5 mr-2" /> {t('common.back')}
            </Button>
            
            {mission.allow_skip && currentStepIndex >= 0 && !result && (
                <Button variant="outline" onClick={handleSkipMission} className="border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold shadow-sm rounded-full backdrop-blur-sm px-6">
                    {t('mission.skip_mission', 'Skip Mission')} (-{mission.skip_penalty} Rep) <SkipForward className="w-3 h-3 ml-2"/>
                </Button>
            )}
        </div>

        <AnimatePresence mode="wait">
            
            {/* --- PANTALLA 1: INTRODUCCIÓN DE LA MISIÓN --- */}
            {currentStepIndex === -1 && !result && (
                <motion.div key="intro" initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                    <Card className="shadow-2xl border border-white/10 overflow-hidden bg-card/80 backdrop-blur-2xl rounded-[2.5rem]">
                        {mission.image_url && (
                            <div className="w-full h-72 md:h-96 relative overflow-hidden bg-slate-950 group">
                                <img src={mission.image_url} alt="Cover" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                            </div>
                        )}
                        <CardContent className={`pt-10 px-6 md:px-16 text-center ${!mission.image_url ? 'pt-16' : ''}`}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <Badge className="mb-6 bg-[#5b8370]/20 text-[#5b8370] hover:bg-[#5b8370]/30 border border-[#5b8370]/30 uppercase tracking-[0.2em] px-5 py-2 shadow-sm font-black rounded-full">
                                    <Sparkles className="w-4 h-4 mr-2 inline-block -mt-0.5"/>
                                    {mission.skill_category}
                                </Badge>
                                <h1 className="text-4xl md:text-6xl font-black text-[#063127] dark:text-white mb-4 tracking-tight drop-shadow-lg break-words leading-tight">
                                    {mission.displayTitle}
                                </h1>
                                {mission.displaySubtitle && (
                                    <p className="text-xl md:text-2xl text-[#063127] dark:text-[#c4d1c0] font-medium mb-10 break-words whitespace-pre-wrap">
                                        {mission.displaySubtitle}
                                    </p>
                                )}
                            </motion.div>
                            
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/50 dark:bg-black/20 p-8 md:p-10 rounded-3xl text-lg text-foreground/90 leading-relaxed mb-10 border border-white/10 shadow-inner break-words whitespace-pre-wrap text-left md:text-center backdrop-blur-sm">
                                {mission.displayDescription}
                            </motion.div>

                            {mission.displayExtraInfo && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-start gap-4 p-6 bg-[#c4d1c0]/20 text-[#063127] dark:text-[#c4d1c0] rounded-3xl text-left mb-12 border border-[#5b8370]/30 shadow-sm backdrop-blur-md">
                                    <Lightbulb className="w-6 h-6 flex-shrink-0 mt-0.5 animate-pulse" />
                                    <p className="text-sm md:text-base font-medium leading-relaxed break-words">{mission.displayExtraInfo}</p>
                                </motion.div>
                            )}

                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12">
                                <div className="flex items-center gap-4 bg-gradient-to-r from-[#5b8370]/10 to-[#5b8370]/20 border border-[#5b8370]/30 px-8 py-5 rounded-[2rem] shadow-sm transform hover:-translate-y-1 transition-all w-full sm:w-auto backdrop-blur-md">
                                    <div className="bg-gradient-to-br from-[#5b8370] to-[#063127] p-3 rounded-2xl shadow-lg"><Zap className="w-6 h-6 text-[#c4d1c0]" /></div>
                                    <div className="text-left">
                                        <p className="text-xs uppercase tracking-wider font-bold text-[#063127] dark:text-[#c4d1c0]/70">{t('rewards.bonus_points', 'Bonos')}</p>
                                        <p className="font-black text-3xl text-[#5b8370] dark:text-white">+{mission.impact_credit_reward}</p>
                                    </div>
                                </div>
                                {mission.reputation_reward > 0 && (
                                    <div className="flex items-center gap-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/20 border border-blue-500/30 px-8 py-5 rounded-[2rem] shadow-sm transform hover:-translate-y-1 transition-all w-full sm:w-auto backdrop-blur-md">
                                        <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-2xl shadow-lg"><Shield className="w-6 h-6 text-white" /></div>
                                        <div className="text-left">
                                            <p className="text-xs uppercase tracking-wider font-bold text-blue-700 dark:text-blue-400/70">{t('rewards.reputation', 'Reputation')}</p>
                                            <p className="font-black text-3xl text-blue-800 dark:text-blue-300">+{mission.reputation_reward}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                                <Button size="lg" onClick={() => setCurrentStepIndex(0)} className="w-full md:w-3/4 h-16 md:h-20 text-xl md:text-2xl font-black rounded-full bg-gradient-to-r from-[#063127] to-[#5b8370] hover:brightness-110 text-white shadow-lg group transition-all hover:scale-[1.02] active:scale-95 border-none">
                                    {t('mission.start_btn', 'Start Mission')} <ArrowRight className="ml-4 w-7 h-7 group-hover:translate-x-2 transition-transform"/>
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
                    initial={{ opacity: 0, x: 50 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 25 }}
                    className="w-full"
                >
                    {/* Progress Bar Top */}
                    <div className="mb-10 px-4">
                        <div className="flex justify-between text-sm font-black text-muted-foreground mb-3 uppercase tracking-[0.2em]">
                            <span>{t('mission.step_x_of_y', { current: currentStepIndex + 1, total: mission.parsedSteps.length })}</span>
                            <span className="text-[#5b8370]">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="relative h-4 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/10">
                            <motion.div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#063127] to-[#5b8370] shadow-[0_0_20px_rgba(91,131,112,0.8)]"
                                initial={{ width: `${currentStepIndex === 0 ? 0 : ((currentStepIndex) / mission.parsedSteps.length) * 100}%` }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.6, ease: "easeInOut" }}
                            />
                        </div>
                    </div>

                    <Card className="shadow-2xl border border-white/10 bg-card/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden relative">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#5b8370]/50 to-transparent" />

                        <CardContent className="p-8 md:p-12 lg:p-16 relative z-10">
                            
                            {renderMedia(currentStep.media_url)}

                            <h2 className="text-3xl md:text-5xl font-black text-[#063127] dark:text-white mb-8 leading-tight tracking-tight drop-shadow-sm break-words">
                                {currentStep.title}
                            </h2>
                            
                            {currentStep.content && (
                                <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed mb-12 break-words whitespace-pre-wrap font-medium">
                                    {currentStep.content}
                                </p>
                            )}

                            {currentStep.type === 'question' && (
                                <div className="mt-10">
                                    {(currentStep.ui_type === 'single_choice' || currentStep.ui_type === 'multiple_choice') && (
                                        <div className="grid gap-5">
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
                                                            "flex items-center p-6 md:p-8 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 group overflow-hidden relative",
                                                            isSelected 
                                                                ? "border-[#5b8370] bg-[#5b8370]/10 shadow-md" 
                                                                : "border-slate-200 dark:border-white/10 bg-white/5 hover:border-[#5b8370]/50 hover:bg-[#5b8370]/5"
                                                        )}
                                                    >
                                                        {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-[#5b8370]/10 to-transparent pointer-events-none" />}

                                                        <div className={cn(
                                                            "w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center mr-6 transition-all shadow-lg flex-shrink-0 relative z-10",
                                                            isSelected ? "border-[#5b8370] bg-[#5b8370] text-white shadow-[0_0_15px_rgba(91,131,112,0.5)]" : "border-slate-300 dark:border-white/20 text-muted-foreground group-hover:border-[#5b8370] group-hover:text-[#5b8370]"
                                                        )}>
                                                            {isSelected ? <Check className="w-6 h-6 md:w-7 md:h-7" /> : <span className="font-bold text-lg">{letter}</span>}
                                                        </div>
                                                        <span className={cn(
                                                            "text-lg md:text-xl font-bold transition-colors break-words relative z-10", 
                                                            isSelected ? "text-[#063127] dark:text-white drop-shadow-sm" : "text-muted-foreground group-hover:text-[#063127] dark:group-hover:text-white"
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
                                        <div className="flex justify-center gap-4 md:gap-8 py-12 bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-white/10 shadow-inner">
                                            {[1,2,3,4,5].map(num => {
                                                const isActive = stepAnswers[currentStepIndex] >= num;
                                                return (
                                                    <motion.button 
                                                        whileHover={{ scale: 1.15, y: -5 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        key={num} 
                                                        onClick={() => handleAnswerUpdate(num)}
                                                        className={cn(
                                                            "w-16 h-16 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center transition-all flex-shrink-0 relative",
                                                            isActive 
                                                                ? "bg-gradient-to-b from-[#5b8370] to-[#063127] text-white shadow-lg border-2 border-white/50" 
                                                                : "bg-white/50 dark:bg-white/10 text-muted-foreground border-2 border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/20"
                                                        )}
                                                    >
                                                        <Star className={cn("w-7 h-7 md:w-10 md:h-10 mb-1", isActive ? "fill-white" : "")} />
                                                        <span className="text-sm font-black">{num}</span>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {currentStep.ui_type === 'free_text' && (
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-[#063127] to-[#5b8370] rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-30 transition duration-500" />
                                            <Textarea 
                                                placeholder={t('mission.write_answer', "Write your detailed answer here...")} 
                                                value={stepAnswers[currentStepIndex] || ''}
                                                onChange={(e) => handleAnswerUpdate(e.target.value)}
                                                className="relative min-h-[300px] text-xl p-8 md:p-10 rounded-[2.5rem] bg-white/50 dark:bg-black/40 border-2 border-slate-200 dark:border-white/10 focus-visible:border-[#5b8370] focus-visible:ring-[#5b8370]/20 shadow-inner backdrop-blur-md resize-none font-medium leading-relaxed"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-16 flex justify-end border-t border-slate-200 dark:border-white/10 pt-10">
                                <Button 
                                    size="lg" 
                                    onClick={handleNextStep} 
                                    disabled={submitting}
                                    className="w-full md:w-auto px-16 h-[4.5rem] text-xl font-black rounded-full bg-[#063127] hover:bg-[#5b8370] text-white shadow-lg transition-all hover:-translate-y-1 active:translate-y-0"
                                >
                                    {submitting ? <Loader2 className="w-8 h-8 animate-spin"/> : (
                                        <span className="flex items-center">
                                            {isLastStep ? t('mission.complete_btn', 'Complete Mission') : t('mission.next_btn', 'Next Step')} 
                                            {isLastStep ? <Trophy className="ml-4 w-6 h-6"/> : <ArrowRight className="ml-4 w-7 h-7"/>}
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
                <motion.div key="result" initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.5 }} className="w-full">
                    <Card className="border border-white/20 shadow-2xl overflow-hidden rounded-[3rem] text-center bg-card/90 backdrop-blur-2xl relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#5b8370]/10 to-transparent pointer-events-none" />
                        
                        <CardContent className="p-12 md:p-24 relative z-10">
                            {result === 'success' && (
                                <div className="space-y-10">
                                    <motion.div 
                                        initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className="w-40 h-40 bg-gradient-to-br from-[#c4d1c0] to-[#5b8370] rounded-[3rem] rotate-12 flex items-center justify-center mx-auto mb-10 shadow-lg border-4 border-white dark:border-slate-800"
                                    >
                                        <Trophy className="w-20 h-20 text-[#063127] -rotate-12 drop-shadow-md" />
                                    </motion.div>
                                    <h2 className="text-5xl md:text-7xl font-black text-[#063127] dark:text-white tracking-tight break-words drop-shadow-md">{t('mission.accomplished_title', 'Mission Accomplished!')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed break-words">
                                        {mission.successMessage || t('mission.success_default', 'You have successfully completed this quest and earned your rewards.')}
                                    </p>
                                    
                                    <div className="flex flex-col items-center justify-center gap-6 pt-10">
                                         <div className="flex justify-center gap-6 flex-wrap">
                                            <div className="px-8 py-4 text-2xl font-black bg-[#5b8370]/10 text-[#063127] dark:text-[#c4d1c0] border border-[#5b8370]/30 rounded-2xl shadow-sm flex items-center">
                                                <Zap className="w-8 h-8 mr-3 fill-[#5b8370] text-[#5b8370]"/> +{earnedCredits} {t('rewards.bonus_points', 'BP')}
                                            </div>
                                            {mission.reputation_reward > 0 && (
                                                <div className="px-8 py-4 text-2xl font-black bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30 rounded-2xl shadow-sm flex items-center">
                                                    <Shield className="w-8 h-8 mr-3 fill-blue-500 text-blue-500"/> +{mission.reputation_reward} {t('rewards.reputation', 'Rep')}
                                                </div>
                                            )}
                                         </div>
                                         
                                         {accumulatedPenalty > 0 && (
                                             <p className="text-sm text-red-500 font-bold mt-2 text-center w-full bg-red-50 dark:bg-red-900/10 py-2 rounded-lg border border-red-100 dark:border-red-900/30 max-w-md">
                                                {t('mission.penalty_applied_credits', { amount: accumulatedPenalty, defaultValue: `Penalización aplicada: -${accumulatedPenalty} BP.` })}
                                             </p>
                                         )}
                                    </div>
                                </div>
                            )}

                            {result === 'pending_review' && (
                                <div className="space-y-8">
                                    <div className="w-40 h-40 bg-[#063127]/10 border border-[#063127]/20 rounded-full flex items-center justify-center mx-auto mb-10">
                                        <Shield className="w-20 h-20 text-[#063127] dark:text-[#c4d1c0]" />
                                    </div>
                                    <h2 className="text-5xl font-black text-[#063127] dark:text-white tracking-tight break-words">{t('mission.under_review_title', 'Under Review')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed break-words">
                                        {t('mission.under_review_desc', 'Your answers have been submitted. An Admin will review your answers shortly.')}
                                    </p>
                                </div>
                            )}

                            {result === 'already_completed' && (
                                <div className="space-y-8">
                                    <div className="w-40 h-40 bg-[#5b8370]/10 border border-[#5b8370]/30 rounded-full flex items-center justify-center mx-auto mb-10 shadow-sm">
                                        <CheckCircle2 className="w-20 h-20 text-[#5b8370]" />
                                    </div>
                                    <h2 className="text-5xl font-black text-[#063127] dark:text-white tracking-tight break-words">{t('mission.already_completed_title', 'Already Completed')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto break-words">{t('mission.already_completed_desc', 'You have already earned the rewards for this mission.')}</p>
                                </div>
                            )}

                            {result === 'skipped' && (
                                <div className="space-y-8">
                                    <div className="w-40 h-40 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center mx-auto mb-10">
                                        <SkipForward className="w-20 h-20 text-muted-foreground opacity-50" />
                                    </div>
                                    <h2 className="text-5xl font-black text-[#063127] dark:text-white tracking-tight break-words">{t('mission.skipped_title', 'Mission Skipped')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto break-words">{t('mission.penalty_applied', { penalty: mission.skip_penalty })}</p>
                                </div>
                            )}

                            <div className="mt-20">
                                <Button size="lg" onClick={goBack} className="w-full md:w-auto min-w-[350px] bg-[#063127] hover:bg-[#5b8370] text-[#c4d1c0] hover:text-white rounded-full h-[4.5rem] text-2xl font-black shadow-lg hover:scale-105 transition-all">
                                    {t('mission.return_btn', 'Return to Quests')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MissionPlayer;