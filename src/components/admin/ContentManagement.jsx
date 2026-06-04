import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader, Trash2, Plus, Edit, Save, Image as ImageIcon, Globe, Eye, EyeOff, Target, Coins, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

// --- SUB-COMPONENTE: MODAL DE TRADUCCIÓN ---
const ProductTranslationModal = ({ isOpen, onClose, product }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeLang, setActiveLang] = useState('es');
    
    const [translations, setTranslations] = useState({
        es: { name: '', description: '', impact_description: '' },
        de: { name: '', description: '', impact_description: '' },
        fr: { name: '', description: '', impact_description: '' }
    });

    const fetchTranslations = useCallback(async () => {
        if (!product?.id) return;

        setLoading(true);
        try {
            const { data } = await supabase
                .from('exchange_product_translations')
                .select('*')
                .eq('exchange_product_id', product.id);

            const newTrans = { 
                es: { name: '', description: '', impact_description: '' },
                de: { name: '', description: '', impact_description: '' },
                fr: { name: '', description: '', impact_description: '' }
            };

            if (data) {
                data.forEach(tr => {
                    if (newTrans[tr.language_code]) {
                        newTrans[tr.language_code] = { 
                            name: tr.name || '', 
                            description: tr.description || '',
                            impact_description: tr.impact_description || ''
                        };
                    }
                });
            }
            setTranslations(newTrans);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [product]);

    useEffect(() => {
        if (isOpen && product) {
            fetchTranslations();
        }
    }, [isOpen, product, fetchTranslations]);

    const handleSaveTranslations = async () => {
        setLoading(true);
        try {
            const upserts = Object.keys(translations).map(lang => ({
                exchange_product_id: product.id,
                language_code: lang,
                name: translations[lang].name,
                description: translations[lang].description,
                impact_description: translations[lang].impact_description
            }));

            const { error } = await supabase
                .from('exchange_product_translations')
                .upsert(upserts, { onConflict: 'exchange_product_id, language_code' });

            if (error) throw error;
            
            toast({ title: t('common.success'), description: "Translations saved.", className: "bg-card border-gold/30 text-foreground" });
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
            <DialogContent className="sm:max-w-[600px] bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Edit Translations: {product?.name}</DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeLang} onValueChange={setActiveLang} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="es" className="rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Español</TabsTrigger>
                        <TabsTrigger value="de" className="rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Deutsch</TabsTrigger>
                        <TabsTrigger value="fr" className="rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Français</TabsTrigger>
                    </TabsList>
                    
                    {loading ? <div className="py-8 flex justify-center"><Loader className="animate-spin text-gold"/></div> : (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label className="text-foreground">Name ({activeLang.toUpperCase()})</Label>
                                <Input 
                                    value={translations[activeLang].name} 
                                    onChange={e => updateField('name', e.target.value)} 
                                    placeholder="Translated Name"
                                    className="bg-background border-border text-foreground focus-visible:ring-gold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">Description ({activeLang.toUpperCase()})</Label>
                                <Textarea 
                                    value={translations[activeLang].description} 
                                    onChange={e => updateField('description', e.target.value)} 
                                    placeholder="Translated Description"
                                    rows={3}
                                    className="bg-background border-border text-foreground focus-visible:ring-gold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">Impact Text ({activeLang.toUpperCase()})</Label>
                                <Input 
                                    value={translations[activeLang].impact_description} 
                                    onChange={e => updateField('impact_description', e.target.value)} 
                                    placeholder="e.g. 1 ton CO2"
                                    className="bg-background border-border text-foreground focus-visible:ring-gold"
                                />
                            </div>
                        </div>
                    )}
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" className="border-border text-foreground hover:bg-muted" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button onClick={handleSaveTranslations} disabled={loading} className="bg-gradient-gold text-[#063127] font-bold border-none shadow-glow hover:opacity-90 transition-opacity">
                        {loading ? <Loader className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- SUB-COMPONENTE PRINCIPAL: GESTOR DE PRODUCTOS ---
const ProductsManager = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [availableQuests, setAvailableQuests] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [showTranslateModal, setShowTranslateModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        price: '',
        price_eur: 0,
        payment_type: 'credits',
        stock: -1,
        image_url: '', 
        is_active: true,
        unlocks_quest_id: null
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('exchange_products')
            .select(`
                *,
                gamification_actions:unlocks_quest_id(action_title, action_name)
            `)
            .order('price');

        if (error) console.error("Error fetching products:", error);
        setProducts(data || []);
        setLoading(false);
    }, []);

    const fetchQuests = useCallback(async () => {
        const { data } = await supabase
            .from('gamification_actions')
            .select('id, action_title, action_name')
            .in('action_type', ['Quest', 'quest', 'Mission Quest', 'mission_quest'])
            .eq('is_active', true);
        setAvailableQuests(data || []);
    }, []);

    useEffect(() => { 
        fetchProducts(); 
        fetchQuests();
        
        const sub = supabase.channel('products_change_admin')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_products' }, fetchProducts)
          .subscribe();
        return () => supabase.removeChannel(sub);
    }, [fetchProducts, fetchQuests]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({variant: "destructive", title: "Error", description: "File too large (Max 5MB)."});
                return;
            }
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file)); 
        }
    };

    const uploadImage = async () => {
        if (!imageFile) return null;
        try {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
            const filePath = `product-images/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('exchange-products')
                .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage
                .from('exchange-products')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error("Upload error:", error);
            throw new Error(`Upload failed: ${error.message}`);
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast({variant: "destructive", title: "Error", description: "Name is required."});
            return;
        }

        setUploading(true);
        try {
            let finalImageUrl = formData.image_url;
            if (imageFile) {
                finalImageUrl = await uploadImage();
            }

            const safeUnlocksQuestId = (formData.unlocks_quest_id === 'none' || formData.unlocks_quest_id === '') ? null : formData.unlocks_quest_id;

            const payload = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price || 0),
                price_eur: parseFloat(formData.price_eur || 0),
                payment_type: formData.payment_type,
                stock: parseInt(formData.stock),
                image_alt: formData.name,
                image_url: finalImageUrl,
                is_active: formData.is_active,
                unlocks_quest_id: safeUnlocksQuestId
            };
            
            const { error } = await supabase
                .from('exchange_products')
                .upsert({ id: formData.id, ...payload });

            if (error) throw error;

            toast({ title: t('common.success'), description: 'Product saved successfully.', className: "bg-card border-gold/30 text-foreground" });
            setShowModal(false);
            resetForm();
            fetchProducts();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setUploading(false);
        }
    };

    const handleToggleVisibility = async (product) => {
        try {
            const newStatus = !product.is_active;
            const { error } = await supabase.from('exchange_products').update({ is_active: newStatus }).eq('id', product.id);
            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Are you sure?")) return;
        const { error } = await supabase.from('exchange_products').delete().eq('id', id);
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
        else fetchProducts();
    };

    const openCreate = () => {
        resetForm();
        setIsEditing(false);
        setShowModal(true);
    };

    const openEdit = (p) => {
        setFormData({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: p.price || 0,
            price_eur: p.price_eur || 0,
            payment_type: p.payment_type || 'credits',
            stock: p.stock,
            image_url: p.image_url || '',
            is_active: p.is_active !== false,
            unlocks_quest_id: p.unlocks_quest_id || 'none'
        });
        setPreviewUrl(p.image_url || null);
        setIsEditing(true);
        setShowModal(true);
    };

    const openTranslate = (p) => {
        setSelectedProduct(p);
        setShowTranslateModal(true);
    };

    const resetForm = () => {
        setFormData({ id: null, name: '', description: '', price: 0, price_eur: 0, payment_type: 'credits', stock: -1, image_url: '', is_active: true, unlocks_quest_id: 'none' });
        setImageFile(null);
        setPreviewUrl(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Exchange Products</h3>
                <Button onClick={openCreate} className="bg-gradient-gold text-[#063127] font-bold border-none shadow-glow hover:scale-105 transition-transform"><Plus className="w-4 h-4 mr-2"/> Add Product</Button>
            </div>

            <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-border">
                                <TableHead className="text-foreground">Image</TableHead>
                                <TableHead className="text-foreground">Name</TableHead>
                                <TableHead className="text-foreground">Pricing Method</TableHead>
                                <TableHead className="text-foreground">Type</TableHead>
                                <TableHead className="text-foreground">Status</TableHead>
                                <TableHead className="text-right text-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={6} className="text-center p-8 border-border"><Loader className="animate-spin mx-auto text-gold"/></TableCell></TableRow> :
                            products.map(p => (
                                <TableRow key={p.id} className={`hover:bg-muted/30 transition-colors border-border ${!p.is_active ? 'opacity-50 bg-muted/20' : ''}`}>
                                    <TableCell>
                                        <div className="w-10 h-10 bg-muted rounded-md overflow-hidden flex items-center justify-center border border-border">
                                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/> : <ImageIcon className="w-4 h-4 text-muted-foreground/50"/>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-foreground">{p.name}</div>
                                        {p.unlocks_quest_id && (
                                            <div className="text-[10px] text-gold flex items-center gap-1 mt-1 font-bold">
                                                <Target className="w-3 h-3"/> Unlocks: {p.gamification_actions?.action_title || 'Quest'}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {(p.payment_type === 'credits' || p.payment_type === 'both') && (
                                                <span className="text-xs font-mono font-bold text-gold flex items-center gap-1"><Coins className="w-3 h-3"/> {p.price} BP</span>
                                            )}
                                            {(p.payment_type === 'fiat' || p.payment_type === 'both') && (
                                                <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1"><CreditCard className="w-3 h-3"/> €{p.price_eur}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {p.unlocks_quest_id ? <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30">Quest Key</Badge> : <Badge variant="outline" className="text-foreground border-border">Item</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={p.is_active ? 'default' : 'secondary'} className={p.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground'}>
                                            {p.is_active ? 'Visible' : 'Hidden'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(p)} title={p.is_active ? "Hide" : "Show"} className="hover:text-gold hover:bg-muted/50">
                                                {p.is_active ? <Eye className="w-4 h-4 text-emerald-500 dark:text-emerald-400"/> : <EyeOff className="w-4 h-4 text-muted-foreground"/>}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openTranslate(p)} title="Translate" className="text-muted-foreground hover:text-gold hover:bg-muted/50"><Globe className="w-4 h-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit" className="text-muted-foreground hover:text-gold hover:bg-muted/50"><Edit className="w-4 h-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Delete" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4"/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[550px] bg-background border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{isEditing ? 'Edit Product' : 'Create Product'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex justify-center mb-2">
                            <label className="cursor-pointer relative group w-32 h-32 bg-muted/30 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:bg-muted/50 transition-colors">
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-center text-muted-foreground p-4"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" /><span className="text-xs font-medium">Upload Image</span></div>}
                            </label>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label className="text-foreground">Name (English/Default)</Label>
                            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-background border-border text-foreground focus-visible:ring-gold" />
                        </div>
                        
                        {/* CONFIGURACIÓN DE PAGOS */}
                        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
                            <div className="space-y-2">
                                <Label className="text-foreground">Payment Method Supported</Label>
                                <Select value={formData.payment_type} onValueChange={v => setFormData({...formData, payment_type: v})}>
                                    <SelectTrigger className="bg-background border-border text-foreground focus:ring-gold"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="credits">Bonus (Bonus Points) ONLY</SelectItem>
                                        <SelectItem value="fiat">Real Money (Euros) ONLY</SelectItem>
                                        <SelectItem value="both">Both (User can choose)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className={formData.payment_type === 'fiat' ? 'opacity-50 text-foreground' : 'text-gold font-bold'}>Price in BP</Label>
                                    <Input type="number" disabled={formData.payment_type === 'fiat'} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-background border-border text-foreground focus-visible:ring-gold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className={formData.payment_type === 'credits' ? 'opacity-50 text-foreground' : 'text-emerald-500 font-bold'}>Price in Euros (€)</Label>
                                    <Input type="number" disabled={formData.payment_type === 'credits'} value={formData.price_eur} onChange={e => setFormData({...formData, price_eur: e.target.value})} className="bg-background border-border text-foreground focus-visible:ring-gold" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-foreground">Stock (-1 for infinite)</Label>
                                <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="bg-background border-border text-foreground focus-visible:ring-gold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-foreground"><Target className="w-4 h-4 text-gold"/> Unlocks Quest</Label>
                                <select 
                                    className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                                    value={formData.unlocks_quest_id || 'none'}
                                    onChange={e => setFormData({...formData, unlocks_quest_id: e.target.value})}
                                >
                                    <option value="none">-- No Quest Linked --</option>
                                    {availableQuests.map(q => (
                                        <option key={q.id} value={q.id}>{q.action_title || q.action_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-foreground">Description (English)</Label>
                            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="bg-background border-border text-foreground focus-visible:ring-gold" />
                        </div>
                        
                        <div className="flex items-center space-x-2 border border-border p-3 rounded-lg bg-muted/30">
                            <Switch id="active-mode" checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
                            <Label htmlFor="active-mode" className="cursor-pointer text-foreground">Visible in Store?</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="border-border text-foreground hover:bg-muted" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSave} disabled={uploading} className="bg-gradient-gold text-[#063127] font-bold border-none shadow-glow hover:opacity-90 transition-opacity">
                            {uploading && <Loader className="w-4 h-4 animate-spin mr-2" />} {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ProductTranslationModal isOpen={showTranslateModal} onClose={() => setShowTranslateModal(false)} product={selectedProduct} />
        </div>
    );
};

// --- COMPONENTE EXPORTADO FINAL ---
const ContentManagement = () => {
  return (
    <div className="space-y-6">
      <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Content Management</h2>
          <p className="text-muted-foreground">Manage exchange products, pricing methods and catalog.</p>
      </div>
      
      <Tabs defaultValue="products">
        <TabsList className="mb-4 bg-muted/50 border border-border p-1 rounded-xl flex flex-wrap h-auto gap-1">
            <TabsTrigger value="products" className="px-4 py-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Store Catalog</TabsTrigger>
            <TabsTrigger value="proposals" className="px-4 py-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Voting Proposals</TabsTrigger>
            <TabsTrigger value="benefits" className="px-4 py-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all">Benefit Levels</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
            <ProductsManager />
        </TabsContent>
        <TabsContent value="proposals">
            <Card className="bg-card border-border"><CardContent className="py-8 text-center text-muted-foreground">Proposal Management moved to Community Tab.</CardContent></Card>
        </TabsContent>
        <TabsContent value="benefits">
            <Card className="bg-card border-border"><CardContent className="py-8 text-center text-muted-foreground">Benefit Levels moved to Tiers Tab.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentManagement;