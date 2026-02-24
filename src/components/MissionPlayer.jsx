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
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Trophy, Lightbulb, Zap, Check, SkipForward, Star, Shield, Play, ExternalLink, Sparkles, Leaf, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { useTranslation } from 'react-i18next';
import { executeGamificationAction } from '@/utils/gamificationEngine';
import { cn } from '@/lib/utils';
import LeafBackground from '@/components/ui/LeafBackground';

// --- SUBCOMPONENTE REDISEÑADO: DISTRIBUIDOR MULTI-POLAR ---
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
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="flex justify-between items-center mb-6 relative z-10">
                <span className="font-bold text-foreground text-lg flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-500" />
                    {t('mission.distribute_resources', 'Distribute Resources')}
                </span>
                <Badge variant={remaining === 0 ? 'default' : 'secondary'} className={cn("px-4 py-1.5 shadow-md font-bold text-sm", remaining === 0 && 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]')}>
                    {remaining}% {t('mission.remaining', 'Remaining')}
                </Badge>
            </div>
            <div className="space-y-8 relative z-10">
                {poles.map((pole, idx) => (
                    <div key={idx} className="space-y-3">
                        <div className="flex justify-between text-sm font-bold text-muted-foreground">
                            <span className="uppercase tracking-widest text-xs">{pole}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-lg">{values[pole] || 0}%</span>
                        </div>
                        <div className="relative">
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={values[pole] || 0} 
                                onChange={(e) => handleSliderChange(pole, parseInt(e.target.value))}
                                className="w-full h-4 bg-muted/50 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all shadow-inner border border-white/5"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL: MISSION PLAYER MULTI-STEP ---
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
        .select(`*, genesis_mission_translations!genesis_mission_translations_genesis_mission_id_fkey(language_code, title, subtitle, description, extra_info, success_message, response_options, steps_translation)`) 
        .eq('id', id)
        .single();
      
      if (error) throw error;

      const { data: existing } = await supabase.from('user_quest_responses')
        .select('id, review_status')
        .eq('user_id', user.id).eq('mission_id', id)
        .in('review_status', ['auto_approved', 'approved', 'pending'])
        .maybeSingle();

      if (existing) setResult('already_completed');

      const lang = i18n.language ? i18n.language.split('-')[0] : 'en';
      const translation = data.genesis_mission_translations?.find(t => t.language_code === lang) 
                       || data.genesis_mission_translations?.find(t => t.language_code === 'en');
      
      let parsedSteps = [];
      if (Array.isArray(data.steps)) parsedSteps = data.steps;
      else if (typeof data.steps === 'string') {
          try { parsedSteps = JSON.parse(data.steps); } catch(e) { parsedSteps = []; }
      }

      let parsedStepsTrans = [];
      if (translation?.steps_translation) {
           if (typeof translation.steps_translation === 'string') {
               try { parsedStepsTrans = JSON.parse(translation.steps_translation); } catch(e) {}
           } else if (Array.isArray(translation.steps_translation)) {
               parsedStepsTrans = translation.steps_translation;
           }
      }

      if (parsedSteps.length > 0) {
          parsedSteps = parsedSteps.map((step, idx) => {
              const transStep = parsedStepsTrans[idx] || {};
              return {
                  ...step,
                  title: transStep.title || step.title,
                  content: transStep.content || step.content,
                  options: (transStep.options && transStep.options.length > 0 && transStep.options.some(o => o)) 
                           ? step.options.map((o, i) => transStep.options[i] || o) 
                           : step.options,
                  poles: (transStep.poles && transStep.poles.length > 0 && transStep.poles.some(p => p))
                         ? step.poles.map((p, i) => transStep.poles[i] || p)
                         : step.poles
              };
          });
      }

      const processedMission = {
          ...data,
          displayTitle: translation?.title || data.title,
          displaySubtitle: translation?.subtitle || data.subtitle || null,
          displayDescription: translation?.description || data.description,
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
      console.error(error);
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

  const validateCurrentStep = () => {
      if (!currentStep) return true;
      if (currentStep.type === 'content') return true;
      
      const answer = stepAnswers[currentStepIndex];
      
      if (currentStep.is_required) {
          if (currentStep.ui_type === 'multiple_choice' && answer.length === 0) return false;
          if (currentStep.ui_type === 'circular_slider') {
              const total = Object.values(answer || {}).reduce((a,b)=>a+b, 0);
              if (total !== 100) return false;
          }
          if (typeof answer === 'string' && !answer.trim() && currentStep.ui_type !== 'circular_slider') return false;
      }

      if (currentStep.correct_answer !== undefined && currentStep.correct_answer !== null && currentStep.correct_answer !== '') {
          if (String(answer) !== String(currentStep.correct_answer)) {
              if (currentStep.on_fail_redirect) {
                  toast({ variant: "destructive", title: t('mission.incorrect_title', "Incorrect Answer"), description: t('mission.redirect_msg', "You will be redirected to review the materials.") });
                  setTimeout(() => window.open(currentStep.on_fail_redirect, '_blank'), 1500);
                  return false;
              }
              toast({ variant: "destructive", title: t('mission.incorrect_title', "Incorrect"), description: t('mission.review_answer', "Review your answer and try again.") });
              return false;
          }
      }

      return true;
  };

  const handleNextStep = () => {
      if (!validateCurrentStep()) return;
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
        const needsReview = mission.parsedSteps.some(s => s.ui_type === 'free_text');
        const finalStatus = needsReview ? 'pending' : 'auto_approved';

        const { error: dbError } = await supabase.from('user_quest_responses').insert({
            user_id: user.id,
            mission_id: mission.id,
            response_data: stepAnswers,
            is_correct: !needsReview, 
            review_status: finalStatus,
            credits_awarded: needsReview ? 0 : mission.impact_credit_reward
        });

        if (dbError) throw dbError;

        if (!needsReview) {
            await executeGamificationAction(user.id, null, {
                dynamicAction: {
                    id: mission.id, 
                    action_name: `mission_${mission.id.slice(0,8)}`,
                    action_title: mission.displayTitle,
                    action_type: 'Mission Quest',
                    impact_credit_reward: mission.impact_credit_reward,
                    reputation_reward: mission.reputation_reward,
                    source_event: 'quest_completion'
                },
                notes: `Completed multi-step mission: ${mission.displayTitle}`,
                languageCode: i18n.language
            });
            setResult('success');
        } else {
            toast({ title: t('mission.submitted_title', "Mission Submitted!"), description: t('mission.review_msg', "A Guardian will review your answers shortly."), className: "bg-blue-50 border-blue-200 text-blue-900" });
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

  // --- RENDERIZADOR MAGICO DE CONTENIDO ---
  const renderMedia = (url) => {
      if (!url) return null;
      
      // 1. Verificamos si es un video de YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
          let videoId = '';
          if (url.includes('youtube.com/watch')) {
              videoId = url.split('v=')[1]?.split('&')[0];
          } else if (url.includes('youtu.be/')) {
              videoId = url.split('youtu.be/')[1]?.split('?')[0];
          }
          
          if (!videoId) return null;

          const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          
          return (
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="relative block aspect-video w-full rounded-[2rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.2)] mb-10 border border-white/10 group cursor-pointer"
                title="Ver Video en YouTube"
              >
                  <img src={thumbUrl} alt="Video Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center group-hover:bg-black/10 transition-colors duration-500">
                      <div className="w-20 h-20 bg-red-600/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] transform group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-white ml-1 fill-white" />
                      </div>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center shadow-lg border border-white/10">
                       <ExternalLink className="w-4 h-4 mr-2" /> Ver en YouTube
                  </div>
              </a>
          );
      }

      // 2. Verificamos si es un enlace de Instagram
      if (url.includes('instagram.com')) {
          return (
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="relative flex flex-col items-center justify-center w-full aspect-[21/9] rounded-[2rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.2)] mb-10 border border-white/10 group cursor-pointer bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
                title="Ver en Instagram"
              >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                  <div className="relative z-10 flex flex-col items-center transform group-hover:scale-110 transition-transform duration-500">
                      <Instagram className="w-16 h-16 text-white mb-4 drop-shadow-lg" />
                      <span className="text-white font-bold text-lg md:text-xl bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl flex items-center gap-2">
                          <ExternalLink className="w-5 h-5" /> Ir a Instagram
                      </span>
                  </div>
              </a>
          );
      }
      
      // 3. Si no es ni YouTube ni Instagram, asumimos que es una imagen estándar
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

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="w-12 h-12 animate-spin text-emerald-500"/></div>;
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
                                <Badge className="mb-6 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 uppercase tracking-[0.2em] px-5 py-2 shadow-sm font-black rounded-full">
                                    <Sparkles className="w-4 h-4 mr-2 inline-block -mt-0.5"/>
                                    {mission.skill_category}
                                </Badge>
                                <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4 tracking-tight drop-shadow-lg break-words leading-tight">
                                    {mission.displayTitle}
                                </h1>
                                {mission.displaySubtitle && (
                                    <p className="text-xl md:text-2xl text-emerald-700 dark:text-emerald-300/80 font-medium mb-10 break-words whitespace-pre-wrap">
                                        {mission.displaySubtitle}
                                    </p>
                                )}
                            </motion.div>
                            
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/50 dark:bg-black/20 p-8 md:p-10 rounded-3xl text-lg text-foreground/90 leading-relaxed mb-10 border border-white/10 shadow-inner break-words whitespace-pre-wrap text-left md:text-center backdrop-blur-sm">
                                {mission.displayDescription}
                            </motion.div>

                            {mission.displayExtraInfo && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-start gap-4 p-6 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-3xl text-left mb-12 border border-amber-500/20 shadow-sm backdrop-blur-md">
                                    <Lightbulb className="w-6 h-6 flex-shrink-0 mt-0.5 animate-pulse" />
                                    <p className="text-sm md:text-base font-medium leading-relaxed break-words">{mission.displayExtraInfo}</p>
                                </motion.div>
                            )}

                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12">
                                <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 px-8 py-5 rounded-[2rem] shadow-[0_0_30px_rgba(16,185,129,0.15)] transform hover:-translate-y-1 transition-all w-full sm:w-auto backdrop-blur-md">
                                    <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-3 rounded-2xl shadow-lg"><Zap className="w-6 h-6 text-white" /></div>
                                    <div className="text-left">
                                        <p className="text-xs uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400/70">{t('rewards.bonus_points', 'Bonos')}</p>
                                        <p className="font-black text-3xl text-emerald-800 dark:text-emerald-300">+{mission.impact_credit_reward}</p>
                                    </div>
                                </div>
                                {mission.reputation_reward > 0 && (
                                    <div className="flex items-center gap-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 px-8 py-5 rounded-[2rem] shadow-[0_0_30px_rgba(59,130,246,0.15)] transform hover:-translate-y-1 transition-all w-full sm:w-auto backdrop-blur-md">
                                        <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-2xl shadow-lg"><Shield className="w-6 h-6 text-white" /></div>
                                        <div className="text-left">
                                            <p className="text-xs uppercase tracking-wider font-bold text-blue-700 dark:text-blue-400/70">{t('rewards.reputation', 'Reputation')}</p>
                                            <p className="font-black text-3xl text-blue-800 dark:text-blue-300">+{mission.reputation_reward}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                                <Button size="lg" onClick={() => setCurrentStepIndex(0)} className="w-full md:w-3/4 h-16 md:h-20 text-xl md:text-2xl font-black rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-[0_10px_40px_rgba(16,185,129,0.4)] group transition-all hover:scale-[1.02] active:scale-95 border border-emerald-400/50">
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
                            <span className="text-emerald-500">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="relative h-4 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/10">
                            <motion.div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_20px_rgba(52,211,153,0.8)]"
                                initial={{ width: `${currentStepIndex === 0 ? 0 : ((currentStepIndex) / mission.parsedSteps.length) * 100}%` }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.6, ease: "easeInOut" }}
                            />
                        </div>
                    </div>

                    <Card className="shadow-2xl border border-white/10 bg-card/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden relative">
                        {/* Brillo decorativo superior */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                        <CardContent className="p-8 md:p-12 lg:p-16 relative z-10">
                            {renderMedia(currentStep.media_url)}

                            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-8 leading-tight tracking-tight drop-shadow-sm break-words">
                                {currentStep.title}
                            </h2>
                            
                            {currentStep.content && (
                                <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed mb-12 break-words whitespace-pre-wrap font-medium">
                                    {currentStep.content}
                                </p>
                            )}

                            {currentStep.type === 'question' && (
                                <div className="mt-10">
                                    {/* SINGLE & MULTIPLE CHOICE */}
                                    {(currentStep.ui_type === 'single_choice' || currentStep.ui_type === 'multiple_choice') && (
                                        <div className="grid gap-5">
                                            {(currentStep.options || []).map((opt, idx) => {
                                                const isMulti = currentStep.ui_type === 'multiple_choice';
                                                const currentAnswers = Array.isArray(stepAnswers[currentStepIndex]) ? stepAnswers[currentStepIndex] : [];
                                                const isSelected = isMulti ? currentAnswers.includes(String(idx)) : String(stepAnswers[currentStepIndex]) === String(idx);
                                                const letter = String.fromCharCode(65 + idx); // A, B, C...
                                                
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
                                                                ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]" 
                                                                : "border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />}

                                                        <div className={cn(
                                                            "w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center mr-6 transition-all shadow-lg flex-shrink-0 relative z-10",
                                                            isSelected ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "border-white/20 text-muted-foreground group-hover:border-emerald-400 group-hover:text-emerald-400"
                                                        )}>
                                                            {isSelected ? <Check className="w-6 h-6 md:w-7 md:h-7" /> : <span className="font-bold text-lg">{letter}</span>}
                                                        </div>
                                                        <span className={cn(
                                                            "text-lg md:text-xl font-bold transition-colors break-words relative z-10", 
                                                            isSelected ? "text-foreground drop-shadow-sm" : "text-muted-foreground group-hover:text-foreground"
                                                        )}>
                                                            {opt}
                                                        </span>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* SLIDER / POLOS */}
                                    {currentStep.ui_type === 'circular_slider' && (
                                        <ResourceAllocator poles={currentStep.poles || []} values={stepAnswers[currentStepIndex] || {}} onChange={handleAnswerUpdate} />
                                    )}

                                    {/* 1 TO 5 STARS */}
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
                                                                ? "bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_0_40px_rgba(251,191,36,0.6)] border-2 border-white/50" 
                                                                : "bg-white/10 text-muted-foreground border-2 border-white/10 hover:bg-white/20"
                                                        )}
                                                    >
                                                        <Star className={cn("w-7 h-7 md:w-10 md:h-10 mb-1", isActive ? "fill-amber-950" : "")} />
                                                        <span className="text-sm font-black">{num}</span>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* FREE TEXT */}
                                    {currentStep.ui_type === 'free_text' && (
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] blur opacity-20 group-focus-within:opacity-50 transition duration-500" />
                                            <Textarea 
                                                placeholder={t('mission.write_answer', "Write your detailed answer here...")} 
                                                value={stepAnswers[currentStepIndex] || ''}
                                                onChange={(e) => handleAnswerUpdate(e.target.value)}
                                                className="relative min-h-[300px] text-xl p-8 md:p-10 rounded-[2.5rem] bg-white/5 dark:bg-black/40 border-2 border-white/10 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 shadow-inner backdrop-blur-md resize-none font-medium leading-relaxed"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* BOTÓN SIGUIENTE / COMPLETAR */}
                            <div className="mt-16 flex justify-end border-t border-white/10 pt-10">
                                <Button 
                                    size="lg" 
                                    onClick={handleNextStep} 
                                    disabled={submitting}
                                    className="w-full md:w-auto px-16 h-[4.5rem] text-xl font-black rounded-full bg-foreground hover:bg-foreground/90 text-background shadow-[0_15px_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_15px_40px_rgba(255,255,255,0.15)] transition-all hover:-translate-y-1 active:translate-y-0"
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
                    <Card className="border border-white/20 shadow-[0_0_80px_rgba(16,185,129,0.2)] overflow-hidden rounded-[3rem] text-center bg-card/80 backdrop-blur-2xl relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                        
                        <CardContent className="p-12 md:p-24 relative z-10">
                            {result === 'success' && (
                                <div className="space-y-10">
                                    <motion.div 
                                        initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className="w-40 h-40 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-[3rem] rotate-12 flex items-center justify-center mx-auto mb-10 shadow-[0_0_60px_rgba(250,204,21,0.5)] border-4 border-white dark:border-slate-800"
                                    >
                                        <Trophy className="w-20 h-20 text-yellow-950 -rotate-12 drop-shadow-md" />
                                    </motion.div>
                                    <h2 className="text-5xl md:text-7xl font-black text-foreground tracking-tight break-words drop-shadow-md">{t('mission.accomplished_title', 'Mission Accomplished!')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed break-words">
                                        {mission.successMessage || t('mission.success_default', 'You have successfully completed this quest and earned your rewards.')}
                                    </p>
                                    
                                    <div className="flex justify-center gap-6 pt-10 flex-wrap">
                                         <div className="px-8 py-4 text-2xl font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-lg flex items-center">
                                            <Zap className="w-8 h-8 mr-3 fill-emerald-500 text-emerald-500"/> +{mission.impact_credit_reward} {t('rewards.bonus_points', 'BP')}
                                         </div>
                                         {mission.reputation_reward > 0 && (
                                             <div className="px-8 py-4 text-2xl font-black bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30 rounded-2xl shadow-lg flex items-center">
                                                <Shield className="w-8 h-8 mr-3 fill-blue-500 text-blue-500"/> +{mission.reputation_reward} {t('rewards.reputation', 'Rep')}
                                             </div>
                                         )}
                                    </div>
                                </div>
                            )}

                            {result === 'pending_review' && (
                                <div className="space-y-8">
                                    <div className="w-40 h-40 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                                        <Shield className="w-20 h-20 text-blue-500" />
                                    </div>
                                    <h2 className="text-5xl font-black text-foreground tracking-tight break-words">{t('mission.under_review_title', 'Under Review')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed break-words">
                                        {t('mission.under_review_desc', 'Your answers have been submitted. A Guardian will review your response shortly to grant your rewards.')}
                                    </p>
                                </div>
                            )}

                            {result === 'already_completed' && (
                                <div className="space-y-8">
                                    <div className="w-40 h-40 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                                        <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                                    </div>
                                    <h2 className="text-5xl font-black text-foreground tracking-tight break-words">{t('mission.already_completed_title', 'Already Completed')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto break-words">{t('mission.already_completed_desc', 'You have already earned the rewards for this mission.')}</p>
                                </div>
                            )}

                            {result === 'skipped' && (
                                <div className="space-y-8">
                                    <div className="w-40 h-40 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-10">
                                        <SkipForward className="w-20 h-20 text-muted-foreground opacity-50" />
                                    </div>
                                    <h2 className="text-5xl font-black text-foreground tracking-tight break-words">{t('mission.skipped_title', 'Mission Skipped')}</h2>
                                    <p className="text-2xl text-muted-foreground font-medium max-w-2xl mx-auto break-words">{t('mission.penalty_applied', { penalty: mission.skip_penalty })}</p>
                                </div>
                            )}

                            <div className="mt-20">
                                <Button size="lg" onClick={goBack} className="w-full md:w-auto min-w-[350px] bg-foreground hover:bg-foreground/90 text-background rounded-full h-[4.5rem] text-2xl font-black shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:scale-105 transition-all">
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