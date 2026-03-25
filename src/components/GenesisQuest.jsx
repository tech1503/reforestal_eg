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
  const optionsString = JSON.stringify(questionData?.options || []);
  
  const randomizedOptions = useMemo(() => {
    const optsToShuffle = JSON.parse(optionsString);
    return shuffleArray(optsToShuffle);
  }, [optionsString]); 
  
  if (!questionData || !questionData.options) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto flex flex-col justify-center px-2 shrink-0"
    >
      <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-center mb-3 sm:mb-6 text-white leading-tight drop-shadow-md">
        {questionData.question}
      </h2>
      
      <div className="grid gap-2.5 sm:gap-4 w-full">
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
                w-full text-left p-3 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group
                ${isSelected 
                  ? 'bg-[#5b8370]/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-[#063127]/60 border-[#5b8370]/50 hover:bg-transparent hover:border-white'
                }
              `}
            >
              {isSelected && (
                 <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
              )}

              <div className="relative z-10 flex gap-3 sm:gap-4 items-center">
                <div className={`
                    shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base border transition-colors duration-300
                    ${isSelected 
                        ? 'bg-amber-500 text-[#063127] border-amber-500' 
                        : 'bg-transparent text-[#c4d1c0] border-[#5b8370] group-hover:border-white group-hover:text-white'
                    }
                `}>
                  {isSelected ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#063127]" /> : visualLabel}
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-sm sm:text-lg font-bold leading-tight transition-colors duration-300 truncate sm:whitespace-normal ${isSelected ? 'text-white' : 'text-[#c4d1c0] group-hover:text-white'}`}>
                      {option.main}
                    </span>
                    <p className={`text-[10px] sm:text-sm leading-tight sm:leading-relaxed transition-colors duration-300 line-clamp-2 sm:line-clamp-none mt-0.5 sm:mt-1 ${isSelected ? 'text-white/90' : 'text-[#5b8370] group-hover:text-[#c4d1c0]'}`}>
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
            {isOpen && <div className="fixed inset-0 z-[9998] bg-[#063127]/90 backdrop-blur-sm" />}
            
            <DialogContent className="fixed left-[50%] top-[50%] z-[9999] w-[95vw] sm:w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-[#5b8370]/50 bg-[#063127] shadow-2xl p-0 outline-none sm:max-w-lg rounded-3xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>Genesis Quest Result</DialogTitle>
                    <DialogDescription>Your assigned social profile.</DialogDescription>
                </DialogHeader>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                    className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white"
                >
                    <div className="absolute -top-20 -left-20 w-48 sm:w-60 h-48 sm:h-60 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="mb-4 sm:mb-6 rounded-full bg-[#5b8370]/20 px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-500 border border-amber-500/30">
                            {t('genesisQuest.profile_unlocked', 'Profile Unlocked')}
                        </div>
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                            className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1 mb-4 sm:mb-6 shadow-2xl`}
                        >
                            <div className="w-full h-full bg-[#063127] rounded-full flex items-center justify-center border-4 border-[#063127]">
                                <Icon className={`w-10 h-10 sm:w-14 sm:h-14 text-amber-500 drop-shadow-md`} />
                            </div>
                        </motion.div>
                        <div className="mb-4 sm:mb-6 space-y-2">
                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight"
                            >
                                {title}
                            </motion.h2>
                            <div className="h-1.5 w-16 sm:w-20 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full mx-auto" />
                        </div>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-[#c4d1c0] mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed font-medium"
                        >
                            {description}
                        </motion.p>
                        <div className="w-full space-y-3 sm:space-y-4">
                             <Button 
                                onClick={handleContinue} 
                                size="lg" 
                                className="w-full h-12 sm:h-14 bg-amber-500 hover:bg-transparent text-[#063127] hover:text-amber-500 font-bold text-sm sm:text-base rounded-xl shadow-lg border border-transparent hover:border-amber-500 transition-all hover:scale-[1.02] active:scale-95"
                             >
                                <span className="drop-shadow-sm flex items-center justify-center gap-2">
                                    {user ? t('genesis.continue_dashboard', 'Continue to Dashboard') : t('genesis.create_account', 'Claim Profile & Register')}
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                </span>
                             </Button>
                             {!user && (
                                <p className="text-[10px] sm:text-xs text-[#5b8370] mt-2 font-medium">
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
    }, 250); 
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
            className: "bg-[#063127] border-[#5b8370] text-white"
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
        <div className="h-[100dvh] w-full bg-[#063127] flex flex-col items-center justify-center text-white p-4 overflow-hidden">
            <Loader className="w-8 h-8 animate-spin text-amber-500 mb-4" />
            <p>Checking for results...</p>
            <Button variant="link" onClick={() => window.location.href = '/genesis-quest'} className="mt-4 text-amber-500">
                Start Quest
            </Button>
        </div>
    );
  }

  return (
    <>
      <div className="h-[100dvh] w-full flex flex-col items-center justify-start sm:justify-center bg-[#063127] p-3 sm:p-6 relative overflow-hidden font-sans">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#063127] via-[#063127] to-black"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#5b8370]/10 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#5b8370]/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>

        {/* Top Navbar items */}
        <div className="absolute top-2 left-2 z-50">
            <LanguageSwitcher className="text-[#c4d1c0] hover:text-white hover:bg-white/10 rounded-full bg-black/20 backdrop-blur-sm border border-white/5 h-8 px-2" />
        </div>

        {!user && (
            <div className="absolute top-2 right-2 z-50">
                <Link to="/auth" className="flex items-center gap-1 text-[#c4d1c0] hover:text-white transition-colors text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/5 hover:bg-white/10">
                    <span className="hidden sm:inline">Already a member?</span>
                    <span className="sm:hidden">Login</span>
                    <LogIn size={12} />
                </Link>
            </div>
        )}

        {/* Main Content Wrapper */}
        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center shrink-0 pt-12 sm:pt-4 pb-2">
            
            {/* TOP SECTION: Progress & Title */}
            <div className="flex flex-col items-center shrink-0 w-full">
                <div className="w-full max-w-[120px] sm:max-w-[200px] h-1.5 bg-[#063127] rounded-full mt-1 mb-2 sm:mb-6 overflow-hidden border border-[#5b8370]/40">
                    <motion.div 
                        className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex + (allQuestionsAnswered ? 1 : 0)) / questData.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-1 sm:mb-8 px-1"
                >
                    <span className="text-amber-500 font-bold tracking-widest text-[9px] sm:text-[10px] uppercase mb-0.5 sm:mb-1 block drop-shadow-md">
                        {t('genesisQuest.onboarding_label', 'Genesis Onboarding')}
                    </span>
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg leading-tight">
                       {t('genesisQuest.title', 'Discover Your Impact Profile')}
                    </h1>
                </motion.div>
            </div>

            {/* MIDDLE SECTION: Question */}
            <div className="w-full flex justify-center shrink py-0 sm:py-4 overflow-hidden">
                <AnimatePresence mode="wait">
                  <Question
                    key={currentQuestionIndex}
                    questionData={questData[currentQuestionIndex]}
                    onSelect={(optionType) => handleSelectOption(optionType)}
                    selectedOptionType={answers[currentQuestionIndex]}
                  />
                </AnimatePresence>
            </div>

            {/* BOTTOM SECTION: Dots or Button */}
            <div className="shrink-0 flex items-center justify-center mt-3 sm:mt-8 w-full px-2">
                {/* Dots */}
                <div className={`flex items-center space-x-1 sm:space-x-2 ${allQuestionsAnswered ? 'hidden' : 'flex'}`}>
                    {questData.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => index < currentQuestionIndex ? setCurrentQuestionIndex(index) : null}
                            disabled={index > currentQuestionIndex}
                            className={`h-1 sm:h-2 rounded-full transition-all duration-300 ${
                                index === currentQuestionIndex 
                                    ? 'w-5 sm:w-8 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                                    : index < currentQuestionIndex 
                                        ? 'w-1 sm:w-2 bg-[#5b8370] hover:bg-amber-500/50 cursor-pointer' 
                                        : 'w-1 sm:w-2 bg-[#063127] border border-[#5b8370]/30'
                            }`}
                        />
                    ))}
                </div>

                {/* Final Submit Button */}
                <AnimatePresence>
                    {allQuestionsAnswered && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md mx-auto"
                        >
                            <Button 
                                onClick={handleQuizComplete} 
                                size="lg" 
                                disabled={loading} 
                                className="w-full h-12 sm:h-14 bg-amber-500 text-white border border-amber-500 px-5 sm:px-10 text-sm sm:text-base font-bold rounded-2xl sm:rounded-full transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {loading ? <Loader className="animate-spin w-4 h-4 sm:w-5 sm:h-5" /> : t('genesisQuest.finish_quest', 'Reveal My Profile')}
                                    {!loading && <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </span>
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
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