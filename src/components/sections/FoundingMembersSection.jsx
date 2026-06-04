import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Newspaper, TrendingUp, CheckCircle2, Loader2, Edit, Send, Hourglass, Lock, Users, MessageSquare, ThumbsUp, ThumbsDown, Swords, PieChart, Activity, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import FoundingPioneerNotification from '@/components/ui/FoundingPioneerNotification';
import FoundingPioneerLockedSection from '@/components/ui/FoundingPioneerLockedSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNumber } from '@/lib/utils'; 

// ============================================================================
// COMPONENTE PARA RENDERIZAR IMÁGENES O VIDEOS EN LAS OPCIONES
// ============================================================================
const MediaPreview = ({ url, className }) => {
    if (!url) return null;
    const isVideo = url.match(/\.(mp4|webm|ogg)(\?.*)?$/i);
    
    if (isVideo) {
        return (
            <video 
                src={url} 
                controls 
                className={`object-cover w-full rounded-xl shadow-sm border border-gold/30 ${className}`} 
                onClick={(e) => e.stopPropagation()} 
            />
        );
    }
    return (
        <img 
            src={url} 
            alt="Option Media" 
            className={`object-cover w-full rounded-xl shadow-sm border border-gold/30 ${className}`} 
        />
    );
};

const ApplicationModal = ({ open, onOpenChange, reason, setReason, onSubmit, isSubmitting }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-[#063127] border border-gold/50 shadow-2xl rounded-3xl p-5 sm:p-6">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-white">
                    <div className="p-2.5 bg-gradient-gold shadow-glow border border-gold rounded-full shrink-0">
                        <Send className="w-5 h-5 text-[#063127]" />
                    </div>
                    {t('founding_pioneer.locked_section.cta_button', 'Apply to become a Pioneer')}
                </DialogTitle>
                <div className="text-sm text-[#c4d1c0] pt-2">
                    {t('pioneer.restricted.pending_msg', 'Please explain why you want to join.')}
                </div>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="..."
                    className="min-h-[120px] bg-[#063127] dark:bg-[#063127]/50 border-gold/50 focus:border-gold focus:ring-gold/20 text-white text-sm rounded-2xl placeholder:text-gold/50"
                />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto hover:bg-transparent hover:text-white hover:border hover:border-gold text-[#c4d1c0] rounded-xl transition-all border border-transparent">{t('common.cancel')}</Button>
                <Button onClick={onSubmit} disabled={isSubmitting || !reason.trim()} className="w-full sm:w-auto bg-[#5b8370] hover:bg-transparent text-white hover:border hover:border-gold shadow-lg border border-transparent rounded-xl transition-all">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {t('common.submit')}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// MODULOS DE VOTACIÓN
// ============================================================================

const ClassicVote = ({ proposal, onVote, hasVoted }) => {
    const { t } = useTranslation();
    return (
        <div className="space-y-4 mt-4">
            {proposal.stats.map((o, i) => (
                <div key={i} className="mb-4 group">
                    <div className="flex justify-between text-xs sm:text-sm mb-1.5 font-bold text-[#c4d1c0]">
                        <span>{o.label}</span>
                        <span className="text-gradient-gold font-black drop-shadow-sm">{o.percent}%</span>
                    </div>
                    <Progress value={o.percent} className="h-2.5 sm:h-3 bg-[#063127] border border-gold/20 [&>div]:bg-gradient-gold rounded-full" />
                </div>
            ))}
            {!hasVoted ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
                    {proposal.options.map((opt, i) => {
                         const label = typeof opt === 'object' ? opt.label : opt;
                         const media = typeof opt === 'object' ? opt.media_url : null;
                         return (
                             <Button key={i} onClick={() => onVote(proposal.id, { choice: label })} className="bg-[#063127] dark:bg-[#063127]/80 border-2 border-gold/30 text-[#c4d1c0] hover:bg-transparent hover:text-white hover:border-gold transition-all shadow-sm hover:shadow-glow rounded-2xl p-4 font-bold text-sm sm:text-base flex flex-col h-auto items-center justify-center gap-3 group">
                                {media && <MediaPreview url={media} className="h-32 sm:h-40 w-full" />}
                                <span className="group-hover:text-gold transition-colors">{label}</span>
                             </Button>
                         );
                    })}
                </div>
            ) : (
                <div className="mt-5 p-4 bg-[#063127] dark:bg-gold/10 border-2 border-gold rounded-2xl text-[#c4d1c0] text-center text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-gold"/> {t('pioneer.toasts.vote_success', 'Vote Submitted!')}
                </div>
            )}
        </div>
    );
};

const ComparativeVote = ({ proposal, onVote, hasVoted }) => {
    //const { t } = useTranslation();
    const optA = proposal.options[0] || { label: 'A' };
    const optB = proposal.options[1] || { label: 'B' };
    
    const labelA = typeof optA === 'object' ? (optA.label || 'A') : optA;
    const labelB = typeof optB === 'object' ? (optB.label || 'B') : optB;
    const mediaA = typeof optA === 'object' ? optA.media_url : null;
    const mediaB = typeof optB === 'object' ? optB.media_url : null;

    const statA = proposal.stats.find(s => s.label === labelA)?.percent || 50;
    const statB = proposal.stats.find(s => s.label === labelB)?.percent || 50;

    if (hasVoted) {
        return (
            <div className="mt-6 sm:mt-8 flex h-14 sm:h-16 rounded-2xl overflow-hidden shadow-inner relative border-2 border-gold">
                <motion.div initial={{ width: '50%' }} animate={{ width: `${statA}%` }} className="bg-[#063127] h-full flex items-center px-4 overflow-hidden relative group">
                    <span className="text-gradient-gold font-black drop-shadow-sm text-sm sm:text-xl z-10">{statA}%</span>
                    <span className="text-[#c4d1c0]/80 font-bold text-xs sm:text-sm ml-2 sm:ml-3 z-10 truncate whitespace-nowrap hidden sm:block">{labelA}</span>
                </motion.div>
                <motion.div initial={{ width: '50%' }} animate={{ width: `${statB}%` }} className="bg-[#5b8370] h-full flex justify-end items-center px-4 overflow-hidden relative group">
                    <span className="text-white/80 font-bold text-xs sm:text-sm mr-2 sm:mr-3 z-10 truncate whitespace-nowrap hidden sm:block">{labelB}</span>
                    <span className="text-white font-black text-sm sm:text-xl z-10">{statB}%</span>
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-gradient-gold p-2 sm:p-3 rounded-full shadow-glow border border-white/20"><Swords className="w-5 h-5 sm:w-6 sm:h-6 text-[#063127]"/></div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch justify-center relative">
            <Button onClick={() => onVote(proposal.id, { choice: labelA })} className="flex-1 h-auto min-h-[5rem] sm:min-h-[7rem] bg-[#063127] dark:bg-[#063127]/60 hover:bg-transparent text-[#c4d1c0] hover:text-white border-2 border-gold/30 hover:border-gold rounded-[1.5rem] sm:rounded-[2rem] transition-all shadow-sm hover:shadow-glow hover:-translate-y-1 group flex-col p-4 sm:p-5 gap-3">
                {mediaA && <MediaPreview url={mediaA} className="h-24 sm:h-32 w-full" />}
                <span className="font-black text-sm sm:text-lg text-wrap break-words line-clamp-3 group-hover:text-gold transition-colors">{labelA}</span>
            </Button>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#063127] p-3 sm:p-4 rounded-full shadow-2xl border-2 border-gold z-10 hidden sm:block">
                <span className="font-black text-gradient-gold text-xs sm:text-sm">VS</span>
            </div>
            <Button onClick={() => onVote(proposal.id, { choice: labelB })} className="flex-1 h-auto min-h-[5rem] sm:min-h-[7rem] bg-[#063127] dark:bg-[#5b8370]/60 hover:bg-transparent text-[#c4d1c0] hover:text-white border-2 border-gold/30 hover:border-gold rounded-[1.5rem] sm:rounded-[2rem] transition-all shadow-sm hover:shadow-glow hover:-translate-y-1 group flex-col p-4 sm:p-5 gap-3">
                {mediaB && <MediaPreview url={mediaB} className="h-24 sm:h-32 w-full" />}
                <span className="font-black text-sm sm:text-lg text-wrap break-words line-clamp-3 group-hover:text-gold transition-colors">{labelB}</span>
            </Button>
        </div>
    );
};

const BudgetVote = ({ proposal, onVote, hasVoted }) => {
    const { t } = useTranslation();
    const [allocations, setAllocations] = useState({});
    
    useEffect(() => {
        const init = {};
        proposal.options.forEach(o => {
            const label = typeof o === 'object' ? o.label : o;
            init[label] = 0;
        });
        setAllocations(init);
    }, [proposal.options]);

    const totalAllocated = Object.values(allocations).reduce((a,b) => a+b, 0);
    const remaining = 100 - totalAllocated;

    const handleChange = (optLabel, val) => {
        const diff = val - allocations[optLabel];
        if (remaining - diff >= 0) {
            setAllocations(prev => ({ ...prev, [optLabel]: val }));
        }
    };

    if (hasVoted) {
        return (
            <div className="mt-6 space-y-4 p-5 sm:p-6 bg-[#063127] dark:bg-[#063127]/40 rounded-2xl sm:rounded-[2rem] border border-gold/30 shadow-inner">
                <h4 className="text-center font-black text-white text-xs sm:text-sm mb-5 sm:mb-6 uppercase tracking-wider">{t('pioneer.budget_vote.average_allocation', 'Average Community Allocation')}</h4>
                {proposal.stats.map((s, i) => (
                    <div key={i}>
                        <div className="flex justify-between text-xs sm:text-sm font-bold text-[#c4d1c0] mb-1.5 sm:mb-2"><span>{s.label}</span><span className="text-gradient-gold drop-shadow-sm">{s.percent}%</span></div>
                        <Progress value={s.percent} className="h-2.5 sm:h-3 bg-[#063127] border border-gold/20 [&>div]:bg-gradient-gold rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-5 p-5 sm:p-8 bg-[#063127] dark:bg-[#063127]/40 border border-gold/30 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gold/10 blur-[40px] rounded-full pointer-events-none"/>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 relative z-10 gap-3">
                <span className="font-black text-white text-sm sm:text-lg flex items-center gap-2"><PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-gold"/> {t('pioneer.budget_vote.allocate_points', 'Allocate 100 Points')}</span>
            
                <Badge className={remaining === 0 ? "bg-gradient-gold shadow-glow border border-white/20 text-[#063127] font-bold px-3 py-1.5 text-xs sm:text-sm" : "bg-[#5b8370] border-gold/50 text-white font-bold px-3 py-1.5 text-xs sm:text-sm shadow-md"}>{formatNumber(remaining)} {t('pioneer.budget_vote.pts_left', 'Pts Left')}</Badge>
            </div>
            <div className="space-y-5 sm:space-y-6 relative z-10 grid grid-cols-1 gap-4">
                {proposal.options.map((opt, i) => {
                    const label = typeof opt === 'object' ? opt.label : opt;
                    const media = typeof opt === 'object' ? opt.media_url : null;
                    return (
                        <div key={i} className="p-4 bg-[#063127] dark:bg-[#063127]/60 border border-gold/30 rounded-xl shadow-sm">
                            {media && <MediaPreview url={media} className="h-32 sm:h-40 w-full mb-4" />}
                            <div className="flex justify-between text-xs sm:text-sm font-semibold text-[#c4d1c0] mb-2 sm:mb-3">
                                <span>{label}</span>
                            
                                <span className="text-gradient-gold font-black drop-shadow-sm">{formatNumber(allocations[label] || 0)} Pts</span>
                            </div>
                            <input type="range" min="0" max="100" value={allocations[label] || 0} onChange={(e) => handleChange(label, parseInt(e.target.value))} className="w-full h-2.5 sm:h-3 bg-[#063127] border border-gold/20 rounded-full appearance-none cursor-pointer accent-gold shadow-inner" />
                        </div>
                    );
                })}
            </div>
            <Button onClick={() => onVote(proposal.id, allocations)} disabled={remaining !== 0} className="w-full mt-8 h-12 sm:h-14 text-sm sm:text-lg font-black bg-[#5b8370] border-gold/50 text-white hover:bg-transparent hover:text-white rounded-xl shadow-lg hover:border-gold transition-all hover:shadow-glow active:scale-95 relative z-10">
                {t('pioneer.budget_vote.confirm_allocation', 'Confirm Allocation')}
            </Button>
        </div>
    );
};

// ============================================================================
// NUEVO MÓDULO: RATING SCALE ESTRELLAS (1 TO 5)
// ============================================================================
const ScaleVote = ({ proposal, onVote, hasVoted }) => {
    const { t } = useTranslation();
    const [hoveredStar, setHoveredStar] = useState(0);
    
    if (hasVoted) {
        return (
            <div className="mt-6 space-y-4 p-5 sm:p-6 bg-[#063127] dark:bg-[#063127]/40 rounded-2xl sm:rounded-[2rem] border border-gold/30 shadow-inner">
                <h4 className="text-center font-black text-white text-xs sm:text-sm mb-5 sm:mb-6 uppercase tracking-wider">{t('pioneer.scale_vote.results', 'Rating Results')}</h4>
                {proposal.stats.map((s, i) => (
                    <div key={i} className="mb-2">
                        <div className="flex justify-between text-xs sm:text-sm font-bold text-[#c4d1c0] mb-1.5 sm:mb-2">
                            <span className="flex items-center gap-1">{s.label} <Star className="w-3 h-3 text-gold fill-gold" /></span>
                            <span className="text-gradient-gold drop-shadow-sm">{s.percent}%</span>
                        </div>
                        <Progress value={s.percent} className="h-2.5 sm:h-3 bg-[#063127] border border-gold/20 [&>div]:bg-gradient-gold rounded-full" />
                    </div>
                ))}
                <div className="mt-5 p-4 bg-gold/10 border border-gold/50 rounded-xl text-[#c4d1c0] text-center text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-gold"/> {t('pioneer.toasts.vote_success', 'Vote Submitted!')}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 flex flex-col items-center gap-6 p-6 sm:p-8 bg-[#063127] dark:bg-[#063127]/40 border border-gold/30 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gold/10 blur-[40px] rounded-full pointer-events-none"/>
            
            <h4 className="font-black text-white text-sm sm:text-lg flex items-center gap-2 relative z-10">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-gold fill-gold"/> {t('pioneer.scale_vote.prompt', 'Rate your level of agreement')}
            </h4>
            
            <div className="flex justify-center gap-1 sm:gap-2 relative z-10 w-full" onMouseLeave={() => setHoveredStar(0)}>
                {[1, 2, 3, 4, 5].map((rating) => {
                    const isHovered = hoveredStar >= rating;
                    return (
                        <button 
                            key={rating} 
                            onMouseEnter={() => setHoveredStar(rating)}
                            onClick={() => onVote(proposal.id, { choice: rating.toString() })} 
                            className={`relative p-1 sm:p-2 rounded-2xl transition-all duration-300 transform outline-none focus:outline-none ${isHovered ? 'scale-110 sm:scale-125 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'scale-100 hover:scale-110 opacity-70 hover:opacity-100'}`}
                        >
                            <Star 
                                className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-all duration-300 ${isHovered ? 'text-gold fill-gold' : 'text-gold/30 fill-transparent'}`} 
                                strokeWidth={isHovered ? 1.5 : 1}
                            />
                            {isHovered && (
                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-gold font-black text-xs sm:text-sm animate-in slide-in-from-bottom-2 fade-in">
                                    {rating}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="flex justify-between w-full max-w-[350px] text-[10px] sm:text-xs font-bold text-gold/60 uppercase tracking-widest relative z-10 mt-6">
                <span>{t('pioneer.scale_vote.lowest', 'Lowest')}</span>
                <span>{t('pioneer.scale_vote.highest', 'Highest')}</span>
            </div>
        </div>
    );
};

// ============================================================================
// MODULO 2: FORO DE DISCUSIÓN
// ============================================================================

const DiscussionThread = ({ proposalId, currentUserId }) => {
    const { t } = useTranslation();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchComments = useCallback(async () => {
        const { data } = await supabase.from('proposal_comments')
            .select('*, profiles:user_id(name)')
            .eq('proposal_id', proposalId)
            .order('upvotes', { ascending: false })
            .order('created_at', { ascending: false });
        setComments(data || []);
        setLoading(false);
    }, [proposalId]);

    useEffect(() => {
        fetchComments();
        const sub = supabase.channel(`comments_${proposalId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_comments', filter: `proposal_id=eq.${proposalId}` }, fetchComments)
            .subscribe();
        return () => supabase.removeChannel(sub);
    }, [proposalId, fetchComments]);

    const handlePost = async () => {
        if (!newComment.trim()) return;
        const { error } = await supabase.from('proposal_comments').insert({ proposal_id: proposalId, user_id: currentUserId, content: newComment });
        if (!error) { setNewComment(""); fetchComments(); }
    };

    const handleVote = async (commentId, isUpvote) => {
        try {
            const val = isUpvote ? 1 : -1;
            const { error } = await supabase.from('comment_votes').insert({ comment_id: commentId, user_id: currentUserId, vote_value: val });
            if (error && error.code === '23505') {
                toast({ variant: "destructive", description: "You already voted on this comment." });
                return;
            }
            const comment = comments.find(c => c.id === commentId);
            const updateField = isUpvote ? { upvotes: comment.upvotes + 1 } : { downvotes: comment.downvotes + 1 };
            await supabase.from('proposal_comments').update(updateField).eq('id', commentId);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="mt-8 border-t-2 border-dashed border-gold/30 pt-6 sm:pt-8">
            <h4 className="font-black text-white flex items-center gap-2 mb-4 sm:mb-6 text-base sm:text-lg"><MessageSquare className="w-5 h-5 text-gold"/> {t('pioneer.discussion.title', 'Pioneer Discussion')}</h4>
            <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8 bg-[#063127] dark:bg-[#063127]/30 p-3 sm:p-4 rounded-2xl border border-gold/30">
                <Textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder={t('pioneer.discussion.placeholder', 'Share your perspective...')} className="min-h-[50px] h-12 sm:h-14 resize-none rounded-xl bg-[#063127] dark:bg-[#063127]/50 border-gold/50 text-white placeholder:text-gold/50 focus-visible:ring-gold focus-visible:border-gold font-medium text-sm" />
                <Button onClick={handlePost} disabled={!newComment.trim()} className="bg-[#5b8370] hover:bg-transparent text-white hover:text-white border border-transparent hover:border-gold rounded-xl h-12 sm:h-14 px-6 font-bold shadow-md hover:shadow-glow w-full sm:w-auto transition-all">{t('pioneer.discussion.post_btn', 'Post')}</Button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 sm:pr-2">
                {loading ? <Loader2 className="animate-spin mx-auto w-6 h-6 text-gold my-10"/> : comments.length === 0 ? <p className="text-xs sm:text-sm font-medium text-center text-gold my-8 sm:my-10 bg-[#063127] dark:bg-[#063127]/30 py-6 sm:py-8 rounded-2xl border border-dashed border-gold/30">{t('pioneer.discussion.first_to_share', 'Be the first to share an opinion.')}</p> : 
                    comments.map(c => (
                        <div key={c.id} className="bg-[#063127] dark:bg-[#063127]/40 p-4 sm:p-5 rounded-2xl border border-gold/20 flex gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col items-center gap-1.5 shrink-0 bg-[#063127] dark:bg-[#063127]/60 px-2 py-2 sm:py-3 rounded-xl border border-gold/20">
                                <button onClick={()=>handleVote(c.id, true)} className="text-[#c4d1c0] hover:text-gold p-1 rounded-md transition-colors"><ThumbsUp className="w-4 h-4"/></button>
                            
                                <span className="text-xs sm:text-sm font-black text-white">{formatNumber(c.upvotes - c.downvotes)}</span>
                                <button onClick={()=>handleVote(c.id, false)} className="text-[#c4d1c0] hover:text-red-500 p-1 rounded-md transition-colors"><ThumbsDown className="w-4 h-4"/></button>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                    <Badge className="text-[9px] sm:text-xs bg-[#063127] dark:bg-gold/20 text-gold border-0 font-bold px-2 py-0.5 truncate max-w-[150px] sm:max-w-none">{c.profiles?.name || 'Anonymous'}</Badge>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gold/70">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-[#c4d1c0] font-medium leading-relaxed break-words">{c.content}</p>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

// --- TIMELINE ITEM ---
const TimelineItem = ({ status, title, date, desc, percentage }) => (
    <div className="relative pl-6 sm:pl-8 pb-6 sm:pb-8 group">
        <div className={`absolute -left-[14px] sm:-left-[18px] top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-4 z-10 bg-[#063127] ${status === 'completed' ? 'border-gold text-gold' : status === 'current' ? 'border-gold text-gold shadow-glow' : 'border-[#063127] text-[#5b8370]'}`}>
            {status === 'completed' ? <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4"/> : <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${status === 'current' ? 'bg-gold animate-pulse' : 'bg-[#5b8370]'}`}/>}
        </div>
        <div className={`bg-[#063127] dark:bg-[#063127]/40 p-4 sm:p-6 rounded-2xl border shadow-sm group-hover:shadow-md transition-all ${status === 'current' ? 'border-gold/50 shadow-glow' : 'border-gold/20'}`}>
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 sm:px-3 py-1 rounded-full ${status === 'completed' ? 'bg-gold text-[#063127]' : status === 'current' ? 'bg-gradient-gold shadow-glow text-[#063127] border border-white/20' : 'bg-[#063127] border border-[#5b8370] text-[#5b8370]'}`}>{date}</span>
            <h4 className="text-lg sm:text-xl font-black mt-2 sm:mt-3 text-white leading-tight">{title}</h4>
            <p className="text-xs sm:text-sm text-[#c4d1c0] mt-1.5 sm:mt-2 mb-3 sm:mb-4 font-medium leading-relaxed">{desc}</p>
            {percentage > 0 && <div className="flex items-center gap-2 sm:gap-3"><Progress value={percentage} className="h-1.5 sm:h-2 w-full bg-[#063127] border border-gold/30 [&>div]:bg-gradient-gold rounded-full" /> <span className="text-[10px] sm:text-xs font-black text-white">{percentage}%</span></div>}
        </div>
    </div>
);

const FoundingMembersSection = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('governance');
  const [loading, setLoading] = useState(true);
  
  const [proposals, setProposals] = useState([]);
  const [news, setNews] = useState([]);
  const [roadmap, setRoadmap] = useState([]);
  const [userVotes, setUserVotes] = useState(new Set()); 
  const [accessStatus, setAccessStatus] = useState(null);
  const [liveActivity, setLiveActivity] = useState([]);

  const [openApplyModal, setOpenApplyModal] = useState(false);
  const [applicationReason, setApplicationReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const fetchData = useCallback(async (isSilent = false) => {
    try {
        if (!isSilent) setLoading(true);
        const lang = i18n.language ? i18n.language.split('-')[0] : 'en';

        const { data: propsData } = await supabase.from('proposals').select(`*, proposal_translations(language_code, title, description), votes(user_id, vote, vote_data)`).eq('status', 'active').order('created_at', { ascending: false });
        const { data: newsData } = await supabase.from('news_items').select(`*, news_translations(language_code, title, description)`).eq('is_active', true).order('publish_date', { ascending: false });
        const { data: roadmapData } = await supabase.from('roadmap_items').select(`*, roadmap_translations(language_code, title, description, date_display)`).order('display_order', { ascending: true });

        const getTrans = (translations, fallback) => {
            const tr = translations?.find(tx => tx.language_code === lang);
            return { title: tr?.title || fallback.title, description: tr?.description || fallback.description, date_display: tr?.date_display || fallback.date_display };
        };

        if (propsData) {
            const processedProps = propsData.map(p => {
                const total = p.votes.length;
                const opts = Array.isArray(p.options) 
                    ? p.options.map(o => typeof o === 'object' ? (o.label || 'Unnamed') : o) 
                    : ['Option A', 'Option B'];
                let statsArray = [];

                if (p.vote_type === 'budget') {
                    const sums = {}; opts.forEach(o => sums[o] = 0);
                    p.votes.forEach(v => { const alloc = v.vote_data || {}; Object.keys(alloc).forEach(k => { if(sums[k]!==undefined) sums[k]+=alloc[k]; }); });
                    const totalAlloc = Object.values(sums).reduce((a,b)=>a+b, 0);
                    statsArray = opts.map(opt => ({ label: opt, percent: totalAlloc === 0 ? 0 : Math.round((sums[opt]/totalAlloc)*100) }));
                } else {
                    statsArray = opts.map(optLabel => {
                        const count = p.votes.filter(v => v.vote === optLabel || v.vote_data?.choice === optLabel).length;
                        return { label: optLabel, percent: total === 0 ? 0 : Math.round((count / total) * 100) };
                    });
                }
                
                if(p.votes.some(v => v.user_id === user?.id)) setUserVotes(prev => new Set(prev).add(p.id));

                return { ...p, ...getTrans(p.proposal_translations, p), stats: statsArray, totalVotes: total };
            });
            setProposals(processedProps);
        }

        if (newsData) setNews(newsData.map(n => ({ ...n, ...getTrans(n.news_translations, n) })));
        if (roadmapData) setRoadmap(roadmapData.map(r => ({ ...r, ...getTrans(r.roadmap_translations, r) })));

    } catch (e) { console.error("Error fetching community data:", e); } finally { if (!isSilent) setLoading(false); }
  }, [i18n.language, user?.id]);

  useEffect(() => {
     if (!user) return;
     
     const checkStatus = async () => {
        const { data } = await supabase.from('founding_pioneer_metrics').select('founding_pioneer_access_status').eq('user_id', user.id).maybeSingle();
        setAccessStatus(data?.founding_pioneer_access_status?.toLowerCase());
        
        if (profile?.role === 'admin' || data?.founding_pioneer_access_status === 'approved') {
            fetchData(false);
        } else {
            setLoading(false);
        }
     };
     checkStatus();

     const statusChannel = supabase.channel(`pioneer_status_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
          const newStatus = payload.new?.founding_pioneer_access_status?.toLowerCase();
          if (newStatus) {
             setAccessStatus(newStatus);
             if (newStatus === 'approved') {
                toast({ title: t('pioneer.toasts.access_granted_title', 'Access Granted!'), description: t('pioneer.toasts.access_granted_desc', 'Welcome to the Pioneer Lounge.') });
                fetchData(false);
             }
          }
        }
      ).subscribe();

      const contentChannel = supabase.channel('community_content_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'news_items' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_items' }, () => fetchData(true))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, () => {
            setLiveActivity(prev => [{ id: Date.now(), msg: t('pioneer.new_vote_cast', 'A Pioneer just cast a vote!') }, ...prev].slice(0, 5));
            fetchData(true);
        }) 
        .subscribe();

    return () => {
        supabase.removeChannel(statusChannel);
        supabase.removeChannel(contentChannel);
    };
  }, [user, profile?.role, fetchData, t, toast]);

  const handleVote = async (proposalId, voteData) => {
      try {
          const payload = { 
              user_id: user.id, 
              proposal_id: proposalId, 
              vote: voteData.choice || 'complex_vote',
              vote_data: voteData 
          };
          
          const { error } = await supabase.from('votes').insert(payload);
          if (error) throw error;
          
          setUserVotes(prev => new Set(prev).add(proposalId));
          await fetchData(true);
          
          toast({ 
              title: t('pioneer.toasts.vote_success', 'Vote Confirmed! 🎉'), 
              description: t('pioneer.toasts.vote_thanks', 'Your impact has been recorded.'),
              className: "bg-[#063127] text-white border-none"
          });

      } catch (e) {
          toast({ variant: "destructive", title: t('common.error'), description: e.message });
      }
  };

  const handleApplySubmit = async () => {
    if (!applicationReason.trim()) return;
    setIsSubmitting(true);
    try {
        await supabase.from('admin_notifications').insert({
            user_id: user.id,
            type: 'pioneer_request',
            title: "Pioneer Application",
            message: `User ${profile?.email} requests access. Reason: "${applicationReason}"`,
            status: 'unread'
        });
        
        await supabase.from('founding_pioneer_metrics').upsert({ user_id: user.id, founding_pioneer_access_status: 'pending' }, { onConflict: 'user_id' });
        
        setAccessStatus('pending');
        setOpenApplyModal(false);
        toast({ title: t('common.success'), description: t('pioneer.restricted.pending_msg') });
    } catch (err) {
        toast({ variant: "destructive", title: t('common.error'), description: "Error sending request." });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-12 h-12 text-gold"/></div>;

  // ==================================================================================
  // VISTA BLOQUEADA PARA USUARIOS NO APROBADOS
  // ==================================================================================
  if (!isAdmin && accessStatus !== 'approved') {
      const isPending = accessStatus === 'pending';
      const isRejected = accessStatus === 'rejected' || accessStatus === 'revoked';

      if (isPending || isRejected) {
          return (
            <div className="w-full flex flex-col items-center justify-center py-8 sm:py-16 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-700 space-y-6 sm:space-y-8">
                <FoundingPioneerNotification status={accessStatus} className="w-full max-w-2xl shadow-lg border-l-4" />
                <motion.div 
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`relative w-full max-w-5xl overflow-hidden rounded-[2rem] sm:rounded-3xl shadow-2xl border ${isPending ? 'bg-gradient-to-br from-[#063127] to-[#144738] border-gold/30' : 'bg-gradient-to-br from-[#5b8370] to-[#063127] border-red-900/30'}`}
                >
                    <div className="absolute top-0 right-0 -mt-10 sm:-mt-20 -mr-10 sm:-mr-20 w-64 sm:w-96 h-64 sm:h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 sm:-mb-20 -ml-10 sm:-ml-20 w-48 sm:w-72 h-48 sm:h-72 bg-black/40 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center p-8 sm:p-10 md:p-16 gap-8 sm:gap-12">
                        <div className="flex-shrink-0 relative group">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border border-gold/20 border-dashed" />
                            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 bg-black/20 rounded-full border-2 border-gold/40 flex items-center justify-center backdrop-blur-md relative z-10 shadow-glow">
                                {isPending ? <Hourglass className="w-16 h-16 sm:w-20 sm:h-20 text-gold drop-shadow-md" /> : <Lock className="w-16 h-16 sm:w-20 sm:h-20 text-red-300 drop-shadow-md" />}
                            </motion.div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4 sm:space-y-6 text-white w-full">
                            <div>
                                <Badge className={`mb-3 sm:mb-4 px-3 py-1 text-[10px] sm:text-xs border-0 backdrop-blur-md ${isPending ? 'bg-gold/20 text-gold' : 'bg-red-500/20 text-red-200'}`}>
                                    {isPending ? t('pioneer.restricted.pending', 'Pending Review') : t('pioneer.restricted.rejected', 'Application Rejected')}
                                </Badge>
                                <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight drop-shadow-sm text-[#c4d1c0] break-words">
                                    {isPending ? t('pioneer.restricted.review_title', 'Application Under Review') : t('pioneer.restricted.access_denied', 'Access Denied')}
                                </h2>
                            </div>
                            <p className="text-base sm:text-lg md:text-xl text-white/70 font-light leading-relaxed max-w-2xl mx-auto md:mx-0 px-2 sm:px-0">
                                {isPending ? t('pioneer.restricted.pending_msg', 'We are reviewing your profile carefully.') : t('pioneer.restricted.rejected_msg', 'Your application was not approved.')}
                            </p>
                            <div className="pt-2 sm:pt-4 flex flex-col md:items-start items-center w-full">
                                <Button onClick={() => setOpenApplyModal(true)} className="w-full sm:w-auto group relative overflow-hidden bg-gold text-[#063127] hover:bg-[#c4d1c0] font-bold text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-glow border-none">
                                    <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                                        <Edit className="w-4 h-4 sm:w-5 sm:h-5" /> {isPending ? t('pioneer.restricted.update_btn', 'Update Application') : t('pioneer.restricted.contact_btn', 'Re-Apply')}
                                    </span>
                                </Button>
                                {isPending && <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-gold uppercase tracking-[0.1em] font-bold flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Processing by Admin Team</p>}
                            </div>
                        </div>
                    </div>
                </motion.div>
                <ApplicationModal open={openApplyModal} onOpenChange={setOpenApplyModal} reason={applicationReason} setReason={setApplicationReason} onSubmit={handleApplySubmit} isSubmitting={isSubmitting} />
            </div>
          );
      }

      return (
        <div className="min-h-[80vh] flex flex-col justify-center animate-in fade-in duration-700 p-4">
            <FoundingPioneerLockedSection onApply={() => setOpenApplyModal(true)} />
            <ApplicationModal open={openApplyModal} onOpenChange={setOpenApplyModal} reason={applicationReason} setReason={setApplicationReason} onSubmit={handleApplySubmit} isSubmitting={isSubmitting} />
        </div>
      );
  }

  // ==================================================================================
  // VISTA APROBADA
  // ==================================================================================
  return (
    <div className="space-y-6 sm:space-y-8 pb-16 sm:pb-20 max-w-7xl mx-auto px-4 sm:px-6">
      {/* HEADER GAMIFICADO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl sm:rounded-[3rem] bg-gradient-to-br from-[#063127] via-[#124f3c] to-[#063127] p-5 sm:p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border border-gold/30">
         <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gold/20 blur-[60px] sm:blur-[100px] rounded-full pointer-events-none" />
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8">
            <div className="flex-1 w-full">
                <Badge className="bg-gradient-gold text-[#063127] border-none font-black mb-3 sm:mb-4 shadow-glow uppercase tracking-widest px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs">{t('pioneer.header.badge')}</Badge>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 text-[#c4d1c0] tracking-tight drop-shadow-md leading-tight">{t('pioneer.header.title', 'Shape the Future.')}</h1>
                <p className="text-white/80 text-sm sm:text-lg max-w-xl leading-relaxed">{t('pioneer.header.subtitle', 'Your voice holds weight. Participate in gamified governance, track the roadmap, and connect with fellow founders.')}</p>
            </div>
            
            {/* Ticker de Actividad en Vivo */}
            <div className="w-full lg:w-72 bg-[#063127] dark:bg-[#063127]/40 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gold/30 shadow-inner shrink-0">
                <h4 className="text-[10px] sm:text-xs font-bold text-gold uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse text-gold" /> {t('pioneer.live_activity.title')}
                </h4>
                <div className="space-y-2 sm:space-y-3 h-20 sm:h-24 overflow-hidden relative">
                    <AnimatePresence>
                        {liveActivity.length === 0 ? <p className="text-xs sm:text-sm text-gold/70 italic font-medium">{t('pioneer.live_activity.no_signals')}</p> : 
                            liveActivity.map((act) => (
                                <motion.div key={act.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[10px] sm:text-xs font-bold text-white bg-[#063127] dark:bg-gold/10 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-gold/30 shadow-sm backdrop-blur-sm truncate">
                                    {act.msg}
                                </motion.div>
                            ))
                        }
                    </AnimatePresence>
                </div>
            </div>
         </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 snap-x snap-mandatory hide-scrollbar">
            <TabsList className="flex sm:grid w-full min-w-max sm:min-w-full grid-cols-3 h-auto min-h-[3.5rem] sm:min-h-16 bg-[#063127] dark:bg-[#063127]/40 backdrop-blur-md border border-gold/30 rounded-2xl sm:rounded-3xl sm:mb-10 p-1.5 shadow-sm gap-2">
                <TabsTrigger value="governance" className="flex-1 shrink-0 snap-center rounded-xl sm:rounded-2xl gap-2 font-bold text-sm h-full px-4 sm:px-2 data-[state=active]:bg-[#063127] data-[state=active]:border data-[state=active]:border-gold data-[state=active]:text-gold text-[#c4d1c0] hover:text-white transition-all whitespace-nowrap">
                    <Vote className="w-4 h-4 sm:w-5 sm:h-5 text-gold"/> <span className="hidden sm:inline">{t('pioneer.tabs.governance')}</span><span className="sm:hidden">Votes</span>
                </TabsTrigger>
                <TabsTrigger value="news" className="flex-1 shrink-0 snap-center rounded-xl sm:rounded-2xl gap-2 font-bold text-sm h-full px-4 sm:px-2 data-[state=active]:bg-[#063127] data-[state=active]:border data-[state=active]:border-gold data-[state=active]:text-gold text-[#c4d1c0] hover:text-white transition-all whitespace-nowrap">
                    <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-gold"/> {t('pioneer.tabs.news')}
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="flex-1 shrink-0 snap-center rounded-xl sm:rounded-2xl gap-2 font-bold text-sm h-full px-4 sm:px-2 data-[state=active]:bg-[#063127] data-[state=active]:border data-[state=active]:border-gold data-[state=active]:text-gold text-[#c4d1c0] hover:text-white transition-all whitespace-nowrap">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gold"/> {t('pioneer.tabs.roadmap')}
                </TabsTrigger>
            </TabsList>
        </div>

        <AnimatePresence mode="wait">
            <TabsContent key={activeTab} value={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 sm:mt-0">
                
                {/* 1. GOVERNANCE (GAMIFICADO) */}
                {activeTab === 'governance' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
                        {proposals.length === 0 && <div className="col-span-2 text-center font-bold text-gold py-16 sm:py-24 border-2 border-dashed border-gold/30 rounded-3xl sm:rounded-[2.5rem] bg-[#063127] dark:bg-[#063127]/20 px-4">{t('pioneer.governance.no_active', 'No active decisions at this moment.')}</div>}
                        {proposals.map(prop => {
                            const hasVoted = userVotes.has(prop.id);
                            return (
                                <Card key={prop.id} className={`group border border-gold/30 bg-[#063127] dark:bg-[#063127]/40 backdrop-blur-md overflow-hidden shadow-xl transition-all duration-500 rounded-3xl sm:rounded-[2.5rem] ${hasVoted ? 'ring-2 ring-gold/40' : 'hover:shadow-2xl hover:border-gold/80 hover:-translate-y-1 sm:hover:-translate-y-2'}`}>
                                    {prop.image_url && (
                                        <div className="h-40 sm:h-48 md:h-56 w-full overflow-hidden relative rounded-t-3xl sm:rounded-t-[2.5rem]">
                                            <img src={prop.image_url} alt={prop.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#063127]/90 via-[#063127]/40 to-transparent" />
                                            <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-6 right-4 sm:right-6 flex justify-between items-end gap-2">
                                                <Badge className="bg-gradient-gold shadow-glow text-[#063127] font-black border-0 uppercase tracking-widest text-[9px] sm:text-[10px] px-2 sm:px-3 py-1 sm:py-1.5 animate-pulse shrink-0">{t('pioneer.badges.live_voting', 'Live Decision')}</Badge>
                                                <div className="flex items-center gap-1.5 sm:gap-2 text-white font-black text-xs sm:text-sm bg-[#063127]/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-md border border-gold/50 shadow-lg shrink-0">
                                                    
                                                    <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gold"/> {formatNumber(prop.totalVotes)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <CardContent className="p-5 sm:p-8 md:p-10">
                                        {!prop.image_url && <Badge className="bg-gold/20 text-gold border border-gold/50 mb-3 sm:mb-4 px-2 sm:px-3 py-1 font-black text-[10px] sm:text-xs uppercase">{t('pioneer.badges.live_voting', 'Live Decision')}</Badge>}
                                        <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 tracking-tight leading-tight">{prop.title}</h3>
                                        <p className="text-[#c4d1c0] text-sm sm:text-base font-medium leading-relaxed mb-4 sm:mb-6">{prop.description}</p>

                                        {prop.vote_type === 'comparative' && <ComparativeVote proposal={prop} onVote={handleVote} hasVoted={hasVoted} />}
                                        {prop.vote_type === 'budget' && <BudgetVote proposal={prop} onVote={handleVote} hasVoted={hasVoted} />}
                                        {prop.vote_type === 'scale_5' && <ScaleVote proposal={prop} onVote={handleVote} hasVoted={hasVoted} />}
                                        {(!prop.vote_type || prop.vote_type === 'classic' || prop.vote_type === 'simple') && <ClassicVote proposal={prop} onVote={handleVote} hasVoted={hasVoted} />}

                                        {hasVoted && <DiscussionThread proposalId={prop.id} currentUserId={user.id} />}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* 2. NEWS */}
                {activeTab === 'news' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
                        {news.length === 0 && <div className="col-span-full text-center font-bold text-gold py-16 sm:py-24 border-2 border-dashed border-gold/30 rounded-3xl sm:rounded-[2.5rem] bg-[#063127] dark:bg-[#063127]/20 px-4">{t('pioneer.news.no_news')}</div>}
                        {news.map((item, idx) => (
                             <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className={idx === 0 ? "md:col-span-2" : ""}>
                                <Card className="overflow-hidden border border-gold/30 shadow-xl group cursor-pointer h-full relative rounded-3xl sm:rounded-[2.5rem] min-h-[250px] sm:min-h-[350px] hover:shadow-glow hover:border-gold/80 transition-all duration-500">
                                    <img src={item.image_url || "https://via.placeholder.com/800x600"} alt="News" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700 rounded-3xl sm:rounded-[2.5rem]"/>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#063127] via-[#063127]/60 to-transparent rounded-3xl sm:rounded-[2.5rem]"/>
                                    <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-8 md:p-10 text-white">
                                        <Badge className="w-fit mb-2 sm:mb-3 bg-gradient-gold shadow-glow border border-white/20 text-[#063127] font-black px-2 sm:px-3 py-1 uppercase tracking-widest text-[9px] sm:text-[10px]">{item.category}</Badge>
                                        <h3 className={`${idx === 0 ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-xl sm:text-2xl'} font-black mb-2 sm:mb-3 text-[#c4d1c0] tracking-tight leading-tight drop-shadow-md`}>{item.title}</h3>
                                        <p className="text-white/80 font-medium text-sm sm:text-base line-clamp-2 md:line-clamp-3 leading-relaxed">{item.description}</p>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* 3. ROADMAP */}
                {activeTab === 'roadmap' && (
                    <div className="space-y-8 sm:space-y-10 pl-4 sm:pl-6 md:pl-8 border-l-[3px] sm:border-l-4 border-gold/30 ml-3 sm:ml-4 md:ml-8 py-4 sm:py-6 relative">
                        <div className="absolute top-0 -left-[13px] sm:-left-[14px] w-5 h-5 sm:w-6 sm:h-6 bg-gradient-gold shadow-glow border border-white/20 rounded-full flex items-center justify-center"><Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#063127] fill-[#063127]"/></div>
                        {roadmap.length === 0 && <div className="text-center font-bold text-gold py-16 sm:py-24 border-2 border-dashed border-gold/30 rounded-3xl sm:rounded-[2.5rem] bg-[#063127] dark:bg-[#063127]/20 ml-4 sm:ml-8 px-4">{t('pioneer.roadmap.no_roadmap')}</div>}
                        {roadmap.map((item) => (
                            <TimelineItem 
                                key={item.id}
                                status={item.status} 
                                title={item.title} 
                                date={item.date_display} 
                                desc={item.description}
                                percentage={item.completion_percentage}
                            />
                        ))}
                    </div>
                )}

            </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

export default FoundingMembersSection;