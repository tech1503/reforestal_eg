import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Eye, Power, Search, AlertTriangle, Globe, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import AdminGamificationActionModal from './AdminGamificationActionModal';
import AdminGamificationActionUsageModal from './AdminGamificationActionUsageModal';

// --- MODAL DE TRADUCCIÓN CORREGIDO (AHORA CON SUCCESS MESSAGE) ---
const GamificationTranslationModal = ({ isOpen, onClose, item }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeLang, setActiveLang] = useState('es');
    
    // ESTADO ACTUALIZADO: Incluye success_message
    const [translations, setTranslations] = useState({
        es: { title: '', description: '', success_message: '' },
        de: { title: '', description: '', success_message: '' },
        fr: { title: '', description: '', success_message: '' }
    });

    const fetchTranslations = useCallback(async () => {
        if (!item?.id) return;
        setLoading(true);
        
        const { data } = await supabase
            .from('gamification_action_translations')
            .select('*')
            .eq('gamification_action_id', item.id);

        const newTrans = { 
            es: { title: '', description: '', success_message: '' },
            de: { title: '', description: '', success_message: '' },
            fr: { title: '', description: '', success_message: '' }
        };

        if (data) {
            data.forEach(tr => {
                if (newTrans[tr.language_code]) {
                    newTrans[tr.language_code] = { 
                        title: tr.action_title || '', 
                        description: tr.description || '',
                        success_message: tr.success_message || '' // CARGAMOS EL MENSAJE
                    };
                }
            });
        }
        setTranslations(newTrans);
        setLoading(false);
    }, [item]);

    useEffect(() => {
        if (isOpen && item) fetchTranslations();
    }, [isOpen, item, fetchTranslations]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const upserts = Object.keys(translations).map(lang => ({
                gamification_action_id: item.id,
                language_code: lang,
                action_title: translations[lang].title,
                description: translations[lang].description,
                success_message: translations[lang].success_message // GUARDAMOS EL MENSAJE
            }));

            const { error } = await supabase
                .from('gamification_action_translations')
                .upsert(upserts, { onConflict: 'gamification_action_id, language_code' });

            if (error) throw error;
            toast({ title: t('common.success'), description: "Translations updated." });
            onClose();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field, value) => {
        setTranslations(prev => ({
            ...prev,
            [activeLang]: { ...prev[activeLang], [field]: value }
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Translate: {item?.action_title || item?.action_name}</DialogTitle>
                    <DialogDescription>Localization for System Actions</DialogDescription>
                </DialogHeader>
                
                <Tabs value={activeLang} onValueChange={setActiveLang} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="es">Español 🇪🇸</TabsTrigger>
                        <TabsTrigger value="de">Deutsch 🇩🇪</TabsTrigger>
                        <TabsTrigger value="fr">Français 🇫🇷</TabsTrigger>
                    </TabsList>
                    
                    {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div> : (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Title ({activeLang.toUpperCase()})</Label>
                                <Input 
                                    value={translations[activeLang].title} 
                                    onChange={e => updateField('title', e.target.value)} 
                                    placeholder="Translated Title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description ({activeLang.toUpperCase()})</Label>
                                <Textarea 
                                    value={translations[activeLang].description} 
                                    onChange={e => updateField('description', e.target.value)} 
                                    placeholder="Translated Description"
                                    rows={2}
                                />
                            </div>
                            {/* CAMPO DE MENSAJE DE ÉXITO AÑADIDO */}
                            <div className="space-y-2">
                                <Label className="text-emerald-700 font-semibold">Success Notification ({activeLang.toUpperCase()})</Label>
                                <Textarea 
                                    value={translations[activeLang].success_message} 
                                    onChange={e => updateField('success_message', e.target.value)} 
                                    placeholder="e.g. ¡Felicidades! Has completado la acción."
                                    className="border-emerald-200 bg-emerald-50/20"
                                    rows={2}
                                />
                                <p className="text-[10px] text-muted-foreground">This message is sent to the user when they trigger this action.</p>
                            </div>
                        </div>
                    )}
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button onClick={handleSave} disabled={loading} className="btn-primary">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- COMPONENTE PRINCIPAL ---
const AdminGamificationActionsConfig = () => {
    const { toast } = useToast();
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    
    // Translation Modal
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [transItem, setTransItem] = useState(null);

    const fetchActions = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('gamification_actions')
            .select('*')
            .not('action_type', 'in', '("Genesis Quest","genesis_quest","Mission Quest","mission_quest")') 
            .order('created_at', { ascending: true });

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } else {
            setActions(data || []);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchActions();
        const channel = supabase.channel('gamification_actions_config')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_actions' }, fetchActions)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchActions]);

    const handleEdit = (action) => {
        setSelectedAction(action);
        setIsEditModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedAction(null);
        setIsEditModalOpen(true);
    };

    const handleViewUsage = (action) => {
        setSelectedAction(action);
        setIsUsageModalOpen(true);
    };

    const handleTranslate = (action) => {
        setTransItem(action);
        setIsTransModalOpen(true);
    };

    const handleToggleStatus = async (action) => {
        const { error } = await supabase
            .from('gamification_actions')
            .update({ is_active: !action.is_active })
            .eq('id', action.id);
        
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
        else toast({ title: "Updated", description: `Action ${!action.is_active ? 'activated' : 'deactivated'}.` });
    };

    const filteredActions = actions.filter(a => 
        (a.action_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.action_title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.action_type?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">System Actions Configuration</h3>
                    <p className="text-sm text-gray-500">Manage technical triggers (Referrals, Login, Contributions).</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                            placeholder="Search system actions..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-9"
                        />
                    </div>
                    <Button onClick={handleCreate} className="bg-slate-800 hover:bg-slate-900 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add System Action
                    </Button>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>
                    <strong>Note:</strong> Genesis Missions and Quests are managed in the 
                    <span className="font-bold underline ml-1 cursor-pointer" onClick={() => window.location.hash = '#gamification'}>Gamification Tab</span> 
                    to ensure reward consistency.
                </span>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>Title / Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Binding</TableHead>
                            <TableHead>Credits</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
                        ) : filteredActions.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-500">No system actions found.</TableCell></TableRow>
                        ) : (
                            filteredActions.map(action => (
                                <TableRow key={action.id} className="hover:bg-slate-50/50">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{action.action_title || action.action_name}</span>
                                            <span className="text-xs text-gray-400 font-mono">{action.action_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{action.action_type}</Badge></TableCell>
                                    <TableCell><span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{action.system_binding || 'manual'}</span></TableCell>
                                    <TableCell className="font-mono font-bold text-emerald-600 text-lg">+{action.impact_credits_value}</TableCell>
                                    <TableCell>
                                        <Badge className={action.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}>
                                            {action.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(action)} title="Toggle Status">
                                                <Power className={`w-4 h-4 ${action.is_active ? 'text-green-500' : 'text-gray-300'}`} />
                                            </Button>
                                            
                                            <Button variant="ghost" size="icon" onClick={() => handleTranslate(action)} title="Translate">
                                                <Globe className="w-4 h-4 text-purple-500" />
                                            </Button>

                                            <Button variant="ghost" size="icon" onClick={() => handleViewUsage(action)} title="View Usage">
                                                <Eye className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(action)} title="Edit Configuration">
                                                <Edit className="w-4 h-4 text-slate-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AdminGamificationActionModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                actionToEdit={selectedAction}
                onSuccess={() => fetchActions()} 
            />

            <AdminGamificationActionUsageModal 
                isOpen={isUsageModalOpen} 
                onClose={() => setIsUsageModalOpen(false)} 
                action={selectedAction}
            />

            {/* TRANSLATION MODAL INSTANCE */}
            <GamificationTranslationModal 
                isOpen={isTransModalOpen}
                onClose={() => setIsTransModalOpen(false)}
                item={transItem}
            />
        </div>
    );
};

export default AdminGamificationActionsConfig;