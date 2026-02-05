import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Plus, Edit, Globe, Vote, Newspaper, TrendingUp, Image as ImageIcon, X, BarChart3, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// --- CONFIGURACIÓN ESTÁTICA ---
const TABLE_CONFIG = {
    proposals: { table: 'proposal_translations', fk: 'proposal_id' },
    news: { table: 'news_translations', fk: 'news_id' },
    roadmap: { table: 'roadmap_translations', fk: 'roadmap_id' }
};

// --- COMPONENTE: VOTING ANALYTICS DASHBOARD ---
const VotingAnalytics = ({ proposals }) => {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const { data: votes } = await supabase.from('votes').select('proposal_id, vote');

            const newStats = {};

            proposals.forEach(prop => {
                const propVotes = votes?.filter(v => v.proposal_id === prop.id) || [];
                const total = propVotes.length;
                const counts = {};

                const options = Array.isArray(prop.options) ? prop.options : ['Option A', 'Option B'];
                options.forEach(opt => counts[opt] = 0);

                propVotes.forEach(v => {
                    counts[v.vote] = (counts[v.vote] || 0) + 1;
                });

                newStats[prop.id] = {
                    total,
                    distribution: options.map(opt => ({
                        label: opt,
                        count: counts[opt] || 0,
                        percent: total === 0 ? 0 : Math.round(((counts[opt] || 0) / total) * 100)
                    }))
                };
            });

            setStats(newStats);
        } catch (e) {
            console.error("Error stats", e);
        } finally {
            setLoading(false);
        }
    }, [proposals]);

    useEffect(() => {
        fetchStats();
        const sub = supabase.channel('realtime_analytics_votes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, fetchStats)
            .subscribe();
        return () => supabase.removeChannel(sub);
    }, [fetchStats]);

    if (proposals.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-in fade-in">
            {proposals.map(prop => {
                const stat = stats[prop.id] || { total: 0, distribution: [] };
                return (
                    <Card key={prop.id} className="border-l-4 border-l-emerald-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-bold truncate pr-4">{prop.title}</CardTitle>
                                <Badge variant="outline" className="flex gap-1">
                                    <Vote className="w-3 h-3"/> {stat.total}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs">
                                Ends: {prop.end_date ? format(new Date(prop.end_date), 'PPP') : 'N/A'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400"/> : 
                                stat.distribution.map((d, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-medium text-slate-700">{d.label}</span>
                                            <span className="text-slate-500">{d.count} ({d.percent}%)</span>
                                        </div>
                                        <Progress value={d.percent} className="h-2" />
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

// --- MODAL DE TRADUCCIÓN ---
const TranslationModal = ({ isOpen, onClose, itemId, tableType }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeLang, setActiveLang] = useState('es');
    const [data, setData] = useState({
        es: { title: '', description: '', date_display: '' },
        de: { title: '', description: '', date_display: '' },
        fr: { title: '', description: '', date_display: '' }
    });

    const fetchTrans = useCallback(async () => {
        if(!itemId) return;
        setLoading(true);
        
        const conf = TABLE_CONFIG[tableType];
        const { data: res } = await supabase.from(conf.table).select('*').eq(conf.fk, itemId);
        
        const newData = { 
            es: { title: '', description: '', date_display: '' },
            de: { title: '', description: '', date_display: '' },
            fr: { title: '', description: '', date_display: '' }
        };
        
        res?.forEach(r => {
            if(newData[r.language_code]) {
                newData[r.language_code] = { 
                    title: r.title || '', 
                    description: r.description || '',
                    date_display: r.date_display || '' 
                };
            }
        });
        setData(newData);
        setLoading(false);
    }, [itemId, tableType]);

    useEffect(() => { if(isOpen) fetchTrans(); }, [isOpen, itemId, fetchTrans]);

    const handleSave = async () => {
        setLoading(true);
        const conf = TABLE_CONFIG[tableType];
        const upserts = Object.keys(data).map(lang => ({
            [conf.fk]: itemId,
            language_code: lang,
            title: data[lang].title,
            description: data[lang].description,
            ...(tableType === 'roadmap' ? { date_display: data[lang].date_display } : {})
        }));

        const { error } = await supabase.from(conf.table).upsert(upserts, { onConflict: `${conf.fk}, language_code` });
        
        if (error) toast({ variant: "destructive", title: "Error", description: error.message });
        else {
            toast({ title: "Success", description: "Translations saved." });
            onClose();
        }
        setLoading(false);
    };

    const update = (field, val) => setData(p => ({ ...p, [activeLang]: { ...p[activeLang], [field]: val } }));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Manage Translations ({tableType})</DialogTitle></DialogHeader>
                <Tabs value={activeLang} onValueChange={setActiveLang}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="es">Español</TabsTrigger>
                        <TabsTrigger value="de">Deutsch</TabsTrigger>
                        <TabsTrigger value="fr">Français</TabsTrigger>
                    </TabsList>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Title ({activeLang})</Label>
                            <Input value={data[activeLang].title} onChange={e => update('title', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description ({activeLang})</Label>
                            <Textarea value={data[activeLang].description} onChange={e => update('description', e.target.value)} />
                        </div>
                        {tableType === 'roadmap' && (
                            <div className="space-y-2">
                                <Label>Date Display ({activeLang}) - e.g. "Q1 2026"</Label>
                                <Input value={data[activeLang].date_display} onChange={e => update('date_display', e.target.value)} />
                            </div>
                        )}
                    </div>
                </Tabs>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {loading ? <Loader2 className="animate-spin mr-2"/> : "Save Translations"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- COMPONENTE PRINCIPAL ---
const CommunityManagement = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('proposals');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // States for Modals
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [transModalOpen, setTransModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    
    // Form State Extendido
    const [formData, setFormData] = useState({});
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

    const uploadImage = async () => {
        if (!imageFile) return null;
        const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.png`;
        const { error } = await supabase.storage.from('community-content').upload(fileName, imageFile);
        if (error) throw error;
        const { data } = supabase.storage.from('community-content').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSave = async () => {
        setUploading(true);
        try {
            let imgUrl = formData.image_url;
            if (imageFile) imgUrl = await uploadImage();

            // Preparar payload base
            const payload = { ...formData, image_url: imgUrl };
            
            // Lógica específica para Propuestas
            if (activeTab === 'proposals') {
                const validOptions = formOptions.filter(o => o.trim() !== "");
                if (validOptions.length < 2) throw new Error("Please add at least 2 voting options.");
                payload.options = validOptions; 
                
                // --- CORRECCIÓN CRÍTICA DE FECHAS (Error 22007) ---
                // Si la fecha no es válida o está vacía, enviamos NULL para evitar error de sintaxis en Postgres
                payload.start_date = payload.start_date ? new Date(payload.start_date).toISOString() : null;
                payload.end_date = payload.end_date ? new Date(payload.end_date).toISOString() : null;
            }

            delete payload.id; 
            
            let query;
            const table = activeTab === 'proposals' ? 'proposals' : activeTab === 'news' ? 'news_items' : 'roadmap_items';

            if (selectedItem?.id) {
                query = supabase.from(table).update(payload).eq('id', selectedItem.id);
            } else {
                query = supabase.from(table).insert(payload);
            }

            const { error } = await query;
            if (error) throw error;

            toast({ title: "Success", description: "Item saved." });
            setEditModalOpen(false);
            fetchItems();
        } catch (e) {
            console.error("Save error:", e);
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this item?")) return;
        const table = activeTab === 'proposals' ? 'proposals' : activeTab === 'news' ? 'news_items' : 'roadmap_items';
        await supabase.from(table).delete().eq('id', id);
        fetchItems();
    };

    const openEdit = (item) => {
        setSelectedItem(item);
        if (item) {
            setFormData({ ...item });
            if (activeTab === 'proposals') {
                setFormOptions(Array.isArray(item.options) ? item.options : ['Option A', 'Option B']);
            }
        } else {
            // Inicialización con valores por defecto para evitar fechas vacías
            if (activeTab === 'proposals') {
                const now = new Date();
                const nextWeek = new Date(now);
                nextWeek.setDate(now.getDate() + 7);

                setFormData({ 
                    title: '', 
                    description: '', 
                    status: 'active', 
                    // Inicializamos fechas válidas en ISO string
                    start_date: now.toISOString(),
                    end_date: nextWeek.toISOString()
                });
                setFormOptions(['', '']); 
            }
            else if (activeTab === 'news') {
                setFormData({ title: '', description: '', category: 'Milestone', image_url: '' });
            }
            else {
                setFormData({ title: '', description: '', date_display: '', status: 'pending', completion_percentage: 0 });
            }
        }
        setImageFile(null);
        setEditModalOpen(true);
    };

    // Funciones para manejar opciones dinámicas
    const handleOptionChange = (idx, value) => {
        const newOpts = [...formOptions];
        newOpts[idx] = value;
        setFormOptions(newOpts);
    };

    const addOption = () => setFormOptions([...formOptions, '']);
    
    const removeOption = (idx) => {
        if (formOptions.length <= 2) return;
        setFormOptions(formOptions.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Community Management</h2>
                <p className="text-muted-foreground">Manage Governance (Voting), News, and Roadmap content dynamically.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="proposals"><Vote className="w-4 h-4 mr-2"/> Governance</TabsTrigger>
                    <TabsTrigger value="news"><Newspaper className="w-4 h-4 mr-2"/> News</TabsTrigger>
                    <TabsTrigger value="roadmap"><TrendingUp className="w-4 h-4 mr-2"/> Roadmap</TabsTrigger>
                </TabsList>

                {activeTab === 'proposals' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> LIVE RESULTS DASHBOARD
                        </h3>
                        <VotingAnalytics proposals={items.filter(i => i.status !== 'draft')} />
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={() => openEdit(null)} className="bg-slate-800 hover:bg-slate-900 text-white"><Plus className="w-4 h-4 mr-2"/> Add New</Button>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title (Default)</TableHead>
                                    <TableHead>Status / Details</TableHead>
                                    {(activeTab === 'news' || activeTab === 'proposals') && <TableHead>Image</TableHead>}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? <TableRow><TableCell colSpan={4} className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow> :
                                items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center p-8 text-muted-foreground">No items found.</TableCell></TableRow> :
                                items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.title}</TableCell>
                                        <TableCell>
                                            {activeTab === 'proposals' && (
                                                <div className="flex flex-col gap-1">
                                                    <Badge className={item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{item.status}</Badge>
                                                    <span className="text-xs text-slate-400">Ends: {item.end_date ? format(new Date(item.end_date), 'PP') : '-'}</span>
                                                </div>
                                            )}
                                            {activeTab === 'news' && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{item.category}</span>}
                                            {activeTab === 'roadmap' && <span className="text-xs">{item.date_display} ({item.completion_percentage}%)</span>}
                                        </TableCell>
                                        {(activeTab === 'news' || activeTab === 'proposals') && (
                                            <TableCell>
                                                {item.image_url ? <img src={item.image_url} alt="img" className="w-8 h-8 rounded object-cover border"/> : <ImageIcon className="w-4 h-4 text-gray-300"/>}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => {setSelectedItem(item); setTransModalOpen(true);}} title="Translate"><Globe className="w-4 h-4 text-blue-500"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="w-4 h-4 text-slate-500"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </Tabs>

            {/* EDIT DIALOG */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedItem ? 'Edit Item' : 'Create Item'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title (English/Default)</Label>
                            <Input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (English/Default)</Label>
                            <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                        
                        {/* 1. PROPOSALS FORM */}
                        {activeTab === 'proposals' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={formData.status || 'draft'} onValueChange={v => setFormData({...formData, status: v})}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="closed">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date</Label>
                                        <Input 
                                            type="datetime-local" 
                                            // Corrección visual: convertir ISO UTC a formato local para el input
                                            value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''} 
                                            onChange={e => {
                                                // Corrección lógica: guardar como ISO completo para la DB
                                                const val = e.target.value ? new Date(e.target.value).toISOString() : '';
                                                setFormData({...formData, end_date: val});
                                            }} 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 border-t pt-4">
                                    <Label className="flex justify-between items-center">
                                        <span>Voting Options</span>
                                        <Button type="button" size="sm" variant="outline" onClick={addOption}><Plus className="w-3 h-3 mr-1"/>Add</Button>
                                    </Label>
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                        {formOptions.map((opt, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Option ${idx + 1}`} />
                                                <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(idx)} disabled={formOptions.length <= 2}>
                                                    <X className="w-4 h-4 text-red-400"/>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <Label>Proposal Image (Optional)</Label>
                                    <Input type="file" onChange={handleFileChange} accept="image/*" />
                                </div>
                            </>
                        )}

                        {/* 2. NEWS FORM */}
                        {activeTab === 'news' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={formData.category || 'Milestone'} onValueChange={v => setFormData({...formData, category: v})}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Milestone">Milestone</SelectItem>
                                            <SelectItem value="Tech">Tech</SelectItem>
                                            <SelectItem value="Business">Business</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>News Image</Label>
                                    <Input type="file" onChange={handleFileChange} accept="image/*" />
                                </div>
                            </>
                        )}

                        {/* 3. ROADMAP FORM */}
                        {activeTab === 'roadmap' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date Display (e.g. Q1 2026)</Label>
                                    <Input value={formData.date_display || ''} onChange={e => setFormData({...formData, date_display: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={formData.status || 'pending'} onValueChange={v => setFormData({...formData, status: v})}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="current">Current</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Progress (%)</Label>
                                    <Input type="number" min="0" max="100" value={formData.completion_percentage || 0} onChange={e => setFormData({...formData, completion_percentage: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Order</Label>
                                    <Input type="number" value={formData.display_order || 0} onChange={e => setFormData({...formData, display_order: e.target.value})} />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                             {uploading ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <TranslationModal 
                isOpen={transModalOpen} 
                onClose={() => setTransModalOpen(false)} 
                itemId={selectedItem?.id} 
                tableType={activeTab} 
            />
        </div>
    );
};

export default CommunityManagement;