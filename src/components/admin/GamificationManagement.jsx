import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trophy, Loader2, Trash2, Edit, Save, X, List, Target, FileText, EyeOff, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch'; 

// --- COMPONENTE MODAL DE TRADUCCIÓN ---
const GamificationTranslationModal = ({ isOpen, onClose, item, type }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeLang, setActiveLang] = useState('es');
    
    // Estado extendido con success_message
    const [translations, setTranslations] = useState({
        es: { title: '', description: '', success_message: '' },
        de: { title: '', description: '', success_message: '' },
        fr: { title: '', description: '', success_message: '' }
    });

    const fetchTranslations = useCallback(async () => {
        if (!item?.id) return;

        setLoading(true);
        const tableName = type === 'simple' ? 'gamification_action_translations' : 'genesis_mission_translations';
        const idField = type === 'simple' ? 'gamification_action_id' : 'genesis_mission_id';
        const titleField = type === 'simple' ? 'action_title' : 'title'; 

        const { data } = await supabase
            .from(tableName)
            .select('*')
            .eq(idField, item.id);

        const newTrans = { 
            es: { title: '', description: '', success_message: '' },
            de: { title: '', description: '', success_message: '' },
            fr: { title: '', description: '', success_message: '' }
        };

        if (data) {
            data.forEach(tr => {
                if (newTrans[tr.language_code]) {
                    newTrans[tr.language_code] = { 
                        title: tr[titleField] || '', 
                        description: tr.description || '',
                        success_message: tr.success_message || '' 
                    };
                }
            });
        }
        setTranslations(newTrans);
        setLoading(false);
    }, [item, type]);

    useEffect(() => {
        if (isOpen && item) {
            fetchTranslations();
        }
    }, [isOpen, item, fetchTranslations]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const tableName = type === 'simple' ? 'gamification_action_translations' : 'genesis_mission_translations';
            const idField = type === 'simple' ? 'gamification_action_id' : 'genesis_mission_id';
            const titleField = type === 'simple' ? 'action_title' : 'title';

            const upserts = Object.keys(translations).map(lang => ({
                [idField]: item.id,
                language_code: lang,
                [titleField]: translations[lang].title,
                description: translations[lang].description,
                success_message: translations[lang].success_message 
            }));

            const { error } = await supabase
                .from(tableName)
                .upsert(upserts, { onConflict: `${idField}, language_code` });

            if (error) throw error;
            toast({ title: t('common.success'), description: "Translations updated." });
            onClose();
        } catch (error) {
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
                    <DialogTitle>Translate: {item?.action_title || item?.title}</DialogTitle>
                    <DialogDescription>Add translations for Title, Description and Success Notifications.</DialogDescription>
                </DialogHeader>
                
                <Tabs value={activeLang} onValueChange={setActiveLang} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="es">Español</TabsTrigger>
                        <TabsTrigger value="de">Deutsch</TabsTrigger>
                        <TabsTrigger value="fr">Français</TabsTrigger>
                    </TabsList>
                    
                    {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin"/></div> : (
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
                            <div className="space-y-2">
                                <Label className="text-emerald-700">Success Message / Notification ({activeLang.toUpperCase()})</Label>
                                <Textarea 
                                    value={translations[activeLang].success_message} 
                                    onChange={e => updateField('success_message', e.target.value)} 
                                    placeholder="e.g. ¡Felicidades! Has completado la misión."
                                    className="border-emerald-200 bg-emerald-50/30"
                                    rows={2}
                                />
                                <p className="text-[10px] text-muted-foreground">This message will appear in the user notification popup.</p>
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
const GamificationManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [questActions, setQuestActions] = useState([]);   
  const [realGenesisMissions, setRealGenesisMissions] = useState([]); 
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("quests");
  
  const [transModalOpen, setTransModalOpen] = useState(false);
  const [transItem, setTransItem] = useState(null);
  const [transType, setTransType] = useState('simple');

  const [isEditingSimple, setIsEditingSimple] = useState(false);
  const [simpleForm, setSimpleForm] = useState({ 
    id: null, title: '', description: '', credits: '', target_role: 'all', action_type: 'Quest', is_active: true, is_visible: true 
  });

  const [isGenesisDialogOpen, setIsGenesisDialogOpen] = useState(false);
  const [editingGenesisId, setEditingGenesisId] = useState(null);
  const [genesisForm, setGenesisForm] = useState({
    title: '', description: '', response_type: 'single_choice', impact_credit_reward: 0, status: 'draft', target_role: 'all', response_options: ['', ''], correct_answers: null
  });

  // Fetch de Datos
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [actionsRes, genesisRes, logsRes] = await Promise.all([
            supabase.from('gamification_actions').select('*').in('action_type', ['Quest', 'quest', 'Mission Quest', 'mission_quest', 'Custom', 'custom']).order('created_at', { ascending: false }),
            supabase.from('genesis_missions').select('*').order('created_at', { ascending: false }),

            supabase.from('gamification_history')
                .select('*, profiles:user_id(email, name)') 
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        setQuestActions(actionsRes.data || []);
        setRealGenesisMissions(genesisRes.data || []);
        setCompletions(logsRes.data || []);

    } catch (e) {
        console.error("Fetch Error", e);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- HANDLERS SIMPLE ---
  const handleSaveSimple = async (e) => {
    e.preventDefault();
    if (!simpleForm.title || !simpleForm.credits) return;

    const payload = {
        action_title: simpleForm.title,
        description: simpleForm.description,
        impact_credits_value: parseInt(simpleForm.credits),
        target_role: simpleForm.target_role,
        action_type: simpleForm.action_type,
        is_active: simpleForm.is_active,
        is_visible: simpleForm.is_visible,
        trigger_event: 'manual_claim'
    };

    if (isEditingSimple && simpleForm.id) {
        await supabase.from('gamification_actions').update(payload).eq('id', simpleForm.id);
    } else {
        payload.action_name = `${simpleForm.action_type.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        payload.system_binding = 'manual_quest';
        await supabase.from('gamification_actions').insert([payload]);
    }
    
    toast({ title: t('common.success'), description: "Quest Saved" });
    resetSimpleForm();
    fetchData();
  };

  const handleEditSimple = (action) => {
      setSimpleForm({
          id: action.id, 
          title: action.action_title || action.action_name, 
          description: action.description || '',
          credits: action.impact_credits_value, 
          target_role: action.target_role || 'all',
          action_type: action.action_type,
          is_active: action.is_active,
          is_visible: action.is_visible
      });
      setIsEditingSimple(true);
  };

  const handleDeleteSimple = async (id) => {
      if(!confirm("Delete this quest action?")) return;
      await supabase.from('gamification_actions').delete().eq('id', id);
      fetchData();
  };
  
  const resetSimpleForm = () => {
      setSimpleForm({ 
          id: null, title: '', description: '', credits: '', target_role: 'all', action_type: 'Quest',
          is_active: true, is_visible: true 
      });
      setIsEditingSimple(false);
  };

  const openTranslation = (item, type) => {
      setTransItem(item);
      setTransType(type);
      setTransModalOpen(true);
  };

  // --- HANDLERS GENESIS ---
  const handleOpenGenesisDialog = (mission = null) => {
    if (mission) {
      setEditingGenesisId(mission.id);
      let opts = mission.response_options;
      if (!Array.isArray(opts)) opts = [];
      setGenesisForm({
        title: mission.title, description: mission.description || '',
        response_type: mission.response_type, impact_credit_reward: mission.impact_credit_reward || 0,
        status: mission.status || 'draft', target_role: mission.target_role || 'all',
        response_options: opts, correct_answers: mission.correct_answers
      });
    } else {
      setEditingGenesisId(null);
      setGenesisForm({
        title: '', description: '', response_type: 'single_choice',
        impact_credit_reward: 0, status: 'draft', target_role: 'all',
        response_options: ['', ''], correct_answers: null
      });
    }
    setIsGenesisDialogOpen(true);
  };

  const handleSaveGenesis = async () => {
      if (!genesisForm.title) return toast({title: "Title required", variant: "destructive"});
      
      const payload = {
        title: genesisForm.title, description: genesisForm.description,
        response_type: genesisForm.response_type, impact_credit_reward: genesisForm.impact_credit_reward,
        status: genesisForm.status, target_role: genesisForm.target_role,
        response_options: genesisForm.response_options, correct_answers: genesisForm.correct_answers,
        updated_at: new Date().toISOString()
      };

      if (!editingGenesisId) {
         const { data: { user } } = await supabase.auth.getUser();
         payload.created_by = user?.id;
      }

      const { error } = await supabase.from('genesis_missions').upsert(editingGenesisId ? { id: editingGenesisId, ...payload } : payload);
      
      if(error) toast({title: "Error", description: error.message, variant: "destructive"});
      else {
          toast({title: "Success", description: "Genesis Mission Saved"});
          setIsGenesisDialogOpen(false);
          fetchData();
      }
  };

  const handleDeleteGenesis = async (id) => {
      if(!confirm("Delete this mission?")) return;
      await supabase.from('genesis_missions').delete().eq('id', id);
      fetchData();
  };

  const handleGenesisOptionChange = (idx, val) => {
      const newOpts = [...genesisForm.response_options];
      newOpts[idx] = val;
      setGenesisForm({...genesisForm, response_options: newOpts});
  };
  const addGenesisOption = () => setGenesisForm(p => ({...p, response_options: [...p.response_options, '']}));
  const removeGenesisOption = (idx) => {
      const newOpts = genesisForm.response_options.filter((_, i) => i !== idx);
      setGenesisForm(p => ({...p, response_options: newOpts, correct_answers: null})); 
  };
  const handleCorrectAnswerChange = (val, isChecked) => {
      if (genesisForm.response_type === 'multiple_choice') {
          const current = Array.isArray(genesisForm.correct_answers) ? genesisForm.correct_answers : [];
          const newCorrect = isChecked ? [...current, val] : current.filter(i => i !== val);
          setGenesisForm(p => ({...p, correct_answers: newCorrect}));
      } else {
          setGenesisForm(p => ({...p, correct_answers: val}));
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('admin.gamification')}</h2>
            <p className="text-muted-foreground">Manage user quests and complex missions.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="quests" className="flex gap-2"><Target className="w-4 h-4"/> Quests & Missions</TabsTrigger>
          <TabsTrigger value="logs" className="flex gap-2"><List className="w-4 h-4"/> Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="quests" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* SIMPLE QUEST FORM */}
                <Card className="md:col-span-1 border-emerald-500/20 bg-emerald-50/5 h-fit" id="simple-quest-form">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-emerald-700">
                            <Trophy className="w-5 h-5"/> 
                            <CardTitle>{isEditingSimple ? 'Edit Quest' : 'New Simple Quest'}</CardTitle>
                        </div>
                        <CardDescription>Default language (English)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveSimple} className="space-y-4">
                            <Input placeholder="Title" value={simpleForm.title} onChange={e => setSimpleForm({...simpleForm, title: e.target.value})} />
                            <Textarea placeholder="Description" value={simpleForm.description} onChange={e => setSimpleForm({...simpleForm, description: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Credits</Label>
                                    <Input type="number" placeholder="Credits" value={simpleForm.credits} onChange={e => setSimpleForm({...simpleForm, credits: e.target.value})} />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Target Role</Label>
                                    <Select value={simpleForm.target_role} onValueChange={v => setSimpleForm({...simpleForm, target_role: v})}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            <SelectItem value="user">User Common</SelectItem>
                                            <SelectItem value="startnext_user">Startnext User</SelectItem>
                                            <SelectItem value="unlockable">Unlockable (Store Only)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase">Active</Label>
                                    <Switch checked={simpleForm.is_active} onCheckedChange={(c) => setSimpleForm({...simpleForm, is_active: c})} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase">Visible</Label>
                                    <Switch checked={simpleForm.is_visible} onCheckedChange={(c) => setSimpleForm({...simpleForm, is_visible: c})} />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{isEditingSimple ? <Save className="w-4 h-4 mr-2"/> : <Plus className="w-4 h-4 mr-2"/>} {isEditingSimple ? 'Update' : 'Create'}</Button>
                                {isEditingSimple && <Button type="button" variant="ghost" onClick={resetSimpleForm}><X className="w-4 h-4"/></Button>}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* LISTAS (SIMPLE + GENESIS) */}
                <div className="md:col-span-2 space-y-6">
                    {/* SIMPLE QUESTS LIST */}
                    <Card>
                        <CardHeader><CardTitle>Simple Quests</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {questActions.map(m => (
                                    <div key={m.id} className={`flex justify-between items-center p-3 border rounded-lg hover:shadow-sm ${!m.is_visible ? 'opacity-60 bg-slate-50' : ''}`}>
                                        <div>
                                            <div className="font-bold flex items-center gap-2">
                                                {m.action_title || m.action_name}
                                                {!m.is_visible && <EyeOff className="w-3 h-3 text-slate-400"/>}
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">{m.target_role === 'unlockable' ? '🔒 Unlockable' : m.target_role || 'All'}</Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" onClick={() => openTranslation(m, 'simple')} title="Translate"><Globe className="w-4 h-4 text-blue-500"/></Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleEditSimple(m)}><Edit className="w-4 h-4 text-slate-500"/></Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleDeleteSimple(m.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                        </div>
                                    </div>
                                ))}
                                {questActions.length === 0 && <p className="text-sm text-center py-4 text-muted-foreground">No simple quests found.</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* GENESIS MISSIONS LIST */}
                    <div className="border-t pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><FileText className="w-5 h-5 text-purple-600"/> Genesis Missions (Quizzes)</h3>
                            <Button onClick={() => handleOpenGenesisDialog()} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"><Plus className="w-4 h-4 mr-2"/> New Quiz</Button>
                        </div>
                        <div className="space-y-2">
                            {realGenesisMissions.map(m => (
                                <Card key={m.id} className="relative group border-purple-100 hover:border-purple-300 transition-all bg-white">
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold">{m.title}</div>
                                            <Badge variant="secondary" className="text-[10px]">{m.response_type}</Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" onClick={() => openTranslation(m, 'genesis')}><Globe className="w-4 h-4 text-blue-500"/></Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleOpenGenesisDialog(m)}><Edit className="w-4 h-4 text-slate-500"/></Button>
                                            <Button size="icon" variant="ghost" onClick={() => handleDeleteGenesis(m.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {realGenesisMissions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No Genesis missions found.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs">
            <Card>
                <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead className="text-right">Date</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {completions.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>
                                        <div className="font-medium">{c.profiles?.name || 'User'}</div>
                                        <div className="text-xs text-muted-foreground">{c.profiles?.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        {c.action_name} 
                                        <Badge className="ml-2 bg-emerald-100 text-emerald-800 border-0">+{c.impact_credits_awarded}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{format(new Date(c.created_at), 'MMM d, HH:mm')}</TableCell>
                                </TableRow>
                            ))}
                            {completions.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No activity logs.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* GENESIS DIALOG */}
      <Dialog open={isGenesisDialogOpen} onOpenChange={setIsGenesisDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>{editingGenesisId ? 'Edit Mission' : 'Create Genesis Mission'}</DialogTitle>
                  <DialogDescription>Define a complex task or quiz for users.</DialogDescription>
              </DialogHeader>
               <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label>Title (English)</Label>
                      <Input value={genesisForm.title} onChange={e => setGenesisForm({...genesisForm, title: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                      <Label>Description (English)</Label>
                      <Textarea value={genesisForm.description} onChange={e => setGenesisForm({...genesisForm, description: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <Label>Response Type</Label>
                          <Select value={genesisForm.response_type} onValueChange={v => setGenesisForm({...genesisForm, response_type: v})}>
                              <SelectTrigger><SelectValue/></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="single_choice">Single Choice</SelectItem>
                                  <SelectItem value="multiple_choice">Multi Select</SelectItem>
                                  <SelectItem value="abc">A/B/C Test</SelectItem>
                                  <SelectItem value="free_text">Free Text</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label>Reward (IC)</Label>
                          <Input type="number" value={genesisForm.impact_credit_reward} onChange={e => setGenesisForm({...genesisForm, impact_credit_reward: parseInt(e.target.value)})} />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <Label>Status</Label>
                          <Select value={genesisForm.status} onValueChange={v => setGenesisForm({...genesisForm, status: v})}>
                              <SelectTrigger><SelectValue/></SelectTrigger>
                              <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label>Target Audience</Label>
                          <Select value={genesisForm.target_role} onValueChange={v => setGenesisForm({...genesisForm, target_role: v})}>
                              <SelectTrigger><SelectValue/></SelectTrigger>
                              <SelectContent><SelectItem value="all">Everyone</SelectItem><SelectItem value="user">User Common</SelectItem><SelectItem value="startnext_user">Startnext User</SelectItem></SelectContent>
                          </Select>
                      </div>
                  </div>

                  {genesisForm.response_type !== 'free_text' && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-lg border">
                          <div className="flex justify-between items-center">
                              <Label>Response Options (English)</Label>
                              <Button type="button" size="sm" variant="outline" onClick={addGenesisOption}><Plus className="w-3 h-3 mr-1"/> Add Option</Button>
                          </div>
                          <RadioGroup value={String(genesisForm.correct_answers)} onValueChange={v => handleCorrectAnswerChange(parseInt(v), true)}>
                              {genesisForm.response_options.map((opt, idx) => (
                                  <div key={idx} className="flex gap-2 items-center mb-2">
                                      {genesisForm.response_type === 'multiple_choice' ? (
                                          <Checkbox 
                                            checked={Array.isArray(genesisForm.correct_answers) && genesisForm.correct_answers.includes(idx)}
                                            onCheckedChange={(checked) => handleCorrectAnswerChange(idx, checked)}
                                          />
                                      ) : (
                                          <RadioGroupItem value={String(idx)} id={`opt-${idx}`} />
                                      )}
                                      
                                      <Input value={opt} onChange={e => handleGenesisOptionChange(idx, e.target.value)} placeholder={`Option ${idx+1}`} />
                                      <Button type="button" size="icon" variant="ghost" onClick={() => removeGenesisOption(idx)} disabled={genesisForm.response_options.length <= 2}><X className="w-4 h-4 text-red-500"/></Button>
                                  </div>
                              ))}
                          </RadioGroup>
                      </div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGenesisDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleSaveGenesis} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4 mr-2"/> Save Mission</>}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* TRANSLATION MODAL INSTANCE */}
      <GamificationTranslationModal 
          isOpen={transModalOpen}
          onClose={() => setTransModalOpen(false)}
          item={transItem}
          type={transType}
      />
    </div>
  );
};

export default GamificationManagement;