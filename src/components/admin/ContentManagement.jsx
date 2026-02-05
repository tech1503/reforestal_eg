import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader, Trash2, Plus, Edit, Save, Image as ImageIcon, Globe, Eye, EyeOff, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
            
            toast({ title: t('common.success'), description: "Translations saved." });
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
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Translations: {product?.name}</DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeLang} onValueChange={setActiveLang} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="es">Español</TabsTrigger>
                        <TabsTrigger value="de">Deutsch</TabsTrigger>
                        <TabsTrigger value="fr">Français</TabsTrigger>
                    </TabsList>
                    
                    {loading ? <div className="py-8 flex justify-center"><Loader className="animate-spin text-emerald-500"/></div> : (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Name ({activeLang.toUpperCase()})</Label>
                                <Input 
                                    value={translations[activeLang].name} 
                                    onChange={e => updateField('name', e.target.value)} 
                                    placeholder="Translated Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description ({activeLang.toUpperCase()})</Label>
                                <Textarea 
                                    value={translations[activeLang].description} 
                                    onChange={e => updateField('description', e.target.value)} 
                                    placeholder="Translated Description"
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Impact Text ({activeLang.toUpperCase()})</Label>
                                <Input 
                                    value={translations[activeLang].impact_description} 
                                    onChange={e => updateField('impact_description', e.target.value)} 
                                    placeholder="e.g. 1 ton CO2"
                                />
                            </div>
                        </div>
                    )}
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button onClick={handleSaveTranslations} disabled={loading} className="btn-primary">
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
    
    // Lista de Quests para el selector
    const [availableQuests, setAvailableQuests] = useState([]);

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [showTranslateModal, setShowTranslateModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        price: '',
        stock: -1,
        image_url: '', 
        is_active: true,
        unlocks_quest_id: null
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Fetch principal
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

    // Cargar Quests disponibles
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
        if (!formData.name || !formData.price) {
            toast({variant: "destructive", title: "Error", description: "Name and Price required."});
            return;
        }

        setUploading(true);
        try {
            let finalImageUrl = formData.image_url;
            if (imageFile) {
                finalImageUrl = await uploadImage();
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock),
                image_alt: formData.name,
                image_url: finalImageUrl,
                is_active: formData.is_active,
                unlocks_quest_id: formData.unlocks_quest_id || null
            };
            
            const { error } = await supabase
                .from('exchange_products')
                .upsert({ id: formData.id, ...payload });

            if (error) throw error;

            toast({ title: t('common.success'), description: 'Product saved successfully.' });
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
            const { error } = await supabase
                .from('exchange_products')
                .update({ is_active: newStatus })
                .eq('id', product.id);
            
            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
            toast({ title: newStatus ? "Visible" : "Hidden" });
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
            price: p.price,
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
        setFormData({ id: null, name: '', description: '', price: '', stock: -1, image_url: '', is_active: true, unlocks_quest_id: 'none' });
        setImageFile(null);
        setPreviewUrl(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Exchange Products</h3>
                <Button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4 mr-2"/> Add Product</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={6} className="text-center p-8"><Loader className="animate-spin mx-auto"/></TableCell></TableRow> :
                            products.map(p => (
                                <TableRow key={p.id} className={!p.is_active ? 'bg-slate-50 opacity-60' : ''}>
                                    <TableCell>
                                        <div className="w-10 h-10 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center border border-slate-200">
                                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/> : <ImageIcon className="w-4 h-4 text-slate-300"/>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{p.name}</div>
                                        {p.unlocks_quest_id && (
                                            <div className="text-[10px] text-blue-600 flex items-center gap-1 mt-1 font-semibold">
                                                <Target className="w-3 h-3"/> Unlocks: {p.gamification_actions?.action_title || 'Quest'}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>{p.price} IC</TableCell>
                                    <TableCell>
                                        {p.unlocks_quest_id ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Quest Key</Badge> : <Badge variant="outline">Item</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={p.is_active ? 'default' : 'secondary'} className={p.is_active ? 'bg-green-600' : ''}>
                                            {p.is_active ? 'Visible' : 'Hidden'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(p)} title={p.is_active ? "Hide" : "Show"}>
                                                {p.is_active ? <Eye className="w-4 h-4 text-emerald-600"/> : <EyeOff className="w-4 h-4 text-slate-400"/>}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openTranslate(p)} title="Translate"><Globe className="w-4 h-4 text-blue-500"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit"><Edit className="w-4 h-4 text-slate-500"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 className="w-4 h-4 text-red-500"/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Product' : 'Create Product'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex justify-center mb-2">
                            <label className="cursor-pointer relative group w-40 h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden hover:bg-slate-100 transition-colors">
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-center text-slate-400 p-4"><ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" /><span className="text-xs font-medium">Click to Upload</span></div>}
                            </label>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label>Name (English/Default)</Label>
                            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="gap-2 grid">
                                <Label>Price (IC)</Label>
                                <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                            </div>
                            <div className="gap-2 grid">
                                <Label>Stock</Label>
                                <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                            </div>
                        </div>

                        {/* SELECTOR DE VINCULACIÓN */}
                        <div className="space-y-2 border-t pt-4 mt-2">
                            <Label className="flex items-center gap-2 text-blue-700 font-semibold"><Target className="w-4 h-4"/> Unlocks Quest (Paywall)</Label>
                            <select 
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.unlocks_quest_id || 'none'}
                                onChange={e => setFormData({...formData, unlocks_quest_id: e.target.value === 'none' ? null : e.target.value})}
                            >
                                <option value="none">-- No Quest Linked (Regular Item) --</option>
                                {availableQuests.map(q => (
                                    <option key={q.id} value={q.id}>{q.action_title || q.action_name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-500">Buying this product will automatically unlock this quest for the user.</p>
                        </div>

                        <div className="grid gap-2 mt-2">
                            <Label>Description (English)</Label>
                            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                        
                        <div className="flex items-center space-x-2 border p-3 rounded-lg bg-slate-50">
                            <Switch id="active-mode" checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
                            <Label htmlFor="active-mode" className="cursor-pointer">Visible in Store?</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSave} disabled={uploading} className="btn-primary">
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
          <h2 className="text-2xl font-bold tracking-tight">Content Management</h2>
          <p className="text-muted-foreground">Manage products and localized content.</p>
      </div>
      
      <Tabs defaultValue="products">
        <TabsList className="mb-4">
            <TabsTrigger value="products">Exchange Products</TabsTrigger>
            <TabsTrigger value="proposals">Voting Proposals</TabsTrigger>
            <TabsTrigger value="benefits">Benefit Levels</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
            <ProductsManager />
        </TabsContent>
        <TabsContent value="proposals">
            <Card><CardContent className="py-8 text-center text-muted-foreground">Proposal Management Coming Soon</CardContent></Card>
        </TabsContent>
        <TabsContent value="benefits">
            <Card><CardContent className="py-8 text-center text-muted-foreground">Benefit Levels Configuration Coming Soon</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentManagement;