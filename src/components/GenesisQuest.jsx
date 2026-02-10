import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, ArrowRight, Leaf, Shield, Users, LogIn, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Link, useNavigate } from 'react-router-dom';
import { getInvestorProfileBySlug } from '@/constants/investorProfiles';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { executeGamificationAction } from '@/utils/gamificationEngine';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'; 

const shuffleArray = (array) => {
  if (!array || !Array.isArray(array)) return [];
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const FALLBACK_QUESTIONS = [
  {
    id: 1,
    question: "What drives your investment decisions most?",
    options: [
      { type: "lena", main: "Nature & Sustainability", dropdown: "I want to preserve the planet for future generations." },
      { type: "markus", main: "Innovation & Growth", dropdown: "I believe technology and smart systems drive value." },
      { type: "david", main: "Community & Impact", dropdown: "I want to empower people and build strong societies." }
    ]
  }
];

const PROFILE_ICONS = {
  lena: Leaf,
  markus: Shield,
  david: Users
};

const Question = ({ questionData, onSelect, selectedOptionType }) => {
  const randomizedOptions = useMemo(() => {
    return shuffleArray(questionData.options);
  }, [questionData.id, JSON.stringify(questionData.options)]); 
  
  if (!questionData || !questionData.options) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl"
    >
      <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-white leading-tight drop-shadow-xl px-4">
        {questionData.question}
      </h2>
      
      <div className="grid gap-4">
        {randomizedOptions.map((option, index) => {
          const visualLabel = String.fromCharCode(65 + index); 
          const isSelected = selectedOptionType === option.type;

          return (
            <motion.button
              key={option.type}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(option.type)}
              className={`
                w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group
                ${isSelected 
                  ? 'bg-emerald-900/40 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.2)]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                }
              `}
            >
              {isSelected && (
                 <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
              )}

              <div className="relative z-10 flex gap-5 items-start">
                <div className={`
                    shrink-0 flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg border shadow-lg transition-colors duration-300
                    ${isSelected 
                        ? 'bg-emerald-500 text-white border-emerald-400' 
                        : 'bg-white/5 text-emerald-100/60 border-white/10 group-hover:border-emerald-400/50'
                    }
                `}>
                  {isSelected ? <CheckCircle2 className="w-6 h-6" /> : visualLabel}
                </div>

                <div className="flex flex-col gap-2">
                    <span className={`text-lg md:text-xl font-bold leading-snug transition-colors duration-300 ${isSelected ? 'text-white' : 'text-emerald-50'}`}>
                      {option.main}
                    </span>
                    <p className={`text-sm md:text-base leading-relaxed transition-colors duration-300 ${isSelected ? 'text-emerald-100' : 'text-emerald-200/60'}`}>
                      {option.dropdown}
                    </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

const GenesisResultModal = ({ isOpen, profileSlug, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const normalizedSlug = profileSlug ? profileSlug.toLowerCase() : 'markus';
    const profile = getInvestorProfileBySlug(normalizedSlug);
    const Icon = PROFILE_ICONS[normalizedSlug] || Leaf;
    const { gradient } = profile || { gradient: 'from-gray-500 to-slate-500' };

    const title = t(`genesisQuest.profiles.genesis.${normalizedSlug}.title`, profile?.title || 'Unknown Profile');
    const description = t(`genesisQuest.profiles.genesis.${normalizedSlug}.description`, profile?.description || '');

    const handleContinue = () => {
        onClose();
        if (!user) {
            navigate('/register');
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {isOpen && <div className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm" />}
            
            <DialogContent className="fixed left-[50%] top-[50%] z-[9999] w-full max-w-md translate-x-[-50%] translate-y-[-50%] border-none bg-transparent shadow-none p-0 outline-none sm:max-w-lg">
                <DialogHeader className="sr-only">
                    <DialogTitle>Genesis Quest Result</DialogTitle>
                    <DialogDescription>Your assigned investor profile.</DialogDescription>
                </DialogHeader>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                    className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-slate-950 p-8 text-white shadow-[0_0_60px_-15px_rgba(16,185,129,0.6)]"
                >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
                    <div className="absolute -top-20 -left-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="mb-6 rounded-full bg-emerald-900/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/30">
                            {t('genesisQuest.profile_unlocked', 'Profile Unlocked')}
                        </div>
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className={`w-32 h-32 rounded-full bg-gradient-to-br ${gradient} p-1 mb-6 shadow-2xl`}
                        >
                            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-950">
                                <Icon className={`w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]`} />
                            </div>
                        </motion.div>
                        <div className="mb-6 space-y-2">
                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl font-black tracking-tight text-white leading-tight"
                            >
                                {title}
                            </motion.h2>
                            <div className="h-1.5 w-20 bg-gradient-to-r from-emerald-400 to-teal-600 rounded-full mx-auto" />
                        </div>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-300 mb-8 text-base leading-relaxed font-medium"
                        >
                            {description}
                        </motion.p>
                        <div className="w-full space-y-4">
                             <Button 
                                onClick={handleContinue} 
                                size="lg" 
                                className={`w-full h-14 bg-gradient-to-r ${gradient} hover:brightness-110 text-white font-bold text-lg rounded-xl shadow-lg border-t border-white/20 transition-all hover:scale-[1.02] active:scale-95`}
                             >
                                <span className="drop-shadow-sm">
                                    {user ? t('genesis.continue_dashboard', 'Continue to Dashboard') : t('genesis.create_account', 'Claim Profile & Register')}
                                </span>
                                <ArrowRight className="ml-2 w-5 h-5 stroke-[3px]" />
                             </Button>
                             {!user && (
                                <p className="text-xs text-slate-500 mt-3 font-medium">
                                    {t('genesis.save_profile_hint', 'Save your profile to secure your status.')}
                                </p>
                             )}
                        </div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

const GenesisQuest = ({ forceShowResult = false }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, fetchProfile } = useAuth();
  
  const tData = t('genesisQuest.questions', { returnObjects: true });
  const questData = Array.isArray(tData) ? tData : FALLBACK_QUESTIONS;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [finalProfileSlug, setFinalProfileSlug] = useState(null);

  useEffect(() => {
    if (forceShowResult) {
        const savedProfile = localStorage.getItem('pending_genesis_profile');
        if (savedProfile) {
            setFinalProfileSlug(savedProfile);
            setShowResultModal(true);
        }
    }
  }, [forceShowResult]);

  const handleSelectOption = (optionType) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionType }));
    
    setTimeout(() => {
      if (currentQuestionIndex < questData.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }, 400); 
  };
  
  const calculateProfile = () => {
    const counts = Object.values(answers).reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    let maxCount = 0;
    let winner = 'lena'; 
    
    for (const slug in counts) {
        if (counts[slug] > maxCount) {
            maxCount = counts[slug];
            winner = slug;
        }
    }
    return winner;
  };

  const handleQuizComplete = async () => {
    setLoading(true);
    const resultSlug = calculateProfile();
    setFinalProfileSlug(resultSlug);
    
    const sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('genesisQuestSessionId', sessionId);

    if (!user) {
        localStorage.setItem('pending_genesis_profile', resultSlug);
        toast({
            title: t('genesis.profile_saved_locally', 'Profile Saved Locally'),
            description: t('genesis.redirect_to_register', 'Please register to save your progress.'),
            className: "bg-emerald-900 border-emerald-700 text-white"
        });
        setLoading(false);
        setShowResultModal(true); 
    } else {
        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ genesis_profile: resultSlug })
                .eq('id', user.id);

            if (profileError) throw profileError;

            const capitalizedProfile = resultSlug.charAt(0).toUpperCase() + resultSlug.slice(1);
            
            await supabase.from('genesis_quest_attempts')
                .insert({ 
                    user_id: user.id, 
                    profile_result: capitalizedProfile, 
                    session_id: sessionId 
                });

            const gamificationResult = await executeGamificationAction(
                user.id, 
                'genesis_quest', 
                { profile: resultSlug }
            );

            const rewardMsg = gamificationResult.success 
                ? ` (+${gamificationResult.creditsAwarded} )` 
                : '';

            toast({
                title: t('genesis.profile_assigned', 'Profile Assigned'),
                description: `${t('common.success')}${rewardMsg}`,
                className: "bg-emerald-50 border-emerald-200"
            });

            if (typeof fetchProfile === 'function') {
                await fetchProfile(user.id);
            }

            setLoading(false);
            setShowResultModal(true);

        } catch (error) {
            console.error("Save failed:", error);
            toast({ 
                variant: "destructive", 
                title: t('genesis.error', 'Error Saving Profile'), 
                description: error.message 
            });
            setLoading(false);
        }
    }
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
  };

  const allQuestionsAnswered = Object.keys(answers).length === questData.length;

  if (forceShowResult && !finalProfileSlug && !showResultModal) {
    return (
        <div className="min-h-screen bg-[#022c22] flex flex-col items-center justify-center text-white p-4">
            <Loader className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p>Checking for results...</p>
            <Button variant="link" onClick={() => window.location.href = '/genesis-quest'} className="mt-4 text-emerald-400">
                Start Quest
            </Button>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#051c14] p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#064e3b] via-[#022c22] to-black"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>

        <div className="absolute top-6 left-6 z-50">
            <LanguageSwitcher className="text-emerald-100/70 hover:text-white hover:bg-white/10 rounded-full bg-black/20 backdrop-blur-sm border border-white/5" />
        </div>

        {!user && (
            <div className="absolute top-6 right-6 z-50">
                <Link to="/auth" className="flex items-center gap-2 text-emerald-100/60 hover:text-white transition-colors text-sm font-medium px-4 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10">
                    <span>Already a member?</span>
                    <LogIn size={16} />
                </Link>
            </div>
        )}

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
            <div className="w-full max-w-xs md:max-w-md h-1.5 bg-emerald-900/50 rounded-full mb-8 md:mb-12 overflow-hidden border border-emerald-900/30">
                <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + (allQuestionsAnswered ? 1 : 0)) / questData.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8 px-4"
            >
                <span className="text-emerald-400 font-bold tracking-widest text-xs uppercase mb-2 block drop-shadow-md">
                    {t('genesisQuest.onboarding_label', 'Genesis Onboarding')}
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-200 mb-2 drop-shadow-lg">
                   {t('genesisQuest.title', 'Discover Your Impact Profile')}
                </h1>
            </motion.div>

            <div className="min-h-[400px] w-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <Question
                    key={currentQuestionIndex}
                    questionData={questData[currentQuestionIndex]}
                    onSelect={(optionType) => handleSelectOption(optionType)}
                    selectedOptionType={answers[currentQuestionIndex]}
                  />
                </AnimatePresence>
            </div>

            <div className="flex items-center space-x-3 mt-10 md:mt-12">
                {questData.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => index < currentQuestionIndex ? setCurrentQuestionIndex(index) : null}
                        disabled={index > currentQuestionIndex}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                            index === currentQuestionIndex 
                                ? 'w-10 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' 
                                : index < currentQuestionIndex 
                                    ? 'w-2.5 bg-emerald-700 hover:bg-emerald-600 cursor-pointer' 
                                    : 'w-2.5 bg-emerald-900/50'
                        }`}
                    />
                ))}
            </div>

            <AnimatePresence>
                {allQuestionsAnswered && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mt-12"
                    >
                        <Button 
                            onClick={handleQuizComplete} 
                            size="lg" 
                            disabled={loading} 
                            className="relative group overflow-hidden bg-white text-emerald-950 hover:text-emerald-900 hover:bg-emerald-50 px-10 py-6 text-lg font-bold rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {loading ? <Loader className="animate-spin" /> : t('genesisQuest.finish_quest', 'Reveal My Profile')}
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            </span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
      
      <GenesisResultModal 
          isOpen={showResultModal}
          profileSlug={finalProfileSlug}
          onClose={handleCloseResultModal}
      />
    </>
  );
};

export default GenesisQuest;