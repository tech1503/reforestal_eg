import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Loader2, Trash2, Edit, Save, X, List, Target, FileText, Globe, UploadCloud, Settings, Calendar, PlayCircle, HelpCircle, Video, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; 

// Helper para evitar el bug de zona horaria (UTC-3) en el Admin
const formatForDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
};

const GamificationTranslationModal = ({ isOpen, onClose, item, type }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeLang, setActiveLang] = useState('es');
    
    const getInitialLangState = () => ({ 
        title: '', subtitle: '', description: '', extra_info: '', success_message: '', response_options: [],
        steps: [] 
    });

    const [translations, setTranslations] = useState({
        es: getInitialLangState(), de: getInitialLangState(), fr: getInitialLangState()
    });

    const fetchTranslations = useCallback(async () => {
        if (!item?.id) return;
        setLoading(true);
        const tableName = type === 'simple' ? 'gamification_action_translations' : 'genesis_mission_translations';
        const idField = type === 'simple' ? 'gamification_action_id' : 'genesis_mission_id';
        const titleField = type === 'simple' ? 'action_title' : 'title'; 

        const { data } = await supabase.from(tableName).select('*').eq(idField, item.id);
        const newTrans = { es: getInitialLangState(), de: getInitialLangState(), fr: getInitialLangState() };

        if (type === 'genesis' && item.steps) {
            const baseSteps = Array.isArray(item.steps) ? item.steps : [];
            ['es', 'de', 'fr'].forEach(l => {
                newTrans[l].steps = baseSteps.map(s => ({
                    title: '', content: '', 
                    options: s.options ? [...s.options].fill('') : [], 
                    poles: s.poles ? [...s.poles].fill('') : []
                }));
            });
        }

        if (data) {
            data.forEach(tr => {
                if (newTrans[tr.language_code]) {
                    newTrans[tr.language_code].title = tr[titleField] || '';
                    newTrans[tr.language_code].description = tr.description || '';
                    newTrans[tr.language_code].success_message = tr.success_message || '';
                    
                    if (type === 'genesis') {
                        newTrans[tr.language_code].subtitle = tr.subtitle || '';
                        newTrans[tr.language_code].extra_info = tr.extra_info || '';
                        let parsedStepsTrans = [];
                        if (typeof tr.steps_translation === 'string') {
                            try { parsedStepsTrans = JSON.parse(tr.steps_translation); } catch(e) {}
                        } else if (Array.isArray(tr.steps_translation)) {
                            parsedStepsTrans = tr.steps_translation;
                        }

                        if (parsedStepsTrans.length > 0) {
                            newTrans[tr.language_code].steps = newTrans[tr.language_code].steps.map((s, i) => ({
                                ...s, ...(parsedStepsTrans[i] || {})
                            }));
                        }
                    }
                }
            });
        }
        setTranslations(newTrans);
        setLoading(false);
    }, [item, type]);

    useEffect(() => { if (isOpen && item) fetchTranslations(); }, [isOpen, item, fetchTranslations]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const tableName = type === 'simple' ? 'gamification_action_translations' : 'genesis_mission_translations';
            const idField = type === 'simple' ? 'gamification_action_id' : 'genesis_mission_id';
            const titleField = type === 'simple' ? 'action_title' : 'title';

            const upserts = Object.keys(translations).map(lang => {
                const basePayload = {
                    [idField]: item.id, language_code: lang,
                    [titleField]: translations[lang].title,
                    description: translations[lang].description,
                    success_message: translations[lang].success_message 
                };
                if (type === 'genesis') {
                    basePayload.subtitle = translations[lang].subtitle;
                    basePayload.extra_info = translations[lang].extra_info;
                    basePayload.steps_translation = translations[lang].steps;
                }
                return basePayload;
            });

            const { error } = await supabase.from(tableName).upsert(upserts, { onConflict: `${idField}, language_code` });
            if (error) throw error;
            toast({ title: t('common.success'), description: "Translations updated." });
            onClose();
        } catch (error) {
            toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field, value) => setTranslations(prev => ({ ...prev, [activeLang]: { ...prev[activeLang], [field]: value } }));
    
    const updateStepTrans = (stepIdx, field, value) => {
        setTranslations(prev => {
            const newLang = { ...prev[activeLang] };
            const newSteps = [...newLang.steps];
            newSteps[stepIdx] = { ...newSteps[stepIdx], [field]: value };
            newLang.steps = newSteps;
            return { ...prev, [activeLang]: newLang };
        });
    };

    const updateStepArrayTrans = (stepIdx, arrayField, optIdx, value) => {
        setTranslations(prev => {
            const newLang = { ...prev[activeLang] };
            const newSteps = [...newLang.steps];
            const newArray = [...(newSteps[stepIdx][arrayField] || [])];
            newArray[optIdx] = value;
            newSteps[stepIdx] = { ...newSteps[stepIdx], [arrayField]: newArray };
            newLang.steps = newSteps;
            return { ...prev, [activeLang]: newLang };
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Translate: {item?.action_title || item?.title}</DialogTitle></DialogHeader>
                <Tabs value={activeLang} onValueChange={setActiveLang} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100">
                        <TabsTrigger value="es">Español 🇪🇸</TabsTrigger>
                        <TabsTrigger value="de">Deutsch 🇩🇪</TabsTrigger>
                        <TabsTrigger value="fr">Français 🇫🇷</TabsTrigger>
                    </TabsList>
                    
                    {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-purple-600"/></div> : (
                        <div className="space-y-4 py-2">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2"><Label>Title</Label><Input value={translations[activeLang].title} onChange={e => updateField('title', e.target.value)} /></div>
                                {type === 'genesis' && <div className="space-y-2"><Label>Subtitle</Label><Input value={translations[activeLang].subtitle} onChange={e => updateField('subtitle', e.target.value)} /></div>}
                            </div>
                            <div className="space-y-2"><Label>Description</Label><Textarea value={translations[activeLang].description} onChange={e => updateField('description', e.target.value)} rows={2} /></div>
                            {type === 'genesis' && <div className="space-y-2"><Label>Extra Info / Tooltip</Label><Textarea value={translations[activeLang].extra_info} onChange={e => updateField('extra_info', e.target.value)} rows={2} className="bg-slate-50" /></div>}
                            <div className="space-y-2"><Label className="text-emerald-700">Success Message</Label><Textarea value={translations[activeLang].success_message} onChange={e => updateField('success_message', e.target.value)} className="bg-emerald-50/30" rows={2} /></div>
                            
                            {type === 'genesis' && item?.steps?.length > 0 && (
                                <div className="pt-6 border-t space-y-4">
                                    <Label className="text-purple-700 font-bold flex items-center gap-2 text-lg"><List className="w-5 h-5"/> Translate Steps</Label>
                                    <p className="text-xs text-muted-foreground mb-4">Translate the internal questions and options for each step.</p>
                                    
                                    {item.steps.map((step, sIdx) => (
                                        <div key={sIdx} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-sm">
                                            <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200 border-0">Step {sIdx + 1}: {step.type}</Badge>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-600">Title ({activeLang}) <span className="font-normal opacity-70 ml-2">EN: "{step.title}"</span></Label>
                                                <Input value={translations[activeLang].steps?.[sIdx]?.title || ''} onChange={e => updateStepTrans(sIdx, 'title', e.target.value)} />
                                            </div>
                                            {step.content && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-slate-600">Content / Question ({activeLang})</Label>
                                                    <Textarea value={translations[activeLang].steps?.[sIdx]?.content || ''} onChange={e => updateStepTrans(sIdx, 'content', e.target.value)} rows={2}/>
                                                </div>
                                            )}
                                            {step.options && step.options.length > 0 && (
                                                <div className="space-y-3 pt-3 border-t border-slate-200">
                                                    <Label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Answer Options</Label>
                                                    {step.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                            <span className="text-[11px] text-slate-500 sm:w-1/3 truncate" title={opt}>EN: {opt}</span>
                                                            <Input className="h-8 flex-1" placeholder="Translated option..." value={translations[activeLang].steps?.[sIdx]?.options?.[oIdx] || ''} onChange={e => updateStepArrayTrans(sIdx, 'options', oIdx, e.target.value)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {step.poles && step.poles.length > 0 && (
                                                <div className="space-y-3 pt-3 border-t border-slate-200">
                                                    <Label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Slider Poles</Label>
                                                    {step.poles.map((pole, pIdx) => (
                                                        <div key={pIdx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                            <span className="text-[11px] text-slate-500 sm:w-1/3 truncate" title={pole}>EN: {pole}</span>
                                                            <Input className="h-8 flex-1" placeholder="Translated pole..." value={translations[activeLang].steps?.[sIdx]?.poles?.[pIdx] || ''} onChange={e => updateStepArrayTrans(sIdx, 'poles', pIdx, e.target.value)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Tabs>
                <DialogFooter className="mt-4 bg-white sticky bottom-0 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const GamificationManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef(null); 
  
  const [realGenesisMissions, setRealGenesisMissions] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [transModalOpen, setTransModalOpen] = useState(false);
  const [transItem, setTransItem] = useState(null);
  const [isGenesisDialogOpen, setIsGenesisDialogOpen] = useState(false);
  const [editingGenesisId, setEditingGenesisId] = useState(null);
  const [builderTab, setBuilderTab] = useState('general');

  const [genesisForm, setGenesisForm] = useState({
    title: '', subtitle: '', description: '', extra_info: '', image_url: '',
    impact_credit_reward: 0, reputation_reward: 0, skill_category: 'general',
    status: 'draft', target_role: 'all', start_date: '', end_date: '',
    allow_skip: false, skip_penalty: 0, steps: [] 
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.from('genesis_missions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setRealGenesisMissions(data || []);
    } catch (e) {
        console.error("Fetch Error", e);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast({ variant: 'destructive', description: 'Invalid image file.' });
    if (file.size > 5 * 1024 * 1024) return toast({ variant: 'destructive', description: 'Image must be less than 5MB.' });

    setUploadingImage(true);
    try {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('mission-assets').upload(`mission_banners/${fileName}`, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('mission-assets').getPublicUrl(`mission_banners/${fileName}`);
        setGenesisForm(prev => ({ ...prev, image_url: publicUrl }));
        toast({ title: 'Success', description: 'Image uploaded successfully.', className: "bg-emerald-50 border-emerald-200 text-emerald-900" });
    } catch (error) {
        toast({ variant: 'destructive', description: error.message });
    } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleOpenGenesisDialog = (mission = null) => {
    setBuilderTab('general');
    if (mission) {
      setEditingGenesisId(mission.id);
      setGenesisForm({
        title: mission.title, subtitle: mission.subtitle || '', description: mission.description || '', 
        extra_info: mission.extra_info || '', image_url: mission.image_url || '',
        impact_credit_reward: mission.impact_credit_reward || 0, reputation_reward: mission.reputation_reward || 0,
        skill_category: mission.skill_category || 'general', status: mission.status || 'draft', target_role: mission.target_role || 'all',
        
        // Uso del helper para evitar el bug de zona horaria
        start_date: formatForDatetimeLocal(mission.start_date), 
        end_date: formatForDatetimeLocal(mission.end_date),
        
        allow_skip: mission.allow_skip || false, skip_penalty: mission.skip_penalty || 0,
        steps: Array.isArray(mission.steps) && mission.steps.length > 0 ? mission.steps : [] 
      });
    } else {
      setEditingGenesisId(null);
      setGenesisForm({
        title: '', subtitle: '', description: '', extra_info: '', image_url: '',
        impact_credit_reward: 0, reputation_reward: 0, skill_category: 'general', status: 'draft', target_role: 'all', 
        start_date: '', end_date: '', allow_skip: false, skip_penalty: 0, steps: []
      });
    }
    setIsGenesisDialogOpen(true);
  };

  const handleSaveGenesis = async () => {
      if (!genesisForm.title) return toast({title: "Title required", variant: "destructive"});
      
      const payload = {
        title: genesisForm.title, subtitle: genesisForm.subtitle, description: genesisForm.description,
        extra_info: genesisForm.extra_info, image_url: genesisForm.image_url,
        impact_credit_reward: genesisForm.impact_credit_reward, reputation_reward: genesisForm.reputation_reward,
        skill_category: genesisForm.skill_category, 
        start_date: genesisForm.start_date ? new Date(genesisForm.start_date).toISOString() : null,
        end_date: genesisForm.end_date ? new Date(genesisForm.end_date).toISOString() : null, 
        allow_skip: genesisForm.allow_skip,
        skip_penalty: genesisForm.skip_penalty, status: genesisForm.status, target_role: genesisForm.target_role,
        steps: genesisForm.steps, updated_at: new Date().toISOString()
      };
      
      if (!editingGenesisId) {
         const { data: { user } } = await supabase.auth.getUser();
         payload.created_by = user?.id;
         payload.response_type = 'multi_step'; 
      }
      
      const { error } = await supabase.from('genesis_missions').upsert(editingGenesisId ? { id: editingGenesisId, ...payload } : payload);
      
      if(error) toast({title: "Error", description: error.message, variant: "destructive"});
      else {
          toast({title: "Success", description: "Advanced Mission Saved", className: "bg-purple-50 border-purple-200 text-purple-900"});
          setIsGenesisDialogOpen(false);
          fetchData();
      }
  };

  const handleDeleteGenesis = async (id) => {
      if(!window.confirm("¿Eliminar esta misión de forma permanente? (Los usuarios conservarán sus puntos ganados).")) return;
      
      setLoading(true);
      try {
          const { error } = await supabase.from('genesis_missions').delete().eq('id', id);
          if (error) throw error;
          toast({ title: t('common.success', 'Éxito'), description: "La misión ha sido eliminada por completo." });
          fetchData();
      } catch (error) {
          console.error("Delete Error:", error);
          toast({ variant: "destructive", title: t('common.error', 'Error'), description: error.message });
      } finally {
          setLoading(false);
      }
  };

  const addStep = (type) => {
      const newStep = {
          id: `step_${Date.now()}`, type: type, ui_type: type === 'content' ? 'text' : 'single_choice',
          title: `New ${type} step`, content: '', media_url: '', options: ['Option A', 'Option B'], 
          poles: ['Social', 'Tech', 'Marketing'], correct_answer: '', is_required: true, on_fail_redirect: ''
      };
      setGenesisForm(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const updateStep = (index, field, value) => {
      const newSteps = [...genesisForm.steps];
      newSteps[index][field] = value;
      setGenesisForm({ ...genesisForm, steps: newSteps });
  };
  const removeStep = (index) => {
      const newSteps = [...genesisForm.steps];
      newSteps.splice(index, 1);
      setGenesisForm({ ...genesisForm, steps: newSteps });
  };
  const moveStep = (index, direction) => {
      const newSteps = [...genesisForm.steps];
      if (direction === 'up' && index > 0) [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      else if (direction === 'down' && index < newSteps.length - 1) [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
      setGenesisForm({ ...genesisForm, steps: newSteps });
  };
  const addOptionToStep = (stepIndex, arrayField) => {
      const newSteps = [...genesisForm.steps];
      newSteps[stepIndex][arrayField].push(`New ${arrayField === 'poles' ? 'Pole' : 'Option'}`);
      setGenesisForm({ ...genesisForm, steps: newSteps });
  };
  const updateArrayOption = (stepIndex, arrayField, optIndex, value) => {
      const newSteps = [...genesisForm.steps];
      newSteps[stepIndex][arrayField][optIndex] = value;
      setGenesisForm({ ...genesisForm, steps: newSteps });
  };
  const removeArrayOption = (stepIndex, arrayField, optIndex) => {
      const newSteps = [...genesisForm.steps];
      newSteps[stepIndex][arrayField].splice(optIndex, 1);
      setGenesisForm({ ...genesisForm, steps: newSteps });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('gamification_admin.quest_engine.title', 'Advanced Quest Engine')}</h2>
            <p className="text-muted-foreground">{t('gamification_admin.quest_engine.subtitle', 'Build multi-step interactive missions, manage skills and reputation.')}</p>
        </div>
      </div>

      <div className="border border-slate-200 bg-slate-50 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><FileText className="w-5 h-5 text-purple-600"/> {t('gamification_admin.quest_engine.rpg_missions', 'Advanced RPG Missions')}</h3>
              <Button onClick={() => handleOpenGenesisDialog()} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"><Plus className="w-4 h-4 mr-2"/> {t('gamification_admin.quest_engine.build_new', 'Build New Mission')}</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {realGenesisMissions.map(m => (
                  <Card key={m.id} className="relative group border-slate-200 hover:border-purple-400 transition-all bg-white overflow-hidden shadow-sm hover:shadow-md">
                      {m.image_url && <img src={m.image_url} alt="Cover" className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                      <CardContent className="p-5">
                          <div className="flex justify-between items-start mb-2">
                              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 text-[10px] uppercase">{m.skill_category || 'General'}</Badge>
                              <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{m.status}</Badge>
                          </div>
                          <h4 className="font-bold text-lg mb-1 truncate">{m.title}</h4>
                          <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{m.description}</p>
                          
                          <div className="flex gap-2 mb-4 text-xs font-semibold">
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+{m.impact_credit_reward} {t('rewards.bonus_points_short', 'BP')}</span>
                              {m.reputation_reward > 0 && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">+{m.reputation_reward} {t('rewards.reputation', 'Rep')}</span>}
                              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">{(m.steps || []).length} Steps</span>
                          </div>

                          <div className="flex gap-1 border-t pt-3 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => { setTransItem(m); setTransModalOpen(true); }} title="Translations" className="h-8"><Globe className="w-4 h-4 text-blue-500"/></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleOpenGenesisDialog(m)} title="Edit Builder" className="h-8"><Edit className="w-4 h-4 text-slate-500"/></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteGenesis(m.id)} title="Delete" className="h-8"><Trash2 className="w-4 h-4 text-red-500"/></Button>
                          </div>
                      </CardContent>
                  </Card>
              ))}
              {realGenesisMissions.length === 0 && !loading && <p className="col-span-full text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-xl">{t('gamification_admin.quest_engine.no_missions', 'No interactive missions found. Click "Build New Mission" to start.')}</p>}
              {loading && <div className="col-span-full flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>}
          </div>
      </div>

      <Dialog open={isGenesisDialogOpen} onOpenChange={setIsGenesisDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0 bg-slate-50">
              <div className="bg-white border-b px-6 py-4 flex justify-between items-center z-10 shadow-sm">
                  <div>
                      <DialogTitle className="text-xl text-purple-900 font-black">
                          {editingGenesisId ? t('admin.quest_builder.modal_title_edit', 'Edit Interactive Mission') : t('admin.quest_builder.modal_title_new', 'Quest Builder Studio')}
                      </DialogTitle>
                      <DialogDescription>{t('admin.quest_builder.modal_desc', 'Design the learning flow, rewards, and conditions.')}</DialogDescription>
                  </div>
                  <Button onClick={handleSaveGenesis} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} {t('admin.quest_builder.save_mission', 'Save Mission')}
                  </Button>
              </div>

              <Tabs value={builderTab} onValueChange={setBuilderTab} className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-white border-b px-6 pt-2">
                    <TabsList className="bg-transparent gap-6 p-0 h-auto">
                        <TabsTrigger value="general" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none pb-2 text-sm font-bold bg-transparent shadow-none"><Settings className="w-4 h-4 mr-2"/> {t('admin.quest_builder.tab_general', 'General')}</TabsTrigger>
                        <TabsTrigger value="rules" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none pb-2 text-sm font-bold bg-transparent shadow-none"><Target className="w-4 h-4 mr-2"/> {t('admin.quest_builder.tab_rules', 'Rules & Rewards')}</TabsTrigger>
                        <TabsTrigger value="steps" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none pb-2 text-sm font-bold bg-transparent shadow-none"><List className="w-4 h-4 mr-2"/> {t('admin.quest_builder.tab_steps', 'Steps Builder')} ({(genesisForm.steps || []).length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                      <TabsContent value="general" className="mt-0 space-y-6 max-w-3xl mx-auto">
                          <Card className="shadow-sm border-0"><CardContent className="p-6 space-y-4">
                              <div className="space-y-2">
                                  <Label>{t('admin.quest_builder.cover_image', 'Cover Image (Banner)')}</Label>
                                  <div className="flex items-center gap-4">
                                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                      {genesisForm.image_url ? (
                                          <div className="relative w-full h-40 rounded-xl overflow-hidden group border border-slate-200 shadow-inner">
                                              <img src={genesisForm.image_url} alt="Cover" className="w-full h-full object-cover" />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                  <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current.click()}>{t('admin.quest_builder.change_image', 'Change Image')}</Button>
                                                  <Button type="button" size="icon" variant="destructive" onClick={() => setGenesisForm({...genesisForm, image_url: ''})}><Trash2 className="w-4 h-4"/></Button>
                                              </div>
                                          </div>
                                      ) : (
                                          <Button type="button" variant="outline" className="w-full h-32 border-dashed bg-slate-50 hover:bg-slate-100 flex flex-col gap-2 text-slate-500" onClick={() => fileInputRef.current.click()} disabled={uploadingImage}>
                                              {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin"/> : <UploadCloud className="w-6 h-6"/>}
                                              {uploadingImage ? t('admin.quest_builder.uploading', 'Uploading...') : t('admin.quest_builder.upload_image', 'Click to upload Cover Image (Optional)')}
                                          </Button>
                                      )}
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2"><Label>{t('admin.quest_builder.main_title', 'Main Title *')}</Label><Input value={genesisForm.title} onChange={e => setGenesisForm({...genesisForm, title: e.target.value})} placeholder={t('admin.quest_builder.main_title_placeholder', 'e.g. The Amazon Ecosystem')} className="font-bold text-lg"/></div>
                                  <div className="space-y-2"><Label>{t('admin.quest_builder.subtitle', 'Subtitle')}</Label><Input value={genesisForm.subtitle} onChange={e => setGenesisForm({...genesisForm, subtitle: e.target.value})} placeholder={t('admin.quest_builder.subtitle_placeholder', 'A short catchy phrase')}/></div>
                              </div>
                              <div className="space-y-2"><Label>{t('admin.quest_builder.mission_desc', 'Mission Description (Intro Text)')}</Label><Textarea value={genesisForm.description} onChange={e => setGenesisForm({...genesisForm, description: e.target.value})} rows={3} /></div>
                              <div className="space-y-2"><Label>{t('admin.quest_builder.extra_info', 'Extra Info (Tooltip / Hint)')}</Label><Textarea value={genesisForm.extra_info} onChange={e => setGenesisForm({...genesisForm, extra_info: e.target.value})} rows={2} className="bg-amber-50" placeholder={t('admin.quest_builder.extra_info_placeholder', 'Optional context to help users...')} /></div>
                          </CardContent></Card>
                      </TabsContent>

                      <TabsContent value="rules" className="mt-0 space-y-6 max-w-3xl mx-auto">
                          <Card className="shadow-sm border-0"><CardContent className="p-6 grid grid-cols-2 gap-6">
                              <div className="col-span-2 md:col-span-1 space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                  <h4 className="font-bold text-emerald-800 flex items-center gap-2"><Trophy className="w-4 h-4"/> {t('admin.quest_builder.completion_rewards', 'Completion Rewards')}</h4>
                                  <div className="space-y-2"><Label className="text-emerald-700">{t('rewards.bonus_points', 'Bonos')}</Label><Input type="number" min="0" value={genesisForm.impact_credit_reward} onChange={e => setGenesisForm({...genesisForm, impact_credit_reward: parseInt(e.target.value)})} className="bg-white border-emerald-200 font-mono font-bold"/></div>
                                  <div className="space-y-2"><Label className="text-amber-700">{t('rewards.reputation', 'Reputación')}</Label><Input type="number" min="0" value={genesisForm.reputation_reward} onChange={e => setGenesisForm({...genesisForm, reputation_reward: parseInt(e.target.value)})} className="bg-white border-amber-200 font-mono font-bold"/></div>
                                  <div className="space-y-2">
                                      <Label>{t('admin.quest_builder.skill_category', 'Skill Tree Category')}</Label>
                                      <Select value={genesisForm.skill_category} onValueChange={v => setGenesisForm({...genesisForm, skill_category: v})}>
                                          <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="general">General</SelectItem>
                                              <SelectItem value="finance">Finance / Economy</SelectItem>
                                              <SelectItem value="ecology">Ecology / Conservation</SelectItem>
                                              <SelectItem value="community">Community / Social</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                              <div className="col-span-2 md:col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-4 h-4"/> {t('admin.quest_builder.availability', 'Availability & Limits')}</h4>
                                  <div className="space-y-2"><Label>{t('admin.quest_builder.status', 'Status')}</Label>
                                      <Select value={genesisForm.status} onValueChange={v => setGenesisForm({...genesisForm, status: v})}>
                                          <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                          <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                                      </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t('admin.audience.label', 'Target Audience')}</Label>
                                    <Select value={genesisForm.target_role} onValueChange={v => setGenesisForm({...genesisForm, target_role: v})}>
                                        <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('admin.audience.all', 'Everyone')}</SelectItem>
                                            <SelectItem value="user">{t('admin.audience.user', 'Standard User')}</SelectItem>
                                            <SelectItem value="startnext_user">{t('admin.audience.startnext_user', 'Startnext Supporter')}</SelectItem>
                                            <SelectItem value="pioneer">{t('admin.audience.pioneer', 'Founding Pioneer')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                  <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-2"><Label className="text-[10px]">{t('admin.quest_builder.start_date', 'Start Date (Optional)')}</Label><Input type="datetime-local" value={genesisForm.start_date} onChange={e => setGenesisForm({...genesisForm, start_date: e.target.value})} className="text-xs"/></div>
                                      <div className="space-y-2"><Label className="text-[10px]">{t('admin.quest_builder.end_date', 'End Date (Optional)')}</Label><Input type="datetime-local" value={genesisForm.end_date} onChange={e => setGenesisForm({...genesisForm, end_date: e.target.value})} className="text-xs"/></div>
                                  </div>
                              </div>
                              <div className="col-span-2 space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                  <div className="flex items-center justify-between">
                                      <div>
                                          <h4 className="font-bold text-blue-800 flex items-center gap-2">{t('admin.quest_builder.allow_skip', 'Allow Skipping')}</h4>
                                          <p className="text-xs text-blue-600/80">{t('admin.quest_builder.allow_skip_desc', 'Can users skip this entire mission?')}</p>
                                      </div>
                                      <Switch checked={genesisForm.allow_skip} onCheckedChange={(c) => setGenesisForm({...genesisForm, allow_skip: c})} />
                                  </div>
                                  {genesisForm.allow_skip && (
                                      <div className="pt-2 border-t border-blue-200/50 space-y-2">
                                          <Label className="text-blue-800">{t('admin.quest_builder.skip_penalty', 'Skip Penalty (Deducted from Reputation)')}</Label>
                                          <Input type="number" value={genesisForm.skip_penalty} onChange={e => setGenesisForm({...genesisForm, skip_penalty: parseInt(e.target.value)})} className="bg-white max-w-[200px]" placeholder="e.g. 10"/>
                                      </div>
                                  )}
                              </div>
                          </CardContent></Card>
                      </TabsContent>

                      <TabsContent value="steps" className="mt-0">
                          <div className="flex gap-4">
                              <div className="flex-1 space-y-4">
                                  {genesisForm.steps?.length === 0 && (
                                      <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
                                          <List className="w-12 h-12 text-slate-300 mx-auto mb-4"/>
                                          <h3 className="text-lg font-bold text-slate-600 mb-2">{t('admin.quest_builder.no_steps_title', 'No steps yet')}</h3>
                                          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">{t('admin.quest_builder.no_steps_desc', 'Create your first block to start building the mission flow.')}</p>
                                          <div className="flex justify-center gap-3">
                                              <Button onClick={() => addStep('content')} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"><PlayCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_content', 'Add Content')}</Button>
                                              <Button onClick={() => addStep('question')} variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"><HelpCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_question', 'Add Question')}</Button>
                                          </div>
                                      </div>
                                  )}

                                  {genesisForm.steps?.map((step, index) => (
                                      <Card key={step.id} className="relative overflow-visible border-slate-300 shadow-md">
                                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                              <Button type="button" size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-sm" onClick={() => moveStep(index, 'up')} disabled={index === 0}>↑</Button>
                                              <Button type="button" size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-sm" onClick={() => moveStep(index, 'down')} disabled={index === genesisForm.steps.length - 1}>↓</Button>
                                          </div>
                                          <CardHeader className="bg-slate-100 py-3 px-5 border-b rounded-t-xl flex flex-row items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                  <Badge className={step.type === 'content' ? 'bg-blue-600' : 'bg-emerald-600'}>
                                                      {t('admin.quest_builder.step', 'Step')} {index + 1}: {step.type.toUpperCase()}
                                                  </Badge>
                                                  <Input value={step.title} onChange={e => updateStep(index, 'title', e.target.value)} className="h-8 w-64 bg-white border-transparent hover:border-slate-300 font-bold" placeholder={t('admin.quest_builder.step_title', 'Step Title')}/>
                                              </div>
                                              <Button type="button" size="icon" variant="ghost" className="text-red-500 hover:bg-red-100" onClick={() => removeStep(index)}><Trash2 className="w-4 h-4"/></Button>
                                          </CardHeader>
                                          <CardContent className="p-5 space-y-5 bg-white rounded-b-xl">
                                              {step.type === 'content' && (
                                                  <>
                                                      <div className="grid grid-cols-2 gap-4">
                                                          <div className="space-y-2">
                                                              <Label className="flex items-center gap-2"><Video className="w-4 h-4"/> {t('admin.quest_builder.media_url', 'Media URL (Video/Image)')}</Label>
                                                              <Input value={step.media_url} onChange={e => updateStep(index, 'media_url', e.target.value)} placeholder="https://youtube.com/..."/>
                                                          </div>
                                                          <div className="space-y-2">
                                                              <Label>{t('admin.quest_builder.ui_type', 'UI Type')}</Label>
                                                              <Select value={step.ui_type} onValueChange={v => updateStep(index, 'ui_type', v)}>
                                                                  <SelectTrigger><SelectValue/></SelectTrigger>
                                                                  <SelectContent><SelectItem value="text">Text Only</SelectItem><SelectItem value="video">Video Embed</SelectItem><SelectItem value="image">Image Embed</SelectItem></SelectContent>
                                                              </Select>
                                                          </div>
                                                      </div>
                                                      <div className="space-y-2">
                                                          <Label>{t('admin.quest_builder.content_md', 'Content (Markdown supported)')}</Label>
                                                          <Textarea value={step.content} onChange={e => updateStep(index, 'content', e.target.value)} rows={4} placeholder={t('admin.quest_builder.content_placeholder', 'Write the educational content here...')}/>
                                                      </div>
                                                  </>
                                              )}
                                              {step.type === 'question' && (
                                                  <>
                                                      <div className="grid grid-cols-2 gap-6">
                                                          <div className="space-y-4">
                                                              <div className="space-y-2">
                                                                  <Label>{t('admin.quest_builder.question_type', 'Question Component Type')}</Label>
                                                                  <Select value={step.ui_type} onValueChange={v => updateStep(index, 'ui_type', v)}>
                                                                      <SelectTrigger className="border-emerald-200 bg-emerald-50/30 font-bold text-emerald-800"><SelectValue/></SelectTrigger>
                                                                      <SelectContent>
                                                                          <SelectItem value="single_choice">Single Choice (Radio)</SelectItem>
                                                                          <SelectItem value="multiple_choice">Multiple Choice (Checkboxes)</SelectItem>
                                                                          <SelectItem value="scale_5">1 to 5 Scale (Rating)</SelectItem>
                                                                          <SelectItem value="circular_slider">Circular Slider (Multi-polar)</SelectItem>
                                                                          <SelectItem value="free_text">Free Text (Requires Manual Review)</SelectItem>
                                                                      </SelectContent>
                                                                  </Select>
                                                              </div>
                                                              <div className="space-y-2">
                                                                  <Label>{t('admin.quest_builder.question_text', 'Question Text')}</Label>
                                                                  <Textarea value={step.content} onChange={e => updateStep(index, 'content', e.target.value)} rows={3} placeholder={t('admin.quest_builder.ask_something', 'Ask something...')}/>
                                                              </div>
                                                              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded border">
                                                                  <div className="flex items-center space-x-2">
                                                                      <Switch checked={step.is_required} onCheckedChange={(c) => updateStep(index, 'is_required', c)} />
                                                                      <Label>{t('admin.quest_builder.required', 'Required?')}</Label>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                          <div className="space-y-4 border-l pl-6">
                                                              {['single_choice', 'multiple_choice'].includes(step.ui_type) && (
                                                                  <div className="space-y-3">
                                                                      <Label className="flex justify-between items-center">{t('admin.quest_builder.answers', 'Answers')} <Button type="button" size="sm" variant="ghost" onClick={()=>addOptionToStep(index, 'options')} className="h-6 text-xs text-blue-600"><Plus className="w-3 h-3 mr-1"/>{t('admin.quest_builder.add_option', 'Add Option')}</Button></Label>
                                                                      {(step.options || []).map((opt, oIdx) => {
                                                                          const isMulti = step.ui_type === 'multiple_choice';
                                                                          const optStr = String(oIdx);
                                                                          
                                                                          let isCorrect = false;
                                                                          if (isMulti) {
                                                                              if (Array.isArray(step.correct_answer)) {
                                                                                  isCorrect = step.correct_answer.map(String).includes(optStr);
                                                                              } else if (typeof step.correct_answer === 'string' && step.correct_answer.trim() !== '') {
                                                                                  isCorrect = step.correct_answer.split(',').map(s=>s.trim()).includes(optStr);
                                                                              }
                                                                          } else {
                                                                              isCorrect = String(step.correct_answer) === optStr;
                                                                          }

                                                                          const handleToggleCorrect = () => {
                                                                              if (!isMulti) {
                                                                                  updateStep(index, 'correct_answer', optStr);
                                                                              } else {
                                                                                  let current = [];
                                                                                  if (Array.isArray(step.correct_answer)) {
                                                                                      current = [...step.correct_answer].map(String);
                                                                                  } else if (typeof step.correct_answer === 'string' && step.correct_answer.trim() !== '') {
                                                                                      current = step.correct_answer.split(',').map(s => s.trim());
                                                                                  }
                                                                                  if (current.includes(optStr)) {
                                                                                      current = current.filter(val => val !== optStr);
                                                                                  } else {
                                                                                      current.push(optStr);
                                                                                  }
                                                                                  current.sort((a, b) => Number(a) - Number(b));
                                                                                  updateStep(index, 'correct_answer', current.join(','));
                                                                              }
                                                                          };

                                                                          return (
                                                                              <div key={oIdx} className="flex gap-2 items-center">
                                                                                  <Button 
                                                                                    type="button" 
                                                                                    variant={isCorrect ? 'default' : 'outline'}
                                                                                    size="icon" 
                                                                                    className={`shrink-0 w-8 h-8 ${isMulti ? 'rounded-md' : 'rounded-full'} ${isCorrect ? 'bg-green-500 hover:bg-green-600 text-white border-none' : 'text-slate-400'}`}
                                                                                    onClick={handleToggleCorrect}
                                                                                    title={isMulti ? "Alternar como respuesta correcta" : "Marcar como respuesta correcta"}
                                                                                  >
                                                                                    <Check className="w-4 h-4" />
                                                                                  </Button>
                                                                                  <Input value={opt} onChange={e => updateArrayOption(index, 'options', oIdx, e.target.value)} className="h-8"/>
                                                                                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={()=>removeArrayOption(index, 'options', oIdx)}><X className="w-3 h-3"/></Button>
                                                                              </div>
                                                                          );
                                                                      })}
                                                                      
                                                                      {/* Mantenemos esto oculto ya que ahora es visual, pero por si acaso */}
                                                                      {step.ui_type === 'multiple_choice' && (
                                                                        <div className="pt-2 space-y-2 mt-2 hidden">
                                                                            <Label className="text-xs text-emerald-600">{t('admin.quest_builder.correct_answer_index', 'Correct Answer Index (e.g. 0, or 0,2)')}</Label>
                                                                            <Input value={step.correct_answer || ''} onChange={e => updateStep(index, 'correct_answer', e.target.value)} placeholder={t('admin.quest_builder.correct_answer_placeholder', 'Leave blank if any answer is correct')} className="h-8"/>
                                                                        </div>
                                                                      )}
                                                                  </div>
                                                              )}
                                                              {step.ui_type === 'circular_slider' && (
                                                                  <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                                                      <Label className="flex justify-between items-center text-indigo-900">{t('admin.quest_builder.slider_poles', 'Define Slider Poles')} <Button type="button" size="sm" variant="ghost" onClick={()=>addOptionToStep(index, 'poles')} className="h-6 text-xs text-indigo-600"><Plus className="w-3 h-3 mr-1"/>Add Pole</Button></Label>
                                                                      <p className="text-[10px] text-indigo-600/80 mb-2">{t('admin.quest_builder.slider_poles_desc', 'Users will distribute 100% between these variables.')}</p>
                                                                      {(step.poles || []).map((pole, pIdx) => (
                                                                          <div key={pIdx} className="flex gap-2 items-center">
                                                                              <Input value={pole} onChange={e => updateArrayOption(index, 'poles', pIdx, e.target.value)} className="h-8 bg-white border-indigo-200" placeholder="e.g. Social Impact"/>
                                                                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={()=>removeArrayOption(index, 'poles', pIdx)}><X className="w-3 h-3"/></Button>
                                                                          </div>
                                                                      ))}
                                                                  </div>
                                                              )}
                                                              {step.ui_type === 'free_text' && (
                                                                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-800 text-sm">
                                                                      <strong>{t('admin.quest_builder.free_text_note', 'Note: Free text answers will mark the mission as "Pending Review". A Guardian (Admin) must manually approve it to grant the rewards.')}</strong>
                                                                  </div>
                                                              )}
                                                              {step.ui_type === 'scale_5' && (
                                                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 text-sm text-center">
                                                                      {t('admin.quest_builder.scale_5_note', 'Renders a 1 to 5 clickable star/number scale automatically.')}
                                                                  </div>
                                                              )}
                                                              {step.correct_answer && (
                                                                  <div className="pt-4 border-t space-y-2 mt-4">
                                                                      <Label className="text-xs text-red-600">{t('admin.quest_builder.on_fail_redirect', 'On Fail Redirect URL (Bridge-Quest)')}</Label>
                                                                      <Input value={step.on_fail_redirect || ''} onChange={e => updateStep(index, 'on_fail_redirect', e.target.value)} placeholder="https://reforest.al/learn/..." className="h-8"/>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </>
                                              )}
                                          </CardContent>
                                      </Card>
                                  ))}
                                  {genesisForm.steps?.length > 0 && (
                                      <div className="flex justify-center gap-3 pt-6 pb-10">
                                          <Button onClick={() => addStep('content')} variant="outline" className="border-blue-200 text-blue-700 bg-white hover:bg-blue-50 shadow-sm"><PlayCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_content', 'Add Content Step')}</Button>
                                          <Button onClick={() => addStep('question')} variant="outline" className="border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 shadow-sm"><HelpCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_question', 'Add Question Step')}</Button>
                                      </div>
                                  )}
                              </div>
                              <div className="hidden lg:block w-64 shrink-0">
                                  <div className="sticky top-6 bg-white rounded-xl border p-4 shadow-sm">
                                      <h4 className="font-bold text-sm text-slate-800 mb-4 uppercase tracking-wider">{t('admin.quest_builder.mission_flow', 'Mission Flow')}</h4>
                                      <div className="space-y-2 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-slate-200">
                                          {genesisForm.steps?.map((s, i) => (
                                              <div key={i} className="flex gap-3 items-center relative z-10">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 ${s.type === 'content' ? 'bg-blue-500' : 'bg-emerald-500'}`}>{i+1}</div>
                                                  <div className="text-xs font-medium truncate bg-slate-50 border rounded px-2 py-1 flex-1">{s.title || 'Untitled'}</div>
                                              </div>
                                          ))}
                                          {genesisForm.steps?.length === 0 && <p className="text-xs text-slate-400 italic ml-6">{t('admin.quest_builder.empty', 'Empty')}</p>}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </TabsContent>
                  </div>
              </Tabs>
          </DialogContent>
      </Dialog>

      <GamificationTranslationModal 
          isOpen={transModalOpen}
          onClose={() => setTransModalOpen(false)}
          item={transItem}
          type="genesis"
      />
    </div>
  );
};

export default GamificationManagement;