import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, Lightbulb, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { useTranslation } from 'react-i18next';
import { executeGamificationAction } from '@/utils/gamificationEngine';
import { cn } from '@/lib/utils';

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
  const [answer, setAnswer] = useState(null);
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
        .select(`
            *,
            genesis_mission_translations (
                language_code,
                title,
                subtitle,
                description,
                extra_info,
                success_message,
                response_options
            )
        `) 
        .eq('id', id)
        .single();
      
      if (error) throw error;

      const { data: existing } = await supabase.from('user_quest_responses').select('*')
        .eq('user_id', user.id).eq('mission_id', id).eq('is_correct', true).maybeSingle();

      if (existing) setResult('already_completed');

      const lang = i18n.language ? i18n.language.split('-')[0] : 'en';
      const translation = data.genesis_mission_translations?.find(t => t.language_code === lang) 
                       || data.genesis_mission_translations?.find(t => t.language_code === 'en');
      
      const processedMission = {
          ...data,
          displayTitle: translation?.title || data.title,
          displaySubtitle: translation?.subtitle || data.subtitle || null,
          displayDescription: translation?.description || data.description,
          displayExtraInfo: translation?.extra_info || data.extra_info || null,
          displayOptions: (translation?.response_options?.length > 0) ? translation.response_options : data.response_options,
          successMessage: translation?.success_message || null
      };

      setMission(processedMission);
      
      if (data.response_type === 'multiple_choice') setAnswer([]);
      else if (data.response_type === 'free_text') setAnswer('');
      else setAnswer(null);

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: t('common.error'), description: "Failed to load mission." });
      goBack();
    } finally {
      setLoading(false);
    }
  }, [id, user.id, toast, t, goBack, i18n.language]);

  useEffect(() => { fetchMission(); }, [fetchMission]);

  const handleSelectionChange = (value) => {
    if (result === 'success') return;
    if (mission.response_type === 'multiple_choice') {
      const val = parseInt(value);
      setAnswer(prev => prev.includes(val) ? prev.filter(item => item !== val) : [...prev, val]);
    } else if (mission.response_type === 'free_text') {
      setAnswer(value);
    } else {
      setAnswer(parseInt(value));
    }
  };

  const handleSubmit = async () => {
    if (answer === null || (Array.isArray(answer) && answer.length === 0) || (typeof answer === 'string' && !answer.trim())) {
        toast({ title: t('common.error'), description: t('quest.select_answer_error', "Please select an answer.") });
        return;
    }
    setSubmitting(true);

    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('submit_mission_answer', {
            p_mission_id: mission.id,
            p_user_answer: answer 
        });

        if (rpcError) throw rpcError;

        if (rpcData.success) {
            setResult('success');
            await executeGamificationAction(user.id, null, {
                dynamicAction: {
                    id: mission.id, 
                    action_name: `mission_${mission.id.slice(0,8)}`,
                    action_title: mission.displayTitle,
                    action_type: 'Mission Quest',
                    impact_credit_reward: mission.impact_credit_reward,
                    source_event: 'quest_completion'
                },
                notes: `Completed mission: ${mission.displayTitle}`,
                languageCode: i18n.language
            });
            await refreshFinancials();
        } else {
            if (rpcData.message === 'already_completed') {
                setResult('already_completed');
                toast({ title: t('common.info'), description: t('quest.already_completed_msg', "You already completed this mission.") });
            } else {
                setResult('failure');
                toast({ variant: "destructive", title: t('common.error'), description: t('quest.incorrect_msg', "Try again.") });
            }
        }
    } catch (error) {
        console.error("Submission Error:", error);
        toast({ variant: "destructive", title: t('common.error'), description: t('quest.submission_error', "Submission failed.") });
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary"/></div>;
  if (!mission) return <div className="text-center p-20 text-muted-foreground">{t('quest.not_found', "Mission not found")}</div>;

  const isAnswerSelected = (answer !== null && (Array.isArray(answer) ? answer.length > 0 : true) && (typeof answer === 'string' ? answer.trim() !== '' : true));

  // Variantes de animación para las opciones
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen w-full py-8 px-4 md:px-8 flex flex-col items-center justify-center relative overflow-hidden">
      {result === 'success' && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={600} gravity={0.2} style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }} />}

      <div className="w-full max-w-5xl relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <Button variant="ghost" onClick={goBack} className="mb-8 text-muted-foreground hover:text-foreground pl-0 hover:bg-transparent group transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> {t('common.back')}
            </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <Card className="border-0 shadow-2xl overflow-hidden bg-card/95 backdrop-blur-xl ring-1 ring-border/50 rounded-[2rem]">
                
                {/* === HERO HEADER === */}
                <div className="relative h-64 md:h-80 w-full overflow-hidden">
                    {mission.image_url ? (
                        <>
                            <img src={mission.image_url} alt={mission.displayTitle} className="w-full h-full object-cover scale-105 animate-slow-zoom" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                            <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" /> {/* Tinte de marca */}
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-accent/10 flex items-center justify-center relative overflow-hidden">
                            {/* Abstract Background Shapes */}
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
                                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                                <div className="absolute top-40 -right-20 w-64 h-64 bg-accent rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                            </div>
                            <Trophy className="w-24 h-24 text-primary/40 animate-pulse relative z-10" />
                        </div>
                    )}
                    
                    {/* Points Badge - Floating */}
                    <div className="absolute top-6 right-6 animate-bounce-slow">
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 uppercase tracking-widest px-4 py-2 flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/30 backdrop-blur-md">
                            <Zap className="w-4 h-4 fill-current"/> +{mission.impact_credit_reward} {t('dashboard.impact_credits')}
                        </Badge>
                    </div>
                </div>

                <CardHeader className="relative z-20 -mt-20 px-8 md:px-12 pb-4 text-center">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                        <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5 backdrop-blur-sm">
                            {mission.action_type || 'Quest'}
                        </Badge>
                        <CardTitle className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-foreground drop-shadow-sm">
                            {mission.displayTitle}
                        </CardTitle>
                    </motion.div>
                    
                    {mission.displaySubtitle && (
                        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
                            {mission.displaySubtitle}
                        </motion.p>
                    )}
                </CardHeader>

                <CardContent className="px-8 md:px-12 py-8 relative z-10">
                    
                    {/* Main Description */}
                    <div className="text-foreground/90 text-2xl md:text-3xl leading-relaxed text-center font-semibold mb-10 max-w-4xl mx-auto py-4 border-b-2 border-border/50">
                        {mission.displayDescription}
                    </div>

                    {/* Tooltip / Hint Box */}
                    <AnimatePresence>
                        {mission.displayExtraInfo && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="max-w-3xl mx-auto mb-12 bg-accent/10 border border-accent/20 rounded-2xl p-6 flex gap-5 items-start shadow-sm relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                                <div className="bg-accent/20 p-3 rounded-full flex-shrink-0">
                                    <Lightbulb className="w-6 h-6 text-accent-foreground animate-pulse" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-accent-foreground mb-1 flex items-center gap-2">Hint <span className="text-xs opacity-70 font-normal">(Optional Context)</span></h5>
                                    <p className="text-muted-foreground text-lg leading-relaxed italic">"{mission.displayExtraInfo}"</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* === INTERACTIVE AREA === */}
                    <div className="max-w-3xl mx-auto min-h-[300px] flex items-center justify-center">
                        <AnimatePresence mode='wait'>
                        {result === 'already_completed' ? (
                            <motion.div key="completed" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-12 bg-muted/30 rounded-[2rem] border-2 border-dashed border-muted-foreground/20 w-full">
                                <CheckCircle2 className="w-24 h-24 text-muted-foreground/50 mx-auto mb-6" />
                                <h3 className="text-3xl font-bold text-muted-foreground mb-3">{t('quest.completed_title', 'Mission Already Completed')}</h3>
                                <p className="text-lg text-muted-foreground/80">{t('quest.reward_claimed', 'You have already earned the rewards for this quest.')}</p>
                            </motion.div>
                        ) : result === 'success' ? (
                            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-12 bg-gradient-to-br from-primary/90 to-teal-600/90 rounded-[2rem] shadow-2xl shadow-primary/30 text-primary-foreground w-full relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-soft-light"></div>
                                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                                    <div className="bg-white/20 p-4 rounded-full inline-block mb-6 backdrop-blur-sm">
                                        <Trophy className="w-20 h-20 text-yellow-300 drop-shadow-[0_5px_15px_rgba(250,204,21,0.5)]" />
                                    </div>
                                    <h3 className="text-4xl font-extrabold mb-4 tracking-tight">{t('quest.correct_title', 'Excellent Work!')}</h3>
                                    <p className="font-medium text-2xl opacity-95 max-w-xl mx-auto leading-relaxed">
                                        {mission.successMessage || t('quest.earned_msg', { amount: mission.impact_credit_reward })}
                                    </p>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <div key="quiz" className="w-full">
                                {/* SINGLE CHOICE / ABC */}
                                {(mission.response_type === 'single_choice' || mission.response_type === 'abc') && (
                                    <RadioGroup onValueChange={handleSelectionChange} className="space-y-4">
                                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-1">
                                            {mission.displayOptions?.map((opt, idx) => {
                                                const isSelected = answer === String(idx);
                                                return (
                                                <motion.div key={idx} variants={itemVariants}>
                                                    <Label 
                                                        htmlFor={`opt-${idx}`} 
                                                        className={cn(
                                                            "relative flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 group overflow-hidden",
                                                            isSelected 
                                                                ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.2)] scale-[1.02]" 
                                                                : "border-border bg-card hover:border-primary/50 hover:bg-accent/5 hover:shadow-md"
                                                        )}
                                                    >
                                                        <RadioGroupItem value={String(idx)} id={`opt-${idx}`} className="sr-only" />
                                                        
                                                        <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center mr-5 transition-all flex-shrink-0", 
                                                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 group-hover:border-primary/50"
                                                        )}>
                                                            {isSelected && <Check className="w-5 h-5" />}
                                                        </div>

                                                        <span className={cn("flex-1 font-bold text-xl transition-colors", isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                                                            {opt}
                                                        </span>
                                                        
                                                        {/* Selection Glow Effect */}
                                                        {isSelected && <motion.div layoutId="glow" className="absolute inset-0 bg-primary/5 z-[-1]" transition={{ duration: 0.3 }} />}
                                                    </Label>
                                                </motion.div>
                                            )})}
                                        </motion.div>
                                    </RadioGroup>
                                )}

                                {/* MULTIPLE CHOICE */}
                                {mission.response_type === 'multiple_choice' && (
                                    <div className="space-y-4">
                                        <p className="text-center text-muted-foreground mb-4 font-medium flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4"/> {t('quest.select_multiple', 'Select all that apply')}</p>
                                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4">
                                            {mission.displayOptions?.map((opt, idx) => {
                                                const isSelected = answer?.includes(idx);
                                                return (
                                                <motion.div key={idx} variants={itemVariants}>
                                                    <Label 
                                                        htmlFor={`chk-${idx}`} 
                                                        className={cn(
                                                            "relative flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 group overflow-hidden",
                                                            isSelected 
                                                                ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.2)] scale-[1.02]" 
                                                                : "border-border bg-card hover:border-primary/50 hover:bg-accent/5 hover:shadow-md"
                                                        )}
                                                    >
                                                        <Checkbox id={`chk-${idx}`} checked={isSelected} onCheckedChange={() => handleSelectionChange(idx)} className="sr-only" />
                                                        
                                                        <div className={cn("w-8 h-8 rounded-md border-2 flex items-center justify-center mr-5 transition-all flex-shrink-0", 
                                                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 group-hover:border-primary/50"
                                                        )}>
                                                            {isSelected && <Check className="w-5 h-5" />}
                                                        </div>
                                                        
                                                        <span className={cn("flex-1 font-bold text-xl transition-colors", isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                                                            {opt}
                                                        </span>
                                                    </Label>
                                                </motion.div>
                                            )})}
                                        </motion.div>
                                    </div>
                                )}

                                {/* FREE TEXT */}
                                {mission.response_type === 'free_text' && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                        <Textarea 
                                            placeholder={t('quest.free_text_placeholder', 'Type your answer here...')} 
                                            className="min-h-[250px] text-xl p-6 border-2 border-border rounded-2xl focus-visible:ring-primary focus-visible:border-primary shadow-inner resize-none bg-card/50 backdrop-blur-sm placeholder:text-muted-foreground/50" 
                                            value={answer} 
                                            onChange={(e) => handleSelectionChange(e.target.value)} 
                                        />
                                    </motion.div>
                                )}

                                {/* ERROR MESSAGE ANIMATED */}
                                <AnimatePresence>
                                    {result === 'failure' && (
                                        <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center justify-center gap-4 text-destructive bg-destructive/10 p-6 rounded-2xl border-2 border-destructive/30 shadow-lg mt-8">
                                            <XCircle className="w-8 h-8 animate-shake" /> 
                                            <span className="font-bold text-xl">{t('quest.incorrect_try_again', 'Incorrect. Please review and try again.')}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        </AnimatePresence>
                    </div>
                </CardContent>
                
                {/* === FOOTER ACTIONS === */}
                <CardFooter className="pb-12 pt-6 px-8 md:px-12 flex justify-center bg-background/50 backdrop-blur-md border-t border-border/50 relative z-20">
                    {result === 'success' || result === 'already_completed' ? (
                        <Button size="lg" variant="outline" className="w-full md:w-2/3 font-bold text-lg h-16 rounded-full border-2 hover:bg-accent/10 transition-all" onClick={goBack}>
                            {t('common.back')}
                        </Button>
                    ) : (
                        <Button 
                            size="lg" 
                            className={cn(
                                "w-full md:w-2/3 font-extrabold text-xl h-16 rounded-full shadow-xl transition-all duration-300 relative overflow-hidden group",
                                !isAnswerSelected
                                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                                : "btn-primary hover:scale-[1.03] hover:shadow-primary/40"
                            )} 
                            onClick={handleSubmit} 
                            disabled={submitting || !isAnswerSelected}
                        >
                            {submitting ? <Loader2 className="mr-3 h-7 w-7 animate-spin" /> : (
                                <span className="flex items-center gap-3 relative z-10">
                                    {t('quest.submit_answer', "Submit Answer")} 
                                    <Zap className={cn("w-6 h-6 transition-transform group-hover:rotate-12", isAnswerSelected ? "fill-current" : "")} />
                                </span>
                            )}
                            {isAnswerSelected && !submitting && <div className="absolute inset-0 h-full w-full scale-0 rounded-full transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10"></div>}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </motion.div>
      </div>
      
      {/* Background Ambient Light Effect for Dark Mode */}
      <div className="absolute inset-0 pointer-events-none dark:opacity-100 opacity-0 transition-opacity duration-500">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-[128px] animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full mix-blend-screen filter blur-[128px] animate-pulse-slow animation-delay-2000"></div>
      </div>
    </div>
  );
};

export default MissionPlayer;