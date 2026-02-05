import React, { useState, useEffect, useCallback } from 'react'; //
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Edit, Trash2, Globe, Star, CheckCircle2, Zap, Leaf } from 'lucide-react';
import BenefitTranslationEditor from './BenefitTranslationEditor';

// Icon mapping for display
const ICON_MAP = {
  'star': Star,
  'check': CheckCircle2,
  'zap': Zap,
  'leaf': Leaf,
  'globe': Globe
};

const SupportBenefitsManager = ({ levelId, levelName }) => {
  const { toast } = useToast();
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTransBenefit, setEditingTransBenefit] = useState(null);
  
  // Create/Edit Benefit State
  const [isEditing, setIsEditing] = useState(false);
  const [currentBenefit, setCurrentBenefit] = useState(null);
  const [formData, setFormData] = useState({
    icon_name: 'check',
    benefit_type: 'digital',
    is_active: true,
    display_order: 0
  });

  // Definición de fetchBenefits con useCallback para estabilizar la referencia
  const fetchBenefits = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch benefits + English translation for default display
      const { data, error } = await supabase
        .from('support_benefits')
        .select(`
          *,
          support_benefit_translations(description, language_code)
        `)
        .eq('support_level_id', levelId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBenefits(data || []);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load benefits" });
    } finally {
      setLoading(false);
    }
  }, [levelId, toast]); // Dependencias de la función

  useEffect(() => {
    if (levelId) fetchBenefits();
  }, [levelId, fetchBenefits]); // fetchBenefits ahora es una dependencia segura

  const handleSaveBenefit = async () => {
    try {
      const payload = {
        support_level_id: levelId,
        icon_name: formData.icon_name,
        benefit_type: formData.benefit_type,
        is_active: formData.is_active,
        display_order: parseInt(formData.display_order)
      };

      if (currentBenefit) {
        // Update
        const { error } = await supabase
          .from('support_benefits')
          .update(payload)
          .eq('id', currentBenefit.id);
        if (error) throw error;
        toast({ title: "Updated", description: "Benefit updated successfully" });
      } else {
        // Create
        const { error } = await supabase
          .from('support_benefits')
          .insert(payload);
        if (error) throw error;
        toast({ title: "Created", description: "New benefit added" });
      }
      
      setIsEditing(false);
      setCurrentBenefit(null);
      fetchBenefits();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this benefit permanently?")) return;
    try {
      const { error } = await supabase.from('support_benefits').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Benefit removed" });
      setBenefits(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const openEditor = (benefit = null) => {
    if (benefit) {
      setCurrentBenefit(benefit);
      setFormData({
        icon_name: benefit.icon_name,
        benefit_type: benefit.benefit_type,
        is_active: benefit.is_active,
        display_order: benefit.display_order
      });
    } else {
      setCurrentBenefit(null);
      setFormData({
        icon_name: 'check',
        benefit_type: 'digital',
        is_active: true,
        display_order: benefits.length + 1
      });
    }
    setIsEditing(true);
  };

  const getEnglishDesc = (b) => {
    return b.support_benefit_translations?.find(t => t.language_code === 'en')?.description || '(No EN description)';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-slate-800">Benefits for: <span className="font-bold text-violet-600">{levelName}</span></h3>
        <Button size="sm" onClick={() => openEditor()}>
          <Plus className="w-4 h-4 mr-2"/> Add Benefit
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[50px]">Order</TableHead>
              <TableHead className="w-[50px]">Icon</TableHead>
              <TableHead>English Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
            ) : benefits.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center p-4 text-slate-500">No benefits defined for this level.</TableCell></TableRow>
            ) : (
              benefits.map(b => {
                const IconComp = ICON_MAP[b.icon_name] || ICON_MAP['check'];
                return (
                  <TableRow key={b.id}>
                    <TableCell>{b.display_order}</TableCell>
                    <TableCell><IconComp className="w-4 h-4 text-slate-500"/></TableCell>
                    <TableCell className="text-sm font-medium">{getEnglishDesc(b)}</TableCell>
                    <TableCell><Badge variant="outline">{b.benefit_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-600" : ""}>
                        {b.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingTransBenefit(b)} title="Translate">
                          <Globe className="w-4 h-4 text-blue-600"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditor(b)} title="Edit">
                          <Edit className="w-4 h-4 text-slate-600"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} title="Delete">
                          <Trash2 className="w-4 h-4 text-red-600"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Main Benefit Editor (Structure/Icon) */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentBenefit ? 'Edit Benefit' : 'Add New Benefit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.icon_name}
                  onChange={e => setFormData({...formData, icon_name: e.target.value})}
                >
                  <option value="check">Checkmark</option>
                  <option value="star">Star</option>
                  <option value="zap">Lightning</option>
                  <option value="leaf">Leaf</option>
                  <option value="globe">Globe</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.benefit_type}
                  onChange={e => setFormData({...formData, benefit_type: e.target.value})}
                >
                  <option value="digital">Digital</option>
                  <option value="physical">Physical</option>
                  <option value="experience">Experience</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Order</Label>
                 <Input type="number" value={formData.display_order} onChange={e => setFormData({...formData, display_order: e.target.value})} />
               </div>
               <div className="flex items-end pb-2">
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded border-gray-300"/>
                    <span className="text-sm font-medium">Is Active?</span>
                 </label>
               </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveBenefit}>Save Benefit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Translation Editor Modal */}
      <BenefitTranslationEditor 
        benefit={editingTransBenefit}
        isOpen={!!editingTransBenefit}
        onClose={() => setEditingTransBenefit(null)}
        onSave={fetchBenefits}
      />
    </div>
  );
};

export default SupportBenefitsManager;