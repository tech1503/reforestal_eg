import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Loader2, Trash2, Edit, Save, X, List, Target, FileText, Globe, UploadCloud, Settings, Calendar, PlayCircle, HelpCircle, Video, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; 

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
            toast({ title: t('common.success', 'Success'), description: "Translations updated.", className: "bg-card border-gold/30 text-foreground" });
            onClose();
        } catch (error) {
            toast({ variant: 'destructive', title: t('common.error', 'Error'), description: error.message });
        } finally {
            setLoading(false);
        }
    };

    // ====== LÓGICA DE AUTO-TRADUCCIÓN POR IA ======
    const handleAutoTranslate = async () => {
        setLoading(true);
        try {
            const payload = {
                type: type,
                original: {
                    title: item?.action_title || item?.title || '',
                    subtitle: item?.subtitle || '',
                    description: item?.description || '',
                    extra_info: item?.extra_info || '',
                    success_message: item?.success_message || '',
                    steps: item?.steps || []
                },
                targetLangs: ['es', 'de', 'fr']
            };

            const webhookUrl = 'https://n8n.reforestal.cloud/webhook/translate-content';
            
            if (webhookUrl.includes('TU_WEBHOOK')) {
                toast({ 
                    title: "Action Required", 
                    description: "Por favor, configura la URL de tu Webhook (n8n/OpenAI) en GamificationManagement.jsx para activar esta función.",
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
                setTranslations(prev => ({
                    ...prev,
                    es: { ...prev.es, ...result.es },
                    de: { ...prev.de, ...result.de },
                    fr: { ...prev.fr, ...result.fr }
                }));
                toast({ title: "🪄 Magia completada", description: "Los textos han sido traducidos por IA. Por favor, revisa y guarda los cambios.", className: "bg-card text-foreground border-gold/30" });
            }
        } catch (error) {
            console.error("Auto-translate error:", error);
            toast({ variant: 'destructive', title: t('common.error'), description: "Error during auto-translation: " + error.message });
        } finally {
            setLoading(false);
        }
    };
    // ==============================================

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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background border-border text-foreground">
                <DialogHeader><DialogTitle className="text-foreground">Translate: {item?.action_title || item?.title}</DialogTitle></DialogHeader>
                <Tabs value={activeLang} onValueChange={setActiveLang} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="es" className="rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Español 🇪🇸</TabsTrigger>
                        <TabsTrigger value="de" className="rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Deutsch 🇩🇪</TabsTrigger>
                        <TabsTrigger value="fr" className="rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Français 🇫🇷</TabsTrigger>
                    </TabsList>
                    
                    {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gold"/></div> : (
                        <div className="space-y-4 py-2">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Title</Label>
                                    <Input value={translations[activeLang].title} onChange={e => updateField('title', e.target.value)} className="bg-background border-border focus-visible:ring-gold text-foreground" />
                                </div>
                                {type === 'genesis' && <div className="space-y-2"><Label className="text-foreground">Subtitle</Label><Input value={translations[activeLang].subtitle} onChange={e => updateField('subtitle', e.target.value)} className="bg-background border-border focus-visible:ring-gold text-foreground" /></div>}
                            </div>
                            <div className="space-y-2"><Label className="text-foreground">Description</Label><Textarea value={translations[activeLang].description} onChange={e => updateField('description', e.target.value)} rows={2} className="bg-background border-border focus-visible:ring-gold text-foreground" /></div>
                            {type === 'genesis' && <div className="space-y-2"><Label className="text-foreground">Extra Info / Tooltip</Label><Textarea value={translations[activeLang].extra_info} onChange={e => updateField('extra_info', e.target.value)} rows={2} className="bg-muted/30 border-border text-foreground focus-visible:ring-gold" /></div>}
                            <div className="space-y-2"><Label className="text-emerald-600 dark:text-emerald-400 font-bold">Success Message</Label><Textarea value={translations[activeLang].success_message} onChange={e => updateField('success_message', e.target.value)} className="bg-emerald-500/10 border-emerald-500/20 text-foreground focus-visible:ring-emerald-500" rows={2} /></div>
                            
                            {type === 'genesis' && item?.steps?.length > 0 && (
                                <div className="pt-6 border-t border-border space-y-4">
                                    <Label className="text-gold font-bold flex items-center gap-2 text-lg"><List className="w-5 h-5"/> Translate Steps</Label>
                                    <p className="text-xs text-muted-foreground mb-4">Translate the internal questions and options for each step.</p>
                                    
                                    {item.steps.map((step, sIdx) => {
                                        // LOGICA DE VISIBILIDAD DE CAMPOS DE TRADUCCIÓN:
                                        const showOptions = ['single_choice', 'multiple_choice'].includes(step.ui_type);
                                        const showPoles = step.ui_type === 'circular_slider';

                                        return (
                                            <div key={sIdx} className="p-5 bg-card border border-border rounded-xl space-y-4 shadow-sm">
                                                <Badge className="bg-muted text-muted-foreground hover:bg-muted border-0">Step {sIdx + 1}: {step.type} ({step.ui_type})</Badge>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold text-foreground">Title ({activeLang}) <span className="font-normal opacity-70 ml-2 text-muted-foreground">EN: "{step.title}"</span></Label>
                                                    <Input value={translations[activeLang].steps?.[sIdx]?.title || ''} onChange={e => updateStepTrans(sIdx, 'title', e.target.value)} className="bg-background border-border text-foreground focus-visible:ring-gold"/>
                                                </div>
                                                {step.content && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-semibold text-foreground">Content / Question ({activeLang})</Label>
                                                        <Textarea value={translations[activeLang].steps?.[sIdx]?.content || ''} onChange={e => updateStepTrans(sIdx, 'content', e.target.value)} rows={2} className="bg-background border-border text-foreground focus-visible:ring-gold"/>
                                                    </div>
                                                )}
                                                
                                                {showOptions && step.options && step.options.length > 0 && (
                                                    <div className="space-y-3 pt-3 border-t border-border">
                                                        <Label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Answer Options</Label>
                                                        {step.options.map((opt, oIdx) => (
                                                            <div key={oIdx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                <span className="text-[11px] text-muted-foreground sm:w-1/3 truncate" title={opt}>EN: {opt}</span>
                                                                <Input className="h-8 flex-1 bg-background border-border text-foreground focus-visible:ring-gold" placeholder="Translated option..." value={translations[activeLang].steps?.[sIdx]?.options?.[oIdx] || ''} onChange={e => updateStepArrayTrans(sIdx, 'options', oIdx, e.target.value)} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {showPoles && step.poles && step.poles.length > 0 && (
                                                    <div className="space-y-3 pt-3 border-t border-border">
                                                        <Label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Slider Poles</Label>
                                                        {step.poles.map((pole, pIdx) => (
                                                            <div key={pIdx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                <span className="text-[11px] text-muted-foreground sm:w-1/3 truncate" title={pole}>EN: {pole}</span>
                                                                <Input className="h-8 flex-1 bg-background border-border text-foreground focus-visible:ring-gold" placeholder="Translated pole..." value={translations[activeLang].steps?.[sIdx]?.poles?.[pIdx] || ''} onChange={e => updateStepArrayTrans(sIdx, 'poles', pIdx, e.target.value)} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </Tabs>
                <DialogFooter className="mt-4 bg-background sticky bottom-0 pt-4 border-t border-border flex flex-col sm:flex-row gap-3 sm:justify-between">
                    <div className="w-full sm:w-auto">
                        <Button type="button" onClick={handleAutoTranslate} disabled={loading} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-glow border-none transition-transform active:scale-95">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2 text-yellow-300"/>} 
                            Auto-Translate All (AI)
                        </Button>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" className="flex-1 sm:flex-none border-border text-foreground hover:bg-muted" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
                        <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none bg-gradient-gold text-[#063127] font-bold shadow-glow border-none hover:opacity-90">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#063127]"/> : <Save className="w-4 h-4 mr-2 text-[#063127]"/>} {t('common.save', 'Save')}
                        </Button>
                    </div>
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
    impact_credit_reward: 0, reputation_reward: 0, referrer_reward: 0, skill_category: 'it',
    status: 'draft', target_role: 'all', start_date: '', end_date: '',
    allow_skip: false, skip_penalty: 0, auto_approve: false, global_penalty_percentage: 0, steps: [] 
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
        toast({ title: 'Success', description: 'Image uploaded successfully.', className: "bg-card border-gold/30 text-foreground" });
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
        impact_credit_reward: mission.impact_credit_reward || 0, 
        reputation_reward: mission.reputation_reward || 0,
        referrer_reward: mission.referrer_reward || 0,
        skill_category: mission.skill_category || 'it', 
        status: mission.status || 'draft', 
        target_role: mission.target_role || 'all',
        start_date: formatForDatetimeLocal(mission.start_date), 
        end_date: formatForDatetimeLocal(mission.end_date),
        allow_skip: mission.allow_skip || false, 
        skip_penalty: mission.skip_penalty || 0,
        auto_approve: mission.auto_approve || false,
        global_penalty_percentage: mission.global_penalty_percentage || 0, // Carga del dato global
        steps: Array.isArray(mission.steps) && mission.steps.length > 0 ? mission.steps : [] 
      });
    } else {
      setEditingGenesisId(null);
      setGenesisForm({
        title: '', subtitle: '', description: '', extra_info: '', image_url: '',
        impact_credit_reward: 0, reputation_reward: 0, referrer_reward: 0, skill_category: 'it', status: 'draft', target_role: 'all', 
        start_date: '', end_date: '', allow_skip: false, skip_penalty: 0, auto_approve: false, global_penalty_percentage: 0, steps: []
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
        referrer_reward: genesisForm.referrer_reward,
        skill_category: genesisForm.skill_category, 
        start_date: genesisForm.start_date ? new Date(genesisForm.start_date).toISOString() : null,
        end_date: genesisForm.end_date ? new Date(genesisForm.end_date).toISOString() : null, 
        allow_skip: genesisForm.allow_skip, skip_penalty: genesisForm.skip_penalty, 
        auto_approve: genesisForm.auto_approve,
        global_penalty_percentage: genesisForm.global_penalty_percentage, 
        status: genesisForm.status, target_role: genesisForm.target_role,
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
          toast({title: "Success", description: "Advanced Mission Saved", className: "bg-card border-gold/30 text-foreground"});
          setIsGenesisDialogOpen(false);
          fetchData();
      }
  };

  const handleDeleteGenesis = async (id) => {
      if(!window.confirm(t('admin.quest_builder.delete_confirm', "Permanently delete this mission? (Users will keep their earned points)."))) return;
      
      setLoading(true);
      try {
          const { error } = await supabase.from('genesis_missions').delete().eq('id', id);
          if (error) throw error;
          toast({ title: t('common.success', 'Success'), description: t('admin.quest_builder.delete_success', "The mission has been completely deleted."), className: "bg-card border-gold/30 text-foreground" });
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
          poles: ['Social', 'Tech', 'Marketing'], correct_answer: '', is_required: true, on_fail_redirect: '',
          apply_penalty: false, penalty_type: 'fixed', penalty_value: 0
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
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('gamification_admin.quest_engine.title', 'Advanced Quest Engine')}</h2>
            <p className="text-muted-foreground">{t('gamification_admin.quest_engine.subtitle', 'Build multi-step interactive missions, manage skills and reputation.')}</p>
        </div>
      </div>

      <div className="border border-border bg-card p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground"><FileText className="w-5 h-5 text-gold"/> {t('gamification_admin.quest_engine.rpg_missions', 'Advanced RPG Missions')}</h3>
              <Button onClick={() => handleOpenGenesisDialog()} size="sm" className="bg-gradient-gold text-[#063127] shadow-glow hover:opacity-90 font-bold border-none"><Plus className="w-4 h-4 mr-2"/> {t('gamification_admin.quest_engine.build_new', 'Build New Mission')}</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {realGenesisMissions.map(m => (
                  <Card key={m.id} className="relative group border-border hover:border-gold/50 bg-background transition-all overflow-hidden shadow-sm hover:shadow-md">
                      {m.image_url && <img src={m.image_url} alt="Cover" className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                      <CardContent className="p-5">
                          <div className="flex justify-between items-start mb-2">
                              <Badge className="bg-gold/10 text-gold border-gold/20 text-[10px] uppercase">{m.skill_category}</Badge>
                              <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{m.status}</Badge>
                          </div>
                          <h4 className="font-bold text-lg mb-1 truncate text-foreground">{m.title}</h4>
                          <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{m.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-4 text-xs font-semibold">
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">+{m.impact_credit_reward} {t('rewards.bonus_points_short', 'BP')}</span>
                              {m.reputation_reward > 0 && <span className="text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">+{m.reputation_reward} {t('rewards.reputation', 'Rep')}</span>}
                              {m.referrer_reward > 0 && <span className="text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">+{m.referrer_reward} Ref</span>}
                          </div>

                          <div className="flex gap-1 border-t border-border pt-3 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => { setTransItem(m); setTransModalOpen(true); }} title="Translations" className="h-8 hover:bg-muted/50"><Globe className="w-4 h-4 text-blue-500"/></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleOpenGenesisDialog(m)} title="Edit Builder" className="h-8 hover:bg-muted/50"><Edit className="w-4 h-4 text-muted-foreground"/></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteGenesis(m.id)} title="Delete" className="h-8 hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-red-500"/></Button>
                          </div>
                      </CardContent>
                  </Card>
              ))}
              {realGenesisMissions.length === 0 && !loading && <p className="col-span-full text-sm text-muted-foreground text-center py-8 border-2 border-dashed border-border rounded-xl">{t('gamification_admin.quest_engine.no_missions', 'No interactive missions found. Click "Build New Mission" to start.')}</p>}
              {loading && <div className="col-span-full flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>}
          </div>
      </div>

      <Dialog open={isGenesisDialogOpen} onOpenChange={setIsGenesisDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0 bg-background border-border">
              <div className="bg-card border-b border-border px-6 py-4 flex justify-between items-center z-10 shadow-sm">
                  <div>
                      <DialogTitle className="text-xl text-foreground font-black">
                          {editingGenesisId ? t('admin.quest_builder.modal_title_edit', 'Edit Interactive Mission') : t('admin.quest_builder.modal_title_new', 'Quest Builder Studio')}
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground">{t('admin.quest_builder.modal_desc', 'Design the learning flow, rewards, and conditions.')}</DialogDescription>
                  </div>
                  <Button onClick={handleSaveGenesis} className="bg-gradient-gold text-[#063127] shadow-glow hover:opacity-90 font-bold border-none">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#063127]"/> : <Save className="w-4 h-4 mr-2 text-[#063127]"/>} {t('admin.quest_builder.save_mission', 'Save Mission')}
                  </Button>
              </div>

              <Tabs value={builderTab} onValueChange={setBuilderTab} className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-card border-b border-border px-6 pt-2">
                    <TabsList className="bg-card gap-6 p-0 h-auto">
                        <TabsTrigger value="general" className="data-[state=active]:border-b-2 data-[state=active]:border-gold data-[state=active]:text-gold text-muted-foreground rounded-none pb-2 text-sm font-bold bg-transparent shadow-none"><Settings className="w-4 h-4 mr-2"/> {t('admin.quest_builder.tab_general', 'General')}</TabsTrigger>
                        <TabsTrigger value="rules" className="data-[state=active]:border-b-2 data-[state=active]:border-gold data-[state=active]:text-gold text-muted-foreground rounded-none pb-2 text-sm font-bold bg-transparent shadow-none"><Target className="w-4 h-4 mr-2"/> {t('admin.quest_builder.tab_rules', 'Rules & Rewards')}</TabsTrigger>
                        <TabsTrigger value="steps" className="data-[state=active]:border-b-2 data-[state=active]:border-gold data-[state=active]:text-gold text-muted-foreground rounded-none pb-2 text-sm font-bold bg-transparent shadow-none"><List className="w-4 h-4 mr-2"/> {t('admin.quest_builder.tab_steps', 'Steps Builder')} ({(genesisForm.steps || []).length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                      <TabsContent value="general" className="mt-0 space-y-6 max-w-3xl mx-auto">
                          <Card className="shadow-sm border border-border bg-card"><CardContent className="p-6 space-y-4">
                              <div className="space-y-2">
                                  <Label className="text-foreground">{t('admin.quest_builder.cover_image', 'Cover Image (Banner)')}</Label>
                                  <div className="flex items-center gap-4">
                                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                      {genesisForm.image_url ? (
                                          <div className="relative w-full h-40 rounded-xl overflow-hidden group border border-border shadow-inner">
                                              <img src={genesisForm.image_url} alt="Cover" className="w-full h-full object-cover" />
                                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                  <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current.click()}>{t('admin.quest_builder.change_image', 'Change Image')}</Button>
                                                  <Button type="button" size="icon" variant="destructive" onClick={() => setGenesisForm({...genesisForm, image_url: ''})}><Trash2 className="w-4 h-4"/></Button>
                                              </div>
                                          </div>
                                      ) : (
                                          <Button type="button" variant="outline" className="w-full h-32 border-dashed border-border bg-muted/30 hover:bg-muted/50 flex flex-col gap-2 text-muted-foreground" onClick={() => fileInputRef.current.click()} disabled={uploadingImage}>
                                              {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin"/> : <UploadCloud className="w-6 h-6"/>}
                                              {uploadingImage ? t('admin.quest_builder.uploading', 'Uploading...') : t('admin.quest_builder.upload_image', 'Click to upload Cover Image (Optional)')}
                                          </Button>
                                      )}
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2"><Label className="text-foreground">{t('admin.quest_builder.main_title', 'Main Title *')}</Label><Input value={genesisForm.title} onChange={e => setGenesisForm({...genesisForm, title: e.target.value})} placeholder={t('admin.quest_builder.main_title_placeholder', 'e.g. The Amazon Ecosystem')} className="font-bold text-lg bg-background border-input text-foreground focus-visible:ring-gold"/></div>
                                  <div className="space-y-2"><Label className="text-foreground">{t('admin.quest_builder.subtitle', 'Subtitle')}</Label><Input value={genesisForm.subtitle} onChange={e => setGenesisForm({...genesisForm, subtitle: e.target.value})} placeholder={t('admin.quest_builder.subtitle_placeholder', 'A short catchy phrase')} className="bg-background border-input text-foreground focus-visible:ring-gold"/></div>
                              </div>
                              <div className="space-y-2"><Label className="text-foreground">{t('admin.quest_builder.mission_desc', 'Mission Description (Intro Text)')}</Label><Textarea value={genesisForm.description} onChange={e => setGenesisForm({...genesisForm, description: e.target.value})} rows={3} className="bg-background border-input text-foreground focus-visible:ring-gold"/></div>
                              <div className="space-y-2"><Label className="text-foreground">{t('admin.quest_builder.extra_info', 'Extra Info (Tooltip / Hint)')}</Label><Textarea value={genesisForm.extra_info} onChange={e => setGenesisForm({...genesisForm, extra_info: e.target.value})} rows={2} className="bg-background border-input text-foreground focus-visible:ring-gold" placeholder={t('admin.quest_builder.extra_info_placeholder', 'Optional context to help users...')} /></div>
                          </CardContent></Card>
                      </TabsContent>

                      <TabsContent value="rules" className="mt-0 space-y-6 max-w-4xl mx-auto">
                          <Card className="shadow-sm border border-border bg-card"><CardContent className="p-6 grid grid-cols-2 gap-6">
                              <div className="col-span-2 space-y-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><Trophy className="w-4 h-4"/> {t('admin.quest_builder.completion_rewards', 'Completion Rewards')}</h4>
                                  <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                          <Label className="text-emerald-600 dark:text-emerald-400">{t('admin.quest_builder.reward_user', 'User Reward (BP)')}</Label>
                                          <Input type="number" min="0" value={genesisForm.impact_credit_reward} onChange={e => setGenesisForm({...genesisForm, impact_credit_reward: parseInt(e.target.value)})} className="bg-background border-emerald-500/30 text-foreground font-mono font-bold focus-visible:ring-emerald-500"/>
                                          <p className="text-[10px] text-foreground/80">{t('admin.quest_builder.reward_user_desc', 'Points for the user completing the mission.')}</p>
                                      </div>
                                      <div className="space-y-2">
                                          <Label className="text-purple-600 dark:text-purple-400">{t('admin.quest_builder.reward_referrer', 'Referrer Reward (BP)')}</Label>
                                          <Input type="number" min="0" value={genesisForm.referrer_reward} onChange={e => setGenesisForm({...genesisForm, referrer_reward: parseInt(e.target.value)})} className="bg-background border-purple-500/30 text-foreground font-mono font-bold focus-visible:ring-purple-500"/>
                                          <p className="text-[10px] text-foreground/80">{t('admin.quest_builder.reward_referrer_desc', 'Points for the sponsor/inviter.')}</p>
                                      </div>
                                      <div className="space-y-2">
                                          <Label className="text-blue-600 dark:text-blue-400">{t('admin.quest_builder.reputation', 'Reputation (Optional)')}</Label>
                                          <Input type="number" min="0" value={genesisForm.reputation_reward} onChange={e => setGenesisForm({...genesisForm, reputation_reward: parseInt(e.target.value)})} className="bg-background border-blue-500/30 text-foreground font-mono font-bold focus-visible:ring-blue-500"/>
                                      </div>
                                  </div>
                                  <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                                      <Label className="text-foreground">{t('admin.quest_builder.skill_category', 'Skill Category')}</Label>
                                      <Select value={genesisForm.skill_category} onValueChange={v => setGenesisForm({...genesisForm, skill_category: v})}>
                                          <SelectTrigger className="bg-background text-foreground border-emerald-500/30 max-w-sm"><SelectValue/></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="it">IT / Tech</SelectItem>
                                              <SelectItem value="innovation">Innovation & Development</SelectItem>
                                              <SelectItem value="finance">Finance / Economy</SelectItem>
                                              <SelectItem value="ecology">Ecology / Conservation</SelectItem>
                                              <SelectItem value="community">Community / Social</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>

                              <div className="col-span-2 md:col-span-1 space-y-4 bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                                  <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4"/> 
                                      {t('admin.quest_builder.global_penalty_title', 'Global Wrong Answer Penalty')}
                                  </h4>
                                  <div className="space-y-2">
                                      <Label className="text-red-600 dark:text-red-400">{t('admin.quest_builder.global_penalty_label', 'Global Penalty (%)')}</Label>
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        value={genesisForm.global_penalty_percentage} 
                                        onChange={e => setGenesisForm({...genesisForm, global_penalty_percentage: parseInt(e.target.value) || 0})} 
                                        className="bg-background text-foreground border-red-500/30 font-mono font-bold focus-visible:ring-red-500"
                                      />
                                      <p className="text-[10px] text-foreground/80">
                                          {t('admin.quest_builder.global_penalty_desc', 'If a step does not have a specific penalty, this % of the total reward will be deducted per wrong answer.')}
                                      </p>
                                  </div>
                              </div>

                              <div className="col-span-2 md:col-span-1 space-y-4 bg-muted/30 p-4 rounded-xl border border-border">
                                  <h4 className="font-bold text-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-gold"/> {t('admin.quest_builder.availability', 'Availability & Limits')}</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2"><Label className="text-foreground">{t('admin.quest_builder.status', 'Status')}</Label>
                                          <Select value={genesisForm.status} onValueChange={v => setGenesisForm({...genesisForm, status: v})}>
                                              <SelectTrigger className="bg-background text-foreground border-border"><SelectValue/></SelectTrigger>
                                              <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                                          </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-foreground">{t('admin.audience.label', 'Target Audience')}</Label>
                                        <Select value={genesisForm.target_role} onValueChange={v => setGenesisForm({...genesisForm, target_role: v})}>
                                            <SelectTrigger className="bg-background text-foreground border-border"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('admin.audience.all', 'Everyone')}</SelectItem>
                                                <SelectItem value="user">{t('admin.audience.user', 'Standard User')}</SelectItem>
                                                <SelectItem value="startnext_user">{t('admin.audience.startnext_user', 'Startnext Supporter')}</SelectItem>
                                                <SelectItem value="pioneer">{t('admin.audience.pioneer', 'Founding Pioneer')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2"><Label className="text-[10px] text-foreground">{t('admin.quest_builder.start_date', 'Start Date (Optional)')}</Label><Input type="datetime-local" value={genesisForm.start_date} onChange={e => setGenesisForm({...genesisForm, start_date: e.target.value})} className="text-xs bg-background border-border text-foreground"/></div>
                                      <div className="space-y-2"><Label className="text-[10px] text-foreground">{t('admin.quest_builder.end_date', 'End Date (Optional)')}</Label><Input type="datetime-local" value={genesisForm.end_date} onChange={e => setGenesisForm({...genesisForm, end_date: e.target.value})} className="text-xs bg-background border-border text-foreground"/></div>
                                  </div>
                              </div>
                              
                              <div className="col-span-2 md:col-span-1 space-y-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                                  <div className="flex items-center justify-between">
                                      <div>
                                          <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">{t('admin.quest_builder.auto_approve', 'Auto-Approve Free Text')}</h4>
                                          <p className="text-xs text-foreground/80">{t('admin.quest_builder.auto_approve_desc', 'Bypasses manual review of answers.')}</p>
                                      </div>
                                      <Switch checked={genesisForm.auto_approve} onCheckedChange={(c) => setGenesisForm({...genesisForm, auto_approve: c})} />
                                  </div>
                                  <p className="text-[10px] text-foreground/70 mt-2">{t('admin.quest_builder.auto_approve_note', 'If enabled, free text steps will grant rewards instantly without going through the review panel.')}</p>
                              </div>

                              <div className="col-span-2 md:col-span-1 space-y-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                                  <div className="flex items-center justify-between">
                                      <div>
                                          <h4 className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">{t('admin.quest_builder.allow_skip', 'Allow Skipping')}</h4>
                                          <p className="text-xs text-foreground/80">{t('admin.quest_builder.allow_skip_desc', 'Can users skip this entire mission?')}</p>
                                      </div>
                                      <Switch checked={genesisForm.allow_skip} onCheckedChange={(c) => setGenesisForm({...genesisForm, allow_skip: c})} />
                                  </div>
                                  {genesisForm.allow_skip && (
                                      <div className="pt-2 border-t border-blue-500/20 space-y-2">
                                          <Label className="text-blue-600 dark:text-blue-400">{t('admin.quest_builder.skip_penalty', 'Skip Penalty (Deducted from Reputation)')}</Label>
                                          <Input type="number" value={genesisForm.skip_penalty} onChange={e => setGenesisForm({...genesisForm, skip_penalty: parseInt(e.target.value)})} className="bg-background text-foreground border-blue-500/30 max-w-[200px] focus-visible:ring-blue-500" placeholder="e.g. 10"/>
                                      </div>
                                  )}
                              </div>
                          </CardContent></Card>
                      </TabsContent>

                      <TabsContent value="steps" className="mt-0">
                          <div className="flex gap-4">
                              <div className="flex-1 space-y-4">
                                  {genesisForm.steps?.length === 0 && (
                                      <div className="text-center py-20 bg-card rounded-xl border-2 border-dashed border-border">
                                          <List className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4"/>
                                          <h3 className="text-lg font-bold text-foreground mb-2">{t('admin.quest_builder.no_steps_title', 'No steps yet')}</h3>
                                          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">{t('admin.quest_builder.no_steps_desc', 'Create your first block to start building the mission flow.')}</p>
                                          <div className="flex justify-center gap-3">
                                              <Button onClick={() => addStep('content')} variant="outline" className="border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"><PlayCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_content', 'Add Content')}</Button>
                                              <Button onClick={() => addStep('question')} variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"><HelpCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_question', 'Add Question')}</Button>
                                          </div>
                                      </div>
                                  )}

                                  {genesisForm.steps?.map((step, index) => (
                                      <Card key={step.id} className="relative overflow-visible border-border bg-card shadow-md">
                                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                              <Button type="button" size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-sm" onClick={() => moveStep(index, 'up')} disabled={index === 0}>↑</Button>
                                              <Button type="button" size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-sm" onClick={() => moveStep(index, 'down')} disabled={index === genesisForm.steps.length - 1}>↓</Button>
                                          </div>
                                          <CardHeader className="bg-muted/50 py-3 px-5 border-b border-border rounded-t-xl flex flex-row items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                  <Badge className={step.type === 'content' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}>
                                                      {t('admin.quest_builder.step', 'Step')} {index + 1}: {step.type.toUpperCase()}
                                                  </Badge>
                                                  <Input value={step.title} onChange={e => updateStep(index, 'title', e.target.value)} className="h-8 w-64 bg-background text-foreground border-transparent hover:border-border font-bold focus-visible:ring-gold" placeholder={t('admin.quest_builder.step_title', 'Step Title')}/>
                                              </div>
                                              <Button type="button" size="icon" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => removeStep(index)}><Trash2 className="w-4 h-4"/></Button>
                                          </CardHeader>
                                          <CardContent className="p-5 space-y-5 bg-card rounded-b-xl border-t-0">
                                              {step.type === 'content' && (
                                                  <>
                                                      <div className="grid grid-cols-2 gap-4">
                                                          <div className="space-y-2">
                                                              <Label className="flex items-center gap-2 text-foreground"><Video className="w-4 h-4"/> {t('admin.quest_builder.media_url', 'Media URL (Video/Image)')}</Label>
                                                              <Input value={step.media_url} onChange={e => updateStep(index, 'media_url', e.target.value)} placeholder="https://youtube.com/..." className="bg-background text-foreground border-input focus-visible:ring-gold"/>
                                                          </div>
                                                          <div className="space-y-2">
                                                              <Label className="text-foreground">{t('admin.quest_builder.ui_type', 'UI Type')}</Label>
                                                              <Select value={step.ui_type} onValueChange={v => updateStep(index, 'ui_type', v)}>
                                                                  <SelectTrigger className="bg-background text-foreground border-input"><SelectValue/></SelectTrigger>
                                                                  <SelectContent><SelectItem value="text">Text Only</SelectItem><SelectItem value="video">Video Embed</SelectItem><SelectItem value="image">Image Embed</SelectItem></SelectContent>
                                                              </Select>
                                                          </div>
                                                      </div>
                                                      <div className="space-y-2">
                                                          <Label className="text-foreground">{t('admin.quest_builder.content_md', 'Content (Markdown supported)')}</Label>
                                                          <Textarea value={step.content} onChange={e => updateStep(index, 'content', e.target.value)} rows={4} placeholder={t('admin.quest_builder.content_placeholder', 'Write the educational content here...')} className="bg-background text-foreground border-input focus-visible:ring-gold"/>
                                                      </div>
                                                  </>
                                              )}
                                              {step.type === 'question' && (
                                                  <>
                                                      <div className="grid grid-cols-2 gap-6">
                                                          <div className="space-y-4">
                                                              <div className="space-y-2">
                                                                  <Label className="text-foreground">{t('admin.quest_builder.question_type', 'Question Component Type')}</Label>
                                                                  <Select value={step.ui_type} onValueChange={v => updateStep(index, 'ui_type', v)}>
                                                                      <SelectTrigger className="border-emerald-500/30 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400"><SelectValue/></SelectTrigger>
                                                                      <SelectContent>
                                                                          <SelectItem value="single_choice">Single Choice (Radio)</SelectItem>
                                                                          <SelectItem value="multiple_choice">Multiple Choice (Checkboxes)</SelectItem>
                                                                          <SelectItem value="scale_5">1 to 5 Scale (Rating)</SelectItem>
                                                                          <SelectItem value="circular_slider">Circular Slider (Multi-polar)</SelectItem>
                                                                          <SelectItem value="free_text">Free Text</SelectItem>
                                                                      </SelectContent>
                                                                  </Select>
                                                              </div>
                                                              <div className="space-y-2">
                                                                  <Label className="text-foreground">{t('admin.quest_builder.question_text', 'Question Text')}</Label>
                                                                  <Textarea value={step.content} onChange={e => updateStep(index, 'content', e.target.value)} rows={3} placeholder={t('admin.quest_builder.ask_something', 'Ask something...')} className="bg-background text-foreground border-input focus-visible:ring-gold"/>
                                                              </div>
                                                              <div className="flex items-center gap-4 bg-muted/30 p-3 rounded border border-border">
                                                                  <div className="flex items-center space-x-2">
                                                                      <Switch checked={step.is_required} onCheckedChange={(c) => updateStep(index, 'is_required', c)} />
                                                                      <Label className="text-foreground">{t('admin.quest_builder.required', 'Required?')}</Label>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                          <div className="space-y-4 border-l border-border pl-6">
                                                              
                                                              {['single_choice', 'multiple_choice'].includes(step.ui_type) && (
                                                                  <div className="space-y-3">
                                                                      <Label className="flex justify-between items-center text-foreground">{t('admin.quest_builder.answers', 'Answers')} <Button type="button" size="sm" variant="ghost" onClick={()=>addOptionToStep(index, 'options')} className="h-6 text-xs text-blue-600 dark:text-blue-400"><Plus className="w-3 h-3 mr-1"/>{t('admin.quest_builder.add_option', 'Add Option')}</Button></Label>
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
                                                                                    className={`shrink-0 w-8 h-8 ${isMulti ? 'rounded-md' : 'rounded-full'} ${isCorrect ? 'bg-green-500 hover:bg-green-600 text-white border-none' : 'text-muted-foreground border-border'}`}
                                                                                    onClick={handleToggleCorrect}
                                                                                    title={isMulti ? "Toggle as correct answer" : "Mark as correct answer"}
                                                                                  >
                                                                                    <Check className="w-4 h-4" />
                                                                                  </Button>
                                                                                  <Input value={opt} onChange={e => updateArrayOption(index, 'options', oIdx, e.target.value)} className="h-8 bg-background text-foreground border-input focus-visible:ring-gold"/>
                                                                                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={()=>removeArrayOption(index, 'options', oIdx)}><X className="w-3 h-3"/></Button>
                                                                              </div>
                                                                          );
                                                                      })}
                                                                  </div>
                                                              )}

                                                              {step.ui_type === 'circular_slider' && (
                                                                  <div className="space-y-3 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/20">
                                                                      <Label className="flex justify-between items-center text-indigo-600 dark:text-indigo-400">{t('admin.quest_builder.slider_poles', 'Define Slider Poles')} <Button type="button" size="sm" variant="ghost" onClick={()=>addOptionToStep(index, 'poles')} className="h-6 text-xs text-indigo-600 dark:text-indigo-400"><Plus className="w-3 h-3 mr-1"/>Add Pole</Button></Label>
                                                                      <p className="text-[10px] text-foreground/80 mb-2">{t('admin.quest_builder.slider_poles_desc', 'Users will distribute 100% between these variables.')}</p>
                                                                      {(step.poles || []).map((pole, pIdx) => (
                                                                          <div key={pIdx} className="flex gap-2 items-center">
                                                                              <Input value={pole} onChange={e => updateArrayOption(index, 'poles', pIdx, e.target.value)} className="h-8 bg-background text-foreground border-indigo-500/30 focus-visible:ring-indigo-500" placeholder="e.g. Social Impact"/>
                                                                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={()=>removeArrayOption(index, 'poles', pIdx)}><X className="w-3 h-3"/></Button>
                                                                          </div>
                                                                      ))}
                                                                  </div>
                                                              )}
                                                              
                                                              {step.ui_type === 'free_text' && !genesisForm.auto_approve && (
                                                                  <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
                                                                      <strong>{t('admin.quest_builder.free_text_note', 'Note: Free text answers will mark the mission as "Pending Review". A Guardian (Admin) must manually approve it to grant the rewards.')}</strong>
                                                                  </div>
                                                              )}
                                                              {step.ui_type === 'free_text' && genesisForm.auto_approve && (
                                                                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                                                                      <Check className="w-4 h-4"/>
                                                                      <strong>{t('admin.quest_builder.auto_approve_active', 'Auto-Approve Active. Will not require admin review.')}</strong>
                                                                  </div>
                                                              )}

                                                              {step.ui_type === 'scale_5' && (
                                                                  <div className="bg-muted/30 p-4 rounded-xl border border-border text-muted-foreground text-sm text-center">
                                                                      {t('admin.quest_builder.scale_5_note', 'Renders a 1 to 5 clickable star/number scale automatically.')}
                                                                  </div>
                                                              )}

                                                              {/* CONFIGURACIÓN DE PENALIZACIÓN */}
                                                              {step.correct_answer !== undefined && (
                                                                  <div className="pt-4 border-t border-border space-y-3 mt-4">
                                                                      <div className="flex items-center justify-between bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                                                                          <div className="flex items-center gap-2">
                                                                              <Label className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                                                                  <AlertTriangle className="w-4 h-4" /> 
                                                                                  {t('admin.quest_builder.apply_penalty', 'Penalty on Wrong Answer')}
                                                                              </Label>
                                                                          </div>
                                                                          <Switch checked={step.apply_penalty} onCheckedChange={(c) => updateStep(index, 'apply_penalty', c)} />
                                                                      </div>
                                                                      
                                                                      {step.apply_penalty && (
                                                                          <div className="grid grid-cols-2 gap-4 p-3 bg-background border border-red-500/20 rounded-lg shadow-sm">
                                                                              <div className="space-y-2">
                                                                                  <Label className="text-xs text-red-600 dark:text-red-400">{t('admin.quest_builder.penalty_type', 'Penalty Type')}</Label>
                                                                                  <Select value={step.penalty_type || 'fixed'} onValueChange={v => updateStep(index, 'penalty_type', v)}>
                                                                                      <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border"><SelectValue/></SelectTrigger>
                                                                                      <SelectContent>
                                                                                          <SelectItem value="fixed">{t('admin.quest_builder.penalty_fixed', 'Fixed Amount (BP)')}</SelectItem>
                                                                                          <SelectItem value="percentage">{t('admin.quest_builder.penalty_percentage', '% of Mission Total')}</SelectItem>
                                                                                      </SelectContent>
                                                                                  </Select>
                                                                              </div>
                                                                              <div className="space-y-2">
                                                                                  <Label className="text-xs text-red-600 dark:text-red-400">{t('admin.quest_builder.penalty_value', 'Deduction Value')}</Label>
                                                                                  <Input type="number" min="0" value={step.penalty_value || 0} onChange={e => updateStep(index, 'penalty_value', parseInt(e.target.value))} className="h-8 bg-background text-foreground border-border focus-visible:ring-red-500" />
                                                                              </div>
                                                                          </div>
                                                                      )}

                                                                      <div className="pt-2">
                                                                          <Label className="text-xs text-red-500 dark:text-red-400">{t('admin.quest_builder.on_fail_redirect', 'On Fail Redirect URL (Bridge-Quest)')}</Label>
                                                                          <Input value={step.on_fail_redirect || ''} onChange={e => updateStep(index, 'on_fail_redirect', e.target.value)} placeholder="https://reforest.al/learn/..." className="h-8 bg-background text-foreground border-border focus-visible:ring-red-500"/>
                                                                      </div>
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
                                          <Button onClick={() => addStep('content')} variant="outline" className="border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 shadow-sm"><PlayCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_content', 'Add Content Step')}</Button>
                                          <Button onClick={() => addStep('question')} variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-sm"><HelpCircle className="w-4 h-4 mr-2"/> {t('admin.quest_builder.add_question', 'Add Question Step')}</Button>
                                      </div>
                                  )}
                              </div>
                              <div className="hidden lg:block w-64 shrink-0">
                                  <div className="sticky top-6 bg-card rounded-xl border border-border p-4 shadow-sm">
                                      <h4 className="font-bold text-sm text-foreground mb-4 uppercase tracking-wider">{t('admin.quest_builder.mission_flow', 'Mission Flow')}</h4>
                                      <div className="space-y-2 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-border">
                                          {genesisForm.steps?.map((s, i) => (
                                              <div key={i} className="flex gap-3 items-center relative z-10">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 ${s.type === 'content' ? 'bg-blue-500' : 'bg-emerald-500'}`}>{i+1}</div>
                                                  <div className="text-xs font-medium text-foreground truncate bg-muted/50 border border-border rounded px-2 py-1 flex-1">{s.title || 'Untitled'}</div>
                                              </div>
                                          ))}
                                          {genesisForm.steps?.length === 0 && <p className="text-xs text-muted-foreground italic ml-6">{t('admin.quest_builder.empty', 'Empty')}</p>}
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