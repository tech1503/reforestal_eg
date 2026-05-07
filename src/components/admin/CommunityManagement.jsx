import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Plus, Edit, Globe, Vote, Newspaper, TrendingUp, Image as ImageIcon, X, BarChart3, Eye, Users, Swords, PieChart, MessageSquare, ThumbsUp, ThumbsDown, Paperclip, Send, Sparkles, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const TABLE_CONFIG = {
    proposals: { table: 'proposal_translations', fk: 'proposal_id' },
    news: { table: 'news_translations', fk: 'news_id' },
    roadmap: { table: 'roadmap_translations', fk: 'roadmap_id' }
};

const ProposalVotesModal = ({ isOpen, onClose, proposal }) => {
    const { t } = useTranslation();
    const [votes, setVotes] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDetailedData = async () => {
            if (!proposal?.id || !isOpen) return;
            setLoading(true);
            const { data: vData } = await supabase.from('votes')
                .select(`id, vote, vote_data, created_at, profiles:user_id (name, email)`)
                .eq('proposal_id', proposal.id).order('created_at', { ascending: false });
            if (vData) setVotes(vData);

            const { data: cData } = await supabase.from('proposal_comments')
                .select(`id, content, upvotes, downvotes, created_at, profiles:user_id (name, email)`)
                .eq('proposal_id', proposal.id).order('upvotes', { ascending: false });
            if (cData) setComments(cData);

            setLoading(false);
        };
        fetchDetailedData();
    }, [proposal, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden border border-[#5b8370]/30 rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-[#063127] dark:text-[#c4d1c0]">
                        <Users className="w-5 h-5 text-amber-500 shrink-0"/>
                        <span className="truncate">Community Activity: {proposal?.title}</span>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="votes" className="flex-1 flex flex-col overflow-hidden mt-4">
                    <TabsList className="grid w-full grid-cols-2 bg-[#5b8370]/10 rounded-xl p-1">
                        <TabsTrigger value="votes" className="rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all"><Vote className="w-4 h-4 mr-2 hidden sm:block text-amber-500"/> {t('pioneer.tabs.governance', 'Votes')}</TabsTrigger>
                        <TabsTrigger value="comments" className="rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all"><MessageSquare className="w-4 h-4 mr-2 hidden sm:block text-amber-500"/> Feedback</TabsTrigger>
                    </TabsList>

                    <TabsContent value="votes" className="flex-1 overflow-auto border border-[#5b8370]/20 rounded-xl mt-2">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[400px]">
                                <TableHeader><TableRow className="bg-[#5b8370]/5 sticky top-0"><TableHead className="text-muted-foreground font-bold">Pioneer</TableHead><TableHead className="text-muted-foreground font-bold">Vote Details</TableHead><TableHead className="text-right text-muted-foreground font-bold">Date</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-amber-500"/></TableCell></TableRow> : votes.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t('admin.community.no_items', 'No votes yet.')}</TableCell></TableRow> : votes.map(v => (
                                        <TableRow key={v.id} className="hover:bg-[#5b8370]/5 transition-colors border-b border-[#5b8370]/10">
                                            <TableCell><div className="font-bold text-sm text-foreground">{v.profiles?.name || 'Unknown'}</div><div className="text-[10px] sm:text-xs text-muted-foreground">{v.profiles?.email}</div></TableCell>
                                            <TableCell>
                                                {proposal.vote_type === 'budget' ? (
                                                    <div className="text-xs space-y-1 text-foreground">
                                                        {Object.entries(v.vote_data || {}).map(([k, val]) => <div key={k}><span className="font-semibold text-[#5b8370]">{k}:</span> {val} BP</div>)}
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="bg-[#5b8370]/10 text-foreground border-[#5b8370]/30 font-bold">{v.vote_data?.choice || v.vote}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-[10px] sm:text-xs text-[#5b8370] font-medium">{format(new Date(v.created_at), 'PP p')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="comments" className="flex-1 overflow-auto border border-[#5b8370]/20 rounded-xl mt-2 p-2 sm:p-4 space-y-4 bg-[#5b8370]/5">
                         {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500"/></div> : comments.length === 0 ? <p className="text-center text-muted-foreground py-8">{t('admin.community.no_items', 'No comments yet.')}</p> : comments.map(c => (
                             <div key={c.id} className="bg-white dark:bg-[#063127]/20 p-3 sm:p-4 rounded-xl border border-[#5b8370]/20 shadow-sm">
                                 <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                                     <div>
                                         <span className="font-bold text-[#063127] dark:text-[#c4d1c0] text-xs sm:text-sm">{c.profiles?.name || 'Anonymous'}</span>
                                         <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">{format(new Date(c.created_at), 'PP p')}</span>
                                     </div>
                                     <div className="flex items-center gap-2 sm:gap-3 bg-[#5b8370]/10 px-2 py-1 rounded-lg border border-[#5b8370]/20 shrink-0">
                                         <span className="text-[10px] sm:text-xs font-bold text-[#5b8370] flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-amber-500"/> {c.upvotes}</span>
                                         <span className="text-[10px] sm:text-xs font-bold text-red-500 flex items-center gap-1"><ThumbsDown className="w-3 h-3 text-red-500"/> {c.downvotes}</span>
                                     </div>
                                 </div>
                                 <p className="text-[#063127]/80 dark:text-[#c4d1c0]/80 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{c.content}</p>
                             </div>
                         ))}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

const VotingAnalytics = ({ proposals }) => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        const { data: votes } = await supabase.from('votes').select('proposal_id, vote, vote_data');
        const newStats = {};
        
        proposals.forEach(prop => {
            const propVotes = votes?.filter(v => v.proposal_id === prop.id) || [];
            const total = propVotes.length;
            const options = Array.isArray(prop.options) 
                ? prop.options.map(o => typeof o === 'string' ? o : o.label) 
                : ['Option A', 'Option B'];
            let distribution = [];

            if (prop.vote_type === 'budget') {
                const sums = {}; options.forEach(opt => sums[opt] = 0);
                propVotes.forEach(v => {
                    const alloc = v.vote_data || {};
                    Object.keys(alloc).forEach(k => { if(sums[k] !== undefined) sums[k] += alloc[k]; });
                });
                const totalAllocated = Object.values(sums).reduce((a,b)=>a+b, 0);
                distribution = options.map(opt => ({ label: opt, count: sums[opt], percent: totalAllocated === 0 ? 0 : Math.round((sums[opt] / totalAllocated) * 100) }));
            } else {
                const counts = {}; options.forEach(opt => counts[opt] = 0);
                propVotes.forEach(v => { 
                    const choice = v.vote_data?.choice || v.vote; 
                    if(counts[choice] !== undefined) counts[choice] += 1; 
                });
                distribution = options.map(opt => ({ label: opt, count: counts[opt], percent: total === 0 ? 0 : Math.round((counts[opt] / total) * 100) }));
            }
            newStats[prop.id] = { total, distribution, type: prop.vote_type };
        });
        setStats(newStats);
        setLoading(false);
    }, [proposals]);

    useEffect(() => {
        fetchStats();
        const sub = supabase.channel('realtime_analytics_votes').on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchStats).subscribe();
        return () => supabase.removeChannel(sub);
    }, [fetchStats]);

    if (proposals.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 animate-in fade-in">
            {proposals.map(prop => {
                const stat = stats[prop.id] || { total: 0, distribution: [], type: 'classic' };
                return (
                    <Card key={prop.id} className="border-l-4 border-l-amber-500 shadow-sm border-t border-b border-r border-[#5b8370]/20 bg-white dark:bg-[#063127]/20">
                        <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div className="w-full sm:w-auto overflow-hidden">
                                <CardTitle className="text-sm sm:text-base font-bold truncate pr-4 text-[#063127] dark:text-[#c4d1c0]">{prop.title}</CardTitle>
                                <CardDescription className="text-[10px] sm:text-xs uppercase flex items-center gap-1 mt-1 text-[#5b8370]">
                                    {stat.type === 'budget' ? <PieChart className="w-3 h-3 text-amber-500"/> : stat.type === 'comparative' ? <Swords className="w-3 h-3 text-amber-500"/> : stat.type === 'scale_5' ? <Star className="w-3 h-3 text-amber-500"/> : <Vote className="w-3 h-3 text-amber-500"/>}
                                    {stat.type} Vote
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="flex gap-1 shrink-0 bg-amber-500 text-[#063127] border-none shadow-sm"><Users className="w-3 h-3"/> {stat.total} Votes</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-amber-500"/> : 
                                stat.distribution.map((d, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-[10px] sm:text-xs"><span className="font-medium text-[#063127] dark:text-[#c4d1c0]">{d.label}</span><span className="text-[#5b8370] font-bold">{stat.type === 'budget' ? `${d.count} BP` : d.count} ({d.percent}%)</span></div>
                                        <Progress value={d.percent} className="h-1.5 sm:h-2 bg-muted [&>div]:bg-amber-500" />
                                    </div>
                                ))
                            }
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

const TranslationModal = ({ isOpen, onClose, item, tableType }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [activeLang, setActiveLang] = useState('es');
    
    const [data, setData] = useState({
        es: { title: '', description: '', date_display: '', options: [] },
        de: { title: '', description: '', date_display: '', options: [] },
        fr: { title: '', description: '', date_display: '', options: [] }
    });

    const fetchTrans = useCallback(async () => {
        if(!item?.id) return;
        setLoading(true);
        const conf = TABLE_CONFIG[tableType];
        const { data: res } = await supabase.from(conf.table).select('*').eq(conf.fk, item.id);
        
        const newData = { 
            es: { title: '', description: '', date_display: '', options: [] }, 
            de: { title: '', description: '', date_display: '', options: [] }, 
            fr: { title: '', description: '', date_display: '', options: [] } 
        };
        
        res?.forEach(r => {
            if(newData[r.language_code]) {
                let parsedOpts = [];
                try { parsedOpts = typeof r.options === 'string' ? JSON.parse(r.options) : (r.options || []); } catch(e) {}

                newData[r.language_code] = { 
                    title: r.title || '', 
                    description: r.description || '', 
                    date_display: r.date_display || '',
                    options: parsedOpts
                };
            }
        });

        if (tableType === 'proposals' && item.options) {
            ['es', 'de', 'fr'].forEach(lang => {
                const baseLen = item.options.length;
                const currentOpts = newData[lang].options || [];
                newData[lang].options = Array.from({length: baseLen}).map((_, i) => currentOpts[i] || '');
            });
        }

        setData(newData);
        setLoading(false);
    }, [item, tableType]);

    useEffect(() => { if(isOpen) fetchTrans(); }, [isOpen, item, fetchTrans]);

    const handleSave = async () => {
        setLoading(true);
        const conf = TABLE_CONFIG[tableType];
        const upserts = Object.keys(data).map(lang => ({
            [conf.fk]: item.id, 
            language_code: lang, 
            title: data[lang].title, 
            description: data[lang].description,
            ...(tableType === 'roadmap' ? { date_display: data[lang].date_display } : {}),
            ...(tableType === 'proposals' && item.vote_type !== 'scale_5' ? { options: data[lang].options } : {})
        }));

        const { error } = await supabase.from(conf.table).upsert(upserts, { onConflict: `${conf.fk}, language_code` });
        if (error) toast({ variant: "destructive", title: t('common.error'), description: error.message });
        else { toast({ title: t('common.success'), description: "Translations saved." }); onClose(); }
        setLoading(false);
    };

    // ====== LÓGICA DE AUTO-TRADUCCIÓN POR IA ======
    const handleAutoTranslate = async () => {
        setLoading(true);
        try {
            const payload = {
                tableType: tableType,
                original: {
                    title: item?.title || '',
                    description: item?.description || '',
                    date_display: item?.date_display || '',
                    options: item?.vote_type === 'scale_5' ? [] : (item?.options || [])
                },
                targetLangs: ['es', 'de', 'fr']
            };

            const webhookUrl = 'https://n8n.reforestal.cloud/webhook/translate-content';
            
            if (webhookUrl.includes('TU_WEBHOOK')) {
                toast({ 
                    title: "Action Required", 
                    description: "Debes configurar la URL de tu Webhook en CommunityManagement.jsx.", 
                    variant: "destructive" 
                });
                setLoading(false);
                return;
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Translation webhook failed");
            const result = await response.json();

            if (result) {
                setData(prev => ({
                    ...prev,
                    es: { ...prev.es, ...result.es },
                    de: { ...prev.de, ...result.de },
                    fr: { ...prev.fr, ...result.fr }
                }));
                toast({ title: "🪄 Magia completada", description: "Textos traducidos por IA. Revisa y guarda.", className: "bg-card text-foreground border-gold/30" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };
    // ==============================================

    const update = (field, val) => setData(p => ({ ...p, [activeLang]: { ...p[activeLang], [field]: val } }));
    
    const updateOption = (idx, val) => {
        setData(p => {
            const newLangData = { ...p[activeLang] };
            const newOptions = [...(newLangData.options || [])];
            newOptions[idx] = val;
            newLangData.options = newOptions;
            return { ...p, [activeLang]: newLangData };
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-[#5b8370]/50 rounded-3xl">
                <DialogHeader><DialogTitle className="text-foreground dark:text-[#c4d1c0] font-bold">{t('admin.community.manage_translations', 'Manage Translations')} ({tableType})</DialogTitle></DialogHeader>
                <Tabs value={activeLang} onValueChange={setActiveLang}>
                    <TabsList className="grid w-full grid-cols-3 bg-[#5b8370]/10 rounded-xl p-1">
                        <TabsTrigger value="es" className="rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all">Español</TabsTrigger>
                        <TabsTrigger value="de" className="rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all">Deutsch</TabsTrigger>
                        <TabsTrigger value="fr" className="rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all">Français</TabsTrigger>
                    </TabsList>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-foreground font-bold">Title ({activeLang})</Label>
                            <Input value={data[activeLang].title} onChange={e => update('title', e.target.value)} className="border-[#5b8370]/30 focus-visible:ring-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-foreground font-bold">Description ({activeLang})</Label>
                            <Textarea value={data[activeLang].description} onChange={e => update('description', e.target.value)} className="border-[#5b8370]/30 focus-visible:ring-amber-500" />
                        </div>
                        {tableType === 'roadmap' && <div className="space-y-2"><Label className="text-foreground font-bold">Date Display ({activeLang})</Label><Input value={data[activeLang].date_display} onChange={e => update('date_display', e.target.value)} className="border-[#5b8370]/30 focus-visible:ring-amber-500" /></div>}
                        
                        {tableType === 'proposals' && item?.options && item?.vote_type !== 'scale_5' && (
                            <div className="space-y-3 pt-4 border-t border-[#5b8370]/20">
                                <Label className="text-foreground font-bold">Voting Options ({activeLang})</Label>
                                {item.options.map((baseOpt, idx) => {
                                    const baseLabel = typeof baseOpt === 'object' ? baseOpt.label : baseOpt;
                                    return (
                                        <div key={idx} className="space-y-1 bg-[#5b8370]/5 p-3 rounded-xl border border-[#5b8370]/10">
                                            <span className="text-[10px] text-foreground uppercase font-bold tracking-wider">Original: {baseLabel}</span>
                                            <Input 
                                                value={data[activeLang].options?.[idx] || ''} 
                                                onChange={e => updateOption(idx, e.target.value)} 
                                                placeholder={`Translation for "${baseLabel}"`}
                                                className="border-[#5b8370]/30 focus-visible:ring-amber-500 bg-background"
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </Tabs>
                <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-3 sm:justify-between">
                    <div className="w-full sm:w-auto">
                        <Button type="button" onClick={handleAutoTranslate} disabled={loading} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-glow border-none transition-transform active:scale-95 rounded-xl">
                            {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Sparkles className="w-4 h-4 mr-2 text-yellow-300"/>} 
                            Auto-Translate (AI)
                        </Button>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" className="flex-1 sm:flex-none border-[#5b8370] text-[#5b8370] hover:bg-[#5b8370] hover:text-white rounded-xl" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none bg-[#063127] hover:bg-transparent text-white hover:text-[#063127] border border-transparent hover:border-[#063127] rounded-xl shadow-lg transition-all">
                             {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Send className="w-4 h-4 mr-2 text-amber-500"/>} {t('common.save', 'Save')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const CommunityManagement = () => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('proposals');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [transModalOpen, setTransModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    
    const [formData, setFormData] = useState({});
    
    // Las opciones ahora son objetos: { label: '', media_url: '', file: null }
    const [formOptions, setFormOptions] = useState([]); 
    
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        let query;
        if (activeTab === 'proposals') query = supabase.from('proposals').select('*').order('created_at', { ascending: false });
        else if (activeTab === 'news') query = supabase.from('news_items').select('*').order('publish_date', { ascending: false });
        else query = supabase.from('roadmap_items').select('*').order('display_order', { ascending: true });

        const { data, error } = await query;
        if (error) console.error(error);
        else setItems(data || []);
        setLoading(false);
    }, [activeTab]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleFileChange = (e) => setImageFile(e.target.files[0]);

    // Función genérica para subir archivos (sirve para portada y para opciones)
    const uploadFile = async (file) => {
        if (!file) return null;
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
        const { error } = await supabase.storage.from('community-content').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('community-content').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSave = async () => {
        setUploading(true);
        try {
            let imgUrl = formData.image_url;
            if (imageFile) imgUrl = await uploadFile(imageFile);

            const payload = { ...formData, image_url: imgUrl };
            
            if (activeTab === 'proposals') {
                if (formData.vote_type === 'scale_5') {
                    // Para rating del 1 al 5, no necesitamos opciones cargadas manualmente
                    payload.options = [
                        { label: '1', media_url: '' },
                        { label: '2', media_url: '' },
                        { label: '3', media_url: '' },
                        { label: '4', media_url: '' },
                        { label: '5', media_url: '' }
                    ];
                } else {
                    // Subir archivos de las opciones si existen (flujo normal)
                    const uploadedOptions = await Promise.all(formOptions.map(async (opt) => {
                        if (opt.file) {
                            const url = await uploadFile(opt.file);
                            return { label: opt.label, media_url: url };
                        }
                        return { label: opt.label, media_url: opt.media_url || '' };
                    }));

                    const validOptions = uploadedOptions.filter(o => o.label.trim() !== "");
                    if (validOptions.length < 2) throw new Error("Please add at least 2 voting options.");
                    
                    payload.options = validOptions; 
                }
                
                payload.start_date = payload.start_date ? new Date(payload.start_date).toISOString() : null;
                payload.end_date = payload.end_date ? new Date(payload.end_date).toISOString() : null;
            }

            delete payload.id; 
            
            let query;
            const table = activeTab === 'proposals' ? 'proposals' : activeTab === 'news' ? 'news_items' : 'roadmap_items';

            if (selectedItem?.id) query = supabase.from(table).update(payload).eq('id', selectedItem.id);
            else query = supabase.from(table).insert(payload);

            const { error } = await query;
            if (error) throw error;

            toast({ title: t('common.success'), description: "Item saved.", className: "bg-[#063127] text-white" });
            setEditModalOpen(false);
            fetchItems();
        } catch (e) {
            toast({ variant: "destructive", title: t('common.error'), description: e.message });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this item?")) return;
        const table = activeTab === 'proposals' ? 'proposals' : activeTab === 'news' ? 'news_items' : 'roadmap_items';
        await supabase.from(table).delete().eq('id', id);
        fetchItems();
    };

    const openEdit = (item) => {
        setSelectedItem(item);
        if (item) {
            setFormData({ ...item });
            if (activeTab === 'proposals') {
                // Retrocompatibilidad: Si eran strings los pasamos a objetos
                const loadedOpts = Array.isArray(item.options) 
                    ? item.options.map(o => typeof o === 'string' ? { label: o, media_url: '', file: null } : { ...o, file: null }) 
                    : [{label: 'Option A', media_url: '', file: null}, {label: 'Option B', media_url: '', file: null}];
                setFormOptions(loadedOpts);
            }
        } else {
            if (activeTab === 'proposals') {
                const now = new Date();
                const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
                setFormData({ title: '', description: '', status: 'active', vote_type: 'classic', start_date: now.toISOString(), end_date: nextWeek.toISOString() });
                setFormOptions([{label: '', media_url: '', file: null}, {label: '', media_url: '', file: null}]); 
            }
            else if (activeTab === 'news') setFormData({ title: '', description: '', category: 'Milestone', image_url: '' });
            else setFormData({ title: '', description: '', date_display: '', status: 'pending', completion_percentage: 0 });
        }
        setImageFile(null);
        setEditModalOpen(true);
    };

    const handleOptionChange = (idx, field, value) => { 
        const newOpts = [...formOptions]; 
        newOpts[idx][field] = value; 
        setFormOptions(newOpts); 
    };

    const handleOptionFileChange = (idx, file) => {
        const newOpts = [...formOptions]; 
        newOpts[idx].file = file; 
        setFormOptions(newOpts); 
    };

    const addOption = () => setFormOptions([...formOptions, { label: '', media_url: '', file: null }]);
    
    const removeOption = (idx) => { 
        if (formOptions.length <= 2) return; 
        setFormOptions(formOptions.filter((_, i) => i !== idx)); 
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#063127] dark:text-[#c4d1c0]">{t('admin.community.title', 'Founders Area Content')}</h2>
                <p className="text-[#5b8370] text-sm sm:text-base font-medium">{t('admin.community.subtitle', 'Manage Gamified Governance, News, and Roadmap for Founding Pioneers.')}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="w-full flex sm:inline-flex bg-[#5b8370]/10 rounded-xl p-1 overflow-x-auto border border-[#5b8370]/20">
                    <TabsTrigger value="proposals" className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all"><Vote className="w-4 h-4 mr-2 hidden sm:block text-amber-500"/> {t('pioneer.tabs.governance', 'Governance')}</TabsTrigger>
                    <TabsTrigger value="news" className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all"><Newspaper className="w-4 h-4 mr-2 hidden sm:block text-amber-500"/> {t('pioneer.tabs.news', 'News')}</TabsTrigger>
                    <TabsTrigger value="roadmap" className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-[#063127] data-[state=active]:text-white transition-all"><TrendingUp className="w-4 h-4 mr-2 hidden sm:block text-amber-500"/> {t('pioneer.tabs.roadmap', 'Roadmap')}</TabsTrigger>
                </TabsList>

                {activeTab === 'proposals' && (
                    <div className="bg-[#5b8370]/5 p-4 rounded-2xl border border-[#5b8370]/20">
                        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-amber-500" /> {t('admin.community.live_dashboard', 'LIVE RESULTS DASHBOARD')}
                        </h3>
                        <VotingAnalytics proposals={items.filter(i => i.status !== 'draft')} />
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={() => openEdit(null)} className="bg-background hover:bg-transparent text-foreground hover:text-[#063127] border border-transparent hover:border-[#063127] transition-all w-full sm:w-auto rounded-xl shadow-md">
                        <Plus className="w-4 h-4 mr-2 text-amber-500"/> {t('admin.community.add_new', 'Add New')}
                    </Button>
                </div>

                <Card className="border-[#5b8370]/20 bg-background shadow-sm rounded-3xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow className="bg-[#5b8370]/10 hover:bg-[#5b8370]/10 border-b border-[#5b8370]/20">
                                        <TableHead className="text-foreground font-bold">{t('admin.community.table_title', 'Title')}</TableHead>
                                        <TableHead className="text-foreground font-bold">{t('admin.community.table_status', 'Status / Details')}</TableHead>
                                        {(activeTab === 'news' || activeTab === 'proposals') && <TableHead className="text-foreground font-bold">{t('admin.community.table_image', 'Image')}</TableHead>}
                                        <TableHead className="text-right text-foreground font-bold">{t('admin.community.table_actions', 'Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={4} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-amber-500"/></TableCell></TableRow> :
                                    items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center p-8 text-muted-foreground">{t('admin.community.no_items', 'No items found.')}</TableCell></TableRow> :
                                    items.map(item => (
                                        <TableRow key={item.id} className="hover:bg-[#5b8370]/5 transition-colors border-b border-[#5b8370]/10">
                                            <TableCell className="font-bold text-sm max-w-[200px] truncate text-foreground" title={item.title}>{item.title}</TableCell>
                                            <TableCell>
                                                {activeTab === 'proposals' && (
                                                    <div className="flex flex-col gap-1">
                                                        <Badge className={item.status === 'active' ? 'bg-[#5b8370]/20 text-foreground border-0 w-fit font-bold' : 'bg-gray-100 text-gray-800 w-fit border-0 font-bold'}>{item.status}</Badge>
                                                        <Badge variant="outline" className="uppercase text-[10px] w-fit border-[#5b8370]/30 text-muted-foreground bg-white">{item.vote_type}</Badge>
                                                    </div>
                                                )}
                                                {activeTab === 'news' && <span className="text-xs bg-amber-500 text-foreground font-bold px-2 py-1 rounded-md">{item.category}</span>}
                                                {activeTab === 'roadmap' && <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{item.date_display} ({item.completion_percentage}%)</span>}
                                            </TableCell>
                                            {(activeTab === 'news' || activeTab === 'proposals') && (
                                                <TableCell>
                                                    {item.image_url ? <img src={item.image_url} alt="img" className="w-10 h-10 rounded-lg object-cover border border-[#5b8370]/30 shadow-sm"/> : <ImageIcon className="w-5 h-5 text-slate-300"/>}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 sm:gap-2">
                                                    {activeTab === 'proposals' && (
                                                        <Button variant="ghost" size="icon" onClick={() => {setSelectedItem(item); setHistoryModalOpen(true);}} title={t('admin.community.voting_history', 'View Voters & Comments')} className="hover:bg-[#5b8370]/10">
                                                            <MessageSquare className="w-4 h-4 text-amber-500"/>
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => {setSelectedItem(item); setTransModalOpen(true);}} title={t('admin.community.manage_translations', 'Translate')} className="hover:bg-[#5b8370]/10"><Globe className="w-4 h-4 text-[#5b8370]"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title={t('common.edit', 'Edit')} className="hover:bg-[#5b8370]/10"><Edit className="w-4 h-4 text-[#063127]"/></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title={t('common.delete', 'Delete')} className="hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </Tabs>

            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 border border-[#5b8370]/50 rounded-3xl">
                    <DialogHeader><DialogTitle className="text-foreground font-bold text-xl">{selectedItem ? t('admin.community.edit_item', 'Edit Item') : t('admin.community.create_item', 'Create Item')}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-foreground font-bold">Title (English/Default)</Label>
                            <Input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="border-[#5b8370]/30 focus-visible:ring-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-foreground font-bold">Description (English/Default)</Label>
                            <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="border-[#5b8370]/30 focus-visible:ring-amber-500" />
                        </div>
                        
                        {activeTab === 'proposals' && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-bold">Status</Label>
                                        <Select value={formData.status || 'draft'} onValueChange={v => setFormData({...formData, status: v})}>
                                            <SelectTrigger className="border-[#5b8370]/30 focus:ring-amber-500"><SelectValue/></SelectTrigger>
                                            <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-foreground font-bold">Voting Type (Gamification)</Label>
                                        <Select value={formData.vote_type || 'classic'} onValueChange={v => setFormData({...formData, vote_type: v})}>
                                            <SelectTrigger className="bg-[#5b8370]/10 text-foreground border-[#5b8370]/30 font-bold focus:ring-amber-500"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="classic">Classic (Bars)</SelectItem>
                                                <SelectItem value="comparative">Comparative (A vs B Duel)</SelectItem>
                                                <SelectItem value="budget">Budget Allocation (Mini-game)</SelectItem>
                                                <SelectItem value="scale_5">1 to 5 Scale (Rating)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground font-bold">End Date</Label>
                                    <Input type="datetime-local" value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''} onChange={e => setFormData({...formData, end_date: e.target.value ? new Date(e.target.value).toISOString() : ''})} className="border-[#5b8370]/30 focus-visible:ring-amber-500" />
                                </div>
                                
                                {formData.vote_type !== 'scale_5' && (
                                    <div className="space-y-3 border-t border-[#5b8370]/20 pt-4">
                                        <Label className="flex justify-between items-center text-foreground font-bold text-base">
                                            <span>Voting Options</span>
                                            <Button type="button" size="sm" variant="outline" onClick={addOption} className="border-[#5b8370] text-[#5b8370] hover:bg-[#5b8370] hover:text-white rounded-lg"><Plus className="w-3 h-3 mr-1 text-amber-500"/>Add</Button>
                                        </Label>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                            {formOptions.map((opt, idx) => (
                                                <div key={idx} className="flex flex-col gap-2 p-4 bg-[#5b8370]/5 border border-[#5b8370]/20 rounded-xl shadow-sm">
                                                    <div className="flex gap-2">
                                                        <Input 
                                                            value={opt.label} 
                                                            onChange={(e) => handleOptionChange(idx, 'label', e.target.value)} 
                                                            placeholder={`Option label ${idx + 1}`} 
                                                            className="border-[#5b8370]/30 focus-visible:ring-amber-500 bg-background"
                                                        />
                                                        <Button type="button" size="icon" variant="ghost" className="hover:bg-red-50 rounded-lg shrink-0" onClick={() => removeOption(idx)} disabled={formOptions.length <= 2}>
                                                            <X className="w-4 h-4 text-red-500"/>
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <Label className="cursor-pointer bg-white border border-[#5b8370]/30 px-3 py-2 rounded-lg text-xs hover:bg-[#5b8370]/10 flex items-center gap-2 font-bold text-card transition-colors shadow-sm">
                                                            <Paperclip className="w-3.5 h-3.5 text-foreground" />
                                                            {opt.file ? "File Selected" : "Attach Image/Video"}
                                                            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleOptionFileChange(idx, e.target.files[0])} />
                                                        </Label>
                                                        {opt.media_url && !opt.file && (
                                                            <a href={opt.media_url} target="_blank" rel="noreferrer" className="text-xs text-[#5b8370] font-bold hover:underline flex items-center gap-1">
                                                                <Eye className="w-3 h-3"/> View Current Media
                                                            </a>
                                                        )}
                                                        {opt.file && <span className="text-xs text-emerald-600 font-bold truncate max-w-[150px]">{opt.file.name}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {formData.vote_type === 'scale_5' && (
                                    <div className="space-y-3 border-t border-[#5b8370]/20 pt-4">
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border text-muted-foreground text-sm text-center">
                                            {t('admin.community.scale_5_note', 'A 1 to 5 rating scale will be automatically generated. No manual options needed.')}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 pt-4 border-t border-[#5b8370]/20">
                                    <Label className="text-[#063127] font-bold">Proposal Main Image (Optional)</Label>
                                    <Input type="file" onChange={handleFileChange} accept="image/*" className="border-[#5b8370]/30" />
                                </div>
                            </>
                        )}
                        {activeTab === 'news' && (
                            <><div className="space-y-2"><Label className="text-[#063127] font-bold">Category</Label><Select value={formData.category || 'Milestone'} onValueChange={v => setFormData({...formData, category: v})}><SelectTrigger className="border-[#5b8370]/30 focus:ring-amber-500"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Milestone">Milestone</SelectItem><SelectItem value="Tech">Tech</SelectItem><SelectItem value="Business">Business</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label className="text-[#063127] font-bold">News Image</Label><Input type="file" onChange={handleFileChange} accept="image/*" className="border-[#5b8370]/30" /></div></>
                        )}
                        {activeTab === 'roadmap' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-[#063127] font-bold">Date Display (e.g. Q1 2026)</Label><Input value={formData.date_display || ''} onChange={e => setFormData({...formData, date_display: e.target.value})} className="border-[#5b8370]/30 focus-visible:ring-amber-500"/></div>
                                <div className="space-y-2"><Label className="text-[#063127] font-bold">Status</Label><Select value={formData.status || 'pending'} onValueChange={v => setFormData({...formData, status: v})}><SelectTrigger className="border-[#5b8370]/30 focus:ring-amber-500"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="current">Current</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label className="text-[#063127] font-bold">Progress (%)</Label><Input type="number" min="0" max="100" value={formData.completion_percentage || 0} onChange={e => setFormData({...formData, completion_percentage: e.target.value})} className="border-[#5b8370]/30 focus-visible:ring-amber-500"/></div>
                                <div className="space-y-2"><Label className="text-[#063127] font-bold">Order</Label><Input type="number" value={formData.display_order || 0} onChange={e => setFormData({...formData, display_order: e.target.value})} className="border-[#5b8370]/30 focus-visible:ring-amber-500"/></div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" className="w-full sm:w-auto rounded-xl border-[#5b8370] text-[#5b8370] hover:bg-[#5b8370] hover:text-white" onClick={() => setEditModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSave} disabled={uploading} className="w-full sm:w-auto bg-[#063127] hover:bg-transparent text-white hover:text-[#063127] border border-transparent hover:border-[#063127] rounded-xl shadow-lg transition-all">
                             {uploading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Send className="w-4 h-4 mr-2 text-amber-500"/>} {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <TranslationModal isOpen={transModalOpen} onClose={() => setTransModalOpen(false)} item={selectedItem} tableType={activeTab} />
            <ProposalVotesModal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} proposal={selectedItem} />
        </div>
    );
};

export default CommunityManagement;