import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Newspaper, TrendingUp, Clock, CheckCircle2, Loader2, Lock, Edit, Send, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';

// Componentes de UI
import FoundingPioneerNotification from '@/components/ui/FoundingPioneerNotification';
import FoundingPioneerLockedSection from '@/components/ui/FoundingPioneerLockedSection';

// --- MODAL DE APLICACIÓN ---
const ApplicationModal = ({ open, onOpenChange, reason, setReason, onSubmit, isSubmitting }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                        <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    {t('founding_pioneer.locked_section.cta_button', 'Apply to become a Pioneer')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 pt-2">
                    {t('pioneer.restricted.pending_msg', 'Please explain why you want to join.')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="I want to join because..."
                    className="min-h-[120px] bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-slate-100">{t('common.cancel')}</Button>
                <Button onClick={onSubmit} disabled={isSubmitting || !reason.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {t('common.submit')}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
};

// --- COMPONENTE PRINCIPAL ---
const FoundingMembersSection = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('governance');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [proposals, setProposals] = useState([]);
  const [news, setNews] = useState([]);
  const [roadmap, setRoadmap] = useState([]);
  const [userVotes, setUserVotes] = useState(new Set()); 
  const [accessStatus, setAccessStatus] = useState(null);

  // Application State
  const [openApplyModal, setOpenApplyModal] = useState(false);
  const [applicationReason, setApplicationReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // 1. FETCH DYNAMIC CONTENT (Definido antes para ser dependencia)
  const fetchData = useCallback(async (isSilent = false) => {
    try {
        if (!isSilent) setLoading(true);
        const lang = i18n.language ? i18n.language.split('-')[0] : 'en';

        // PROPOSALS
        const { data: propsData } = await supabase.from('proposals')
            .select(`*, proposal_translations(language_code, title, description), votes(user_id, vote)`)
            .eq('status', 'active');
        
        // NEWS
        const { data: newsData } = await supabase.from('news_items')
            .select(`*, news_translations(language_code, title, description)`)
            .eq('is_active', true)
            .order('publish_date', { ascending: false });

        // ROADMAP
        const { data: roadmapData } = await supabase.from('roadmap_items')
            .select(`*, roadmap_translations(language_code, title, description, date_display)`)
            .order('display_order', { ascending: true });

        // HELPER TRADUCCIÓN
        const getTrans = (translations, fallback) => {
            const tr = translations?.find(t => t.language_code === lang);
            return {
                title: tr?.title || fallback.title,
                description: tr?.description || fallback.description,
                date_display: tr?.date_display || fallback.date_display
            };
        };

        if (propsData) {
            const processedProps = propsData.map(p => {
                // Cálculo dinámico de porcentajes para N opciones
                const total = p.votes.length;
                const opts = Array.isArray(p.options) ? p.options : ['Option A', 'Option B']; // Fallback
                
                // Creamos el array de stats dinámico
                const statsArray = opts.map(optLabel => {
                    const count = p.votes.filter(v => v.vote === optLabel).length;
                    const percent = total === 0 ? 0 : Math.round((count / total) * 100);
                    return { label: optLabel, percent };
                });
                
                if(p.votes.some(v => v.user_id === user?.id)) setUserVotes(prev => new Set(prev).add(p.id));

                return { 
                    ...p, 
                    ...getTrans(p.proposal_translations, p), 
                    stats: statsArray // Ahora stats es un array, no percentA/B
                };
            });
            setProposals(processedProps);
        }

        if (newsData) {
            setNews(newsData.map(n => ({ ...n, ...getTrans(n.news_translations, n) })));
        }

        if (roadmapData) {
            setRoadmap(roadmapData.map(r => ({ ...r, ...getTrans(r.roadmap_translations, r) })));
        }

    } catch (e) {
        console.error("Error fetching community data:", e);
    } finally {
        if (!isSilent) setLoading(false);
    }
  }, [i18n.language, user?.id]);

  // 2. CHECK ACCESS STATUS & REALTIME SUSCRIPTIONS
  useEffect(() => {
     if (!user) return;
     
     // Carga inicial de estado
     const checkStatus = async () => {
        const { data } = await supabase.from('founding_pioneer_metrics').select('founding_pioneer_access_status').eq('user_id', user.id).maybeSingle();
        setAccessStatus(data?.founding_pioneer_access_status?.toLowerCase());
        
        // Si ya está aprobado o es admin, cargamos contenido inicial
        if (profile?.role === 'admin' || data?.founding_pioneer_access_status === 'approved') {
            fetchData(false); // Carga con spinner
        } else {
            setLoading(false);
        }
     };
     checkStatus();

     // --- CANALES REALTIME ---
     const statusChannel = supabase.channel(`pioneer_status_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
          const newStatus = payload.new?.founding_pioneer_access_status?.toLowerCase();
          if (newStatus) {
             setAccessStatus(newStatus);
             if (newStatus === 'approved') {
                toast({ title: t('pioneer.toasts.access_granted_title'), description: t('pioneer.toasts.access_granted_desc') });
                fetchData(false);
             }
          }
        }
      ).subscribe();

      // Escuchar cambios de CONTENIDO (Noticias, Votos, Roadmap)
      const contentChannel = supabase.channel('community_content_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'news_items' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'roadmap_items' }, () => fetchData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => fetchData(true)) 
        .subscribe();

    return () => {
        supabase.removeChannel(statusChannel);
        supabase.removeChannel(contentChannel);
    };
  }, [user, profile?.role, fetchData, t, toast]);

  // Carga inicial de datos si ya está aprobado
  useEffect(() => {
      if (user && (isAdmin || accessStatus === 'approved')) {
          fetchData();
      }
  }, [fetchData, user, isAdmin, accessStatus]);

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

  const handleVote = async (proposalId, option) => {
      try {
          const { error } = await supabase.from('votes').insert({ user_id: user.id, proposal_id: proposalId, vote: option });
          if (error) throw error;
          
          toast({ title: t('pioneer.toasts.vote_success') });
          setUserVotes(prev => new Set(prev).add(proposalId));
          // No llamamos a fetchData() aquí porque el Realtime lo hará automáticamente
      } catch (e) {
          toast({ variant: "destructive", title: "Error", description: e.message });
      }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-emerald-500"/></div>;

  // ==================================================================================
  // VISTA BLOQUEADA - ESTILO PREMIUM
  // ==================================================================================
  if (!isAdmin && accessStatus !== 'approved') {
      
      const isPending = accessStatus === 'pending';
      const isRejected = accessStatus === 'rejected';

      if (isPending || isRejected) {
          return (
            <div className="w-full flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in duration-700 space-y-8">
                
                <FoundingPioneerNotification status={accessStatus} className="w-full max-w-2xl shadow-lg border-l-4" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`relative w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl border border-white/20 ${
                        isPending 
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-800' 
                            : 'bg-gradient-to-br from-red-700 to-rose-900'
                    }`}
                >
                    {/* --- Background Effects --- */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-black/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center p-10 md:p-16 gap-12">
                        
                        {/* --- Animated Icon --- */}
                        <div className="flex-shrink-0 relative group">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-full border border-white/20 border-dashed"
                            />
                            
                            <motion.div 
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-40 h-40 md:w-48 md:h-48 bg-white/10 rounded-full border-2 border-white/30 flex items-center justify-center backdrop-blur-md relative z-10 shadow-2xl"
                            >
                                {isPending ? (
                                    <Hourglass className="w-20 h-20 text-amber-200 drop-shadow-md" />
                                ) : (
                                    <Lock className="w-20 h-20 text-red-200 drop-shadow-md" />
                                )}
                            </motion.div>
                        </div>

                        {/* --- Content --- */}
                        <div className="flex-1 text-center md:text-left space-y-6 text-white">
                            <div>
                                <Badge className={`mb-4 px-3 py-1 text-xs border-0 backdrop-blur-md ${isPending ? 'bg-amber-400/20 text-amber-100' : 'bg-red-400/20 text-red-100'}`}>
                                    {isPending ? t('pioneer.restricted.pending', 'Pending Review') : t('pioneer.restricted.rejected', 'Application Rejected')}
                                </Badge>
                                
                                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight drop-shadow-sm">
                                    {isPending ? t('pioneer.restricted.review_title', 'Application Under Review') : "Access Denied"}
                                </h2>
                            </div>
                            
                            <p className="text-lg md:text-xl text-white/80 font-light leading-relaxed max-w-2xl mx-auto md:mx-0">
                                {isPending 
                                    ? t('pioneer.restricted.pending_msg', 'We are reviewing your profile carefully.') 
                                    : t('pioneer.restricted.rejected_msg', 'Your application was not approved.')
                                }
                            </p>

                            <div className="pt-4 flex flex-col md:items-start items-center">
                                <Button 
                                    onClick={() => setOpenApplyModal(true)}
                                    className="group relative overflow-hidden bg-white text-slate-900 hover:bg-slate-100 font-bold text-lg px-10 py-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        <Edit className="w-5 h-5 text-slate-600" />
                                        {isPending ? t('pioneer.restricted.update_btn', 'Update Application') : t('pioneer.restricted.contact_btn', 'Re-Apply')}
                                    </span>
                                </Button>
                                
                                {isPending && (
                                    <p className="mt-4 text-xs text-white/50 uppercase tracking-[0.1em] font-medium flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin"/> Processing by Admin Team
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <ApplicationModal 
                    open={openApplyModal} 
                    onOpenChange={setOpenApplyModal}
                    reason={applicationReason}
                    setReason={setApplicationReason}
                    onSubmit={handleApplySubmit}
                    isSubmitting={isSubmitting}
                />
            </div>
          );
      }

      // CASO 2: NUNCA APLICÓ
      return (
        <div className="min-h-[80vh] flex flex-col justify-center animate-in fade-in duration-700">
            <FoundingPioneerLockedSection onApply={() => setOpenApplyModal(true)} />
            <ApplicationModal 
                open={openApplyModal} 
                onOpenChange={setOpenApplyModal}
                reason={applicationReason}
                setReason={setApplicationReason}
                onSubmit={handleApplySubmit}
                isSubmitting={isSubmitting}
            />
        </div>
      );
  }

  // ==================================================================================
  // VISTA APROBADA (CONTENIDO REAL)
  // ==================================================================================
  return (
    <div className="space-y-8 pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2.5rem] bg-gradient-to-r from-[#064e3b] to-[#111827] p-10 text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10">
            <Badge className="bg-amber-400 text-amber-950 mb-4">{t('pioneer.header.badge')}</Badge>
            <h1 className="text-4xl font-black mb-4">{t('pioneer.header.title')}</h1>
            <p className="text-emerald-100/80 max-w-2xl">{t('pioneer.header.subtitle')}</p>
         </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-16 bg-white dark:bg-slate-950 border rounded-2xl mb-8 p-1">
          <TabsTrigger value="governance" className="rounded-xl gap-2 font-bold"><Vote className="w-5 h-5"/> {t('pioneer.tabs.governance')}</TabsTrigger>
          <TabsTrigger value="news" className="rounded-xl gap-2 font-bold"><Newspaper className="w-5 h-5"/> {t('pioneer.tabs.news')}</TabsTrigger>
          <TabsTrigger value="roadmap" className="rounded-xl gap-2 font-bold"><TrendingUp className="w-5 h-5"/> {t('pioneer.tabs.roadmap')}</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
            <TabsContent key={activeTab} value={activeTab} className="animate-in fade-in">
                
                {/* 1. GOVERNANCE */}
                {activeTab === 'governance' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {proposals.length === 0 && <div className="col-span-2 text-center text-slate-400 py-10 border-2 border-dashed rounded-xl">No active votes at this moment.</div>}
                        {proposals.map(prop => (
                            <VotingCard 
                                key={prop.id}
                                title={prop.title}
                                desc={prop.description}
                                date={new Date(prop.end_date).toLocaleDateString()}
                                status={prop.status}
                                image_url={prop.image_url} 
                                hasVoted={userVotes.has(prop.id)}
                                onVote={(optLabel) => handleVote(prop.id, optLabel)}
                                options={prop.stats} // Array de { label, percent }
                            />
                        ))}
                    </div>
                )}

                {/* 2. NEWS */}
                {activeTab === 'news' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {news.map((item, idx) => (
                             <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className={idx === 0 ? "md:col-span-2" : ""}>
                                <Card className="overflow-hidden border-0 shadow-lg group cursor-pointer h-full relative rounded-3xl min-h-[300px]">
                                    <img src={item.image_url || "https://via.placeholder.com/800x600"} alt="News" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"/>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"/>
                                    <div className="relative z-10 h-full flex flex-col justify-end p-8 text-white">
                                        <Badge className="w-fit mb-2 bg-blue-600 border-0">{item.category}</Badge>
                                        <h3 className={`${idx === 0 ? 'text-3xl' : 'text-xl'} font-bold mb-2`}>{item.title}</h3>
                                        <p className="text-slate-200 line-clamp-2">{item.description}</p>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                         {news.length === 0 && <p className="col-span-3 text-center text-slate-400">No news yet.</p>}
                    </div>
                )}

                {/* 3. ROADMAP */}
                {activeTab === 'roadmap' && (
                    <div className="space-y-12 pl-6 border-l-4 border-slate-100 ml-6 py-4">
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
                        {roadmap.length === 0 && <p className="text-slate-400 pl-4">Roadmap pending.</p>}
                    </div>
                )}
            </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

// --- SUBCOMPONENTS ---
const VotingCard = ({ title, desc, date, hasVoted, onVote, options, image_url }) => (
    <Card className="group hover:shadow-xl transition-all border-slate-200 bg-white overflow-hidden">
        {image_url && (
            <div className="h-40 w-full overflow-hidden">
                <img src={image_url} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
        )}
        <CardHeader>
            <div className="flex justify-between mb-2"><Badge className="bg-emerald-100 text-emerald-800">Live Voting</Badge> <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {date}</span></div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent>
            {options.map((o, i) => (
                <div key={i} className="mb-3">
                    <div className="flex justify-between text-sm mb-1 font-medium"><span>{o.label}</span><span>{o.percent}%</span></div>
                    <Progress value={o.percent} className="h-2" />
                </div>
            ))}
            
            {!hasVoted ? (
                <div className="grid grid-cols-2 gap-3 mt-6">
                    {options.map((o, i) => (
                         <Button 
                            key={i} 
                            onClick={() => onVote(o.label)} 
                            className="bg-slate-800 hover:bg-emerald-600 text-white transition-colors"
                         >
                            {o.label}
                         </Button>
                    ))}
                </div>
            ) : (
                <Button disabled className="w-full mt-4 bg-slate-100 text-slate-400">Vote Submitted</Button>
            )}
        </CardContent>
    </Card>
);

const TimelineItem = ({ status, title, date, desc, percentage }) => (
    <div className="relative pl-8 pb-8 group">
        <div className={`absolute -left-[39px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 z-10 bg-white ${status === 'completed' ? 'border-emerald-500 text-emerald-500' : status === 'current' ? 'border-blue-500 text-blue-500' : 'border-slate-300 text-slate-300'}`}>
            {status === 'completed' ? <CheckCircle2 className="w-4 h-4"/> : <div className={`w-3 h-3 rounded-full ${status === 'current' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}/>}
        </div>
        <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{date}</span>
            <h4 className="text-xl font-bold mt-2 text-slate-800">{title}</h4>
            <p className="text-slate-500 mt-1 mb-3">{desc}</p>
            {percentage > 0 && <div className="flex items-center gap-3"><Progress value={percentage} className="h-1.5 w-48" /> <span className="text-xs font-bold">{percentage}%</span></div>}
        </div>
    </div>
);

export default FoundingMembersSection;