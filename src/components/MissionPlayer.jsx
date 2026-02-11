import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useFinancial } from '@/contexts/FinancialContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { useTranslation } from 'react-i18next';
// Importamos el motor
import { executeGamificationAction } from '@/utils/gamificationEngine';

const MissionPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // FIX LINTER: Eliminado 'profile'
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
      // Obtenemos los datos de la misión
      const { data, error } = await supabase
        .from('genesis_missions')
        .select('id, title, description, response_type, response_options, impact_credit_reward') 
        .eq('id', id)
        .single();
      
      if (error) throw error;

      // Verificar si ya la completó
      const { data: existing } = await supabase.from('user_quest_responses').select('*')
        .eq('user_id', user.id).eq('mission_id', id).eq('is_correct', true).maybeSingle();

      if (existing) setResult('already_completed');
      setMission(data);
      
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
  }, [id, user.id, toast, t, goBack]);

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
        // 1. Validamos la respuesta con RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('submit_mission_answer', {
            p_mission_id: mission.id,
            p_user_answer: answer 
        });

        if (rpcError) throw rpcError;

        if (rpcData.success) {
            setResult('success');
            
            // 2. EJECUCIÓN DINÁMICA DE RECOMPENSA (CON IDIOMA)
            await executeGamificationAction(user.id, null, {
                dynamicAction: {
                    id: mission.id, 
                    action_name: `mission_${mission.id.slice(0,8)}`,
                    action_title: mission.title,
                    action_type: 'Mission Quest',
                    impact_credit_reward: mission.impact_credit_reward,
                    source_event: 'quest_completion'
                },
                notes: `Completed mission: ${mission.title}`,
                languageCode: i18n.language // PASAMOS EL IDIOMA ACTIVO
            });

            await refreshFinancials();
            toast({ 
                title: t('common.success'), 
                description: t('quest.success_toast', { credits: mission.impact_credit_reward }),
                className: "bg-emerald-50 border-emerald-200 text-emerald-900" 
            });
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

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-600"/></div>;
  if (!mission) return <div className="text-center p-10">{t('quest.not_found', "Mission not found")}</div>;

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 md:px-0 relative">
      {result === 'success' && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} style={{ position: 'fixed', top: 0, left: 0, zIndex: 50 }} />}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" onClick={goBack} className="mb-6 text-slate-500 hover:text-slate-800 pl-0 hover:bg-transparent">
            <ArrowLeft className="w-5 h-5 mr-2" /> {t('common.back')}
        </Button>

        <Card className="shadow-xl border-t-8 border-t-emerald-500 overflow-hidden bg-white">
            <CardHeader className="text-center pb-6 pt-10 bg-gradient-to-b from-emerald-50/50 to-transparent">
                <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-md ring-4 ring-emerald-50">
                    {result === 'success' ? <Trophy className="w-10 h-10 animate-bounce" /> : <HelpCircle className="w-10 h-10" />}
                </div>
                <CardTitle className="text-3xl md:text-4xl font-extrabold text-slate-800 leading-tight">
                    {mission.title}
                </CardTitle>
                <div className="flex justify-center mt-4">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
                        {t('quest.reward_label', 'Reward')}: {mission.impact_credit_reward} 
                    </span>
                </div>
            </CardHeader>

            <CardContent className="pt-6 px-6 md:px-12 space-y-8 pb-10">
                <div className="bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-200/60 text-slate-700 text-lg md:text-xl leading-relaxed text-center font-medium shadow-inner">
                    {mission.description}
                </div>

                <div className="max-w-2xl mx-auto">
                    {result === 'already_completed' ? (
                        <div className="text-center p-8 bg-green-50 rounded-2xl border border-green-200 shadow-sm">
                            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-green-800 mb-2">{t('quest.completed_title', 'Mission Completed!')}</h3>
                            <p className="text-green-700 font-medium">{t('quest.reward_claimed', 'Reward already claimed.')}</p>
                        </div>
                    ) : result === 'success' ? (
                        <div className="text-center p-8 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm animate-in zoom-in duration-300">
                            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-emerald-800 mb-2">{t('quest.correct_title', 'Correct Answer!')}</h3>
                            <p className="text-emerald-700 font-medium text-lg">{t('quest.earned_msg', { amount: mission.impact_credit_reward })}</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-6">
                            <Label className="block mb-4 text-xl font-bold text-slate-800 text-center">{t('quest.select_answer_label', 'Select your Answer:')}</Label>
                            
                            {(mission.response_type === 'single_choice' || mission.response_type === 'abc') && (
                                <RadioGroup onValueChange={handleSelectionChange} className="space-y-4">
                                    {mission.response_options?.map((opt, idx) => (
                                        <div key={idx} 
                                            className={`relative flex items-center space-x-4 p-5 rounded-xl border-2 transition-all cursor-pointer group hover:shadow-md ${answer === idx ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                                            onClick={() => handleSelectionChange(String(idx))}
                                        >
                                            <RadioGroupItem value={String(idx)} id={`opt-${idx}`} className="mt-0.5" />
                                            <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer font-medium text-lg text-slate-700">{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {mission.response_type === 'multiple_choice' && (
                                <div className="space-y-4">
                                    {mission.response_options?.map((opt, idx) => (
                                        <div key={idx} 
                                            className={`relative flex items-center space-x-4 p-5 rounded-xl border-2 transition-all cursor-pointer group hover:shadow-md ${answer?.includes(idx) ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
                                            onClick={() => handleSelectionChange(idx)}
                                        >
                                            <Checkbox id={`chk-${idx}`} checked={answer?.includes(idx)} onCheckedChange={() => handleSelectionChange(idx)} />
                                            <Label htmlFor={`chk-${idx}`} className="flex-1 cursor-pointer font-medium text-lg text-slate-700">{opt}</Label>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {mission.response_type === 'free_text' && (
                                <Textarea placeholder={t('quest.free_text_placeholder', 'Type your answer...')} className="min-h-[180px] text-lg p-5 border-2 rounded-xl" value={answer} onChange={(e) => handleSelectionChange(e.target.value)} />
                            )}

                            {result === 'failure' && (
                                <div className="flex items-center justify-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 animate-pulse">
                                    <XCircle className="w-6 h-6" /> <span className="font-bold text-lg">{t('quest.incorrect_try_again', 'Incorrect. Try again.')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
            
            <CardFooter className="pb-10 pt-4 px-6 md:px-12 flex justify-center bg-white">
                {result === 'success' || result === 'already_completed' ? (
                    <Button size="lg" className="w-full md:w-1/2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-lg h-14 rounded-xl shadow-lg" onClick={goBack}>
                        {t('common.back')}
                    </Button>
                ) : (
                    <Button size="lg" className="w-full md:w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : t('quest.submit_answer', "Submit Answer")}
                    </Button>
                )}
            </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default MissionPlayer;