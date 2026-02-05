import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input'; // Importante: Componente Input para edición
import { useToast } from '@/components/ui/use-toast';
import { Loader2, List, Globe, Users } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import LevelTranslationEditor from './LevelTranslationEditor';
import SupportBenefitsManager from './SupportBenefitsManager';
import UserTierAssignmentView from './UserTierAssignmentView';

const SupportLevelsManager = () => {
  const { toast } = useToast();
  const { currentLanguage } = useI18n();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Modales
  const [editingLevel, setEditingLevel] = useState(null);
  const [viewingBenefitsFor, setViewingBenefitsFor] = useState(null);
  const [viewingUsersFor, setViewingUsersFor] = useState(null);

  // Carga de datos
  const fetchLevels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_levels')
        .select(`
            *,
            support_level_translations(name, language_code)
        `)
        .order('min_amount', { ascending: true });

      if (error) throw error;

      // Procesamiento de nombres traducidos
      const processed = data.map(l => {
          const trans = l.support_level_translations.find(t => t.language_code === currentLanguage) 
                     || l.support_level_translations.find(t => t.language_code === 'en');
          return {
              ...l,
              displayName: trans?.name || l.slug
          };
      });

      setLevels(processed);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load support levels" });
    } finally {
      setLoading(false);
    }
  }, [currentLanguage, toast]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  // Función para actualizar créditos/land dollars en tiempo real
  const handleUpdateCredits = async (id, field, value) => {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
          toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid number." });
          return;
      }

      const { error } = await supabase
        .from('support_levels')
        .update({ [field]: numValue, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Updated", description: `${field === 'impact_credits_reward' ? 'Impact Credits' : 'Land Dollars'} updated.` });
      
      // Actualizamos el estado local para reflejar el cambio sin recargar todo
      setLevels(prev => prev.map(l => l.id === id ? { ...l, [field]: numValue } : l));

    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      fetchLevels(); // Revertir en caso de error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold text-slate-800">Support Tiers & Rewards</h2>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
        <Table>
            <TableHeader>
                <TableRow className="bg-slate-50">
                    <TableHead>Order</TableHead>
                    <TableHead>Level Name ({currentLanguage.toUpperCase()})</TableHead>
                    <TableHead>Min Entry (€)</TableHead>
                    <TableHead>Rewards Config (Editable)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center p-8"><Loader2 className="animate-spin mx-auto text-slate-400"/></TableCell></TableRow>
                ) : levels.map(level => (
                    <TableRow key={level.id}>
                        <TableCell className="font-mono text-xs text-slate-500">{level.display_order}</TableCell>
                        
                        <TableCell>
                            <div className="font-medium text-slate-900">{level.displayName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{level.slug}</div>
                        </TableCell>
                        
                        <TableCell className="font-bold text-emerald-700">
                            €{level.min_amount}
                        </TableCell>
                        
                        {/* CELDAS EDITABLES PARA RECOMPENSAS */}
                        <TableCell className="min-w-[200px]">
                             <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-purple-600 uppercase">Credits</label>
                                  <div className="relative">
                                    <Input 
                                        type="number" 
                                        className="h-8 w-24 text-xs font-mono bg-purple-50/50 border-purple-100 focus:border-purple-300" 
                                        defaultValue={level.impact_credits_reward}
                                        onBlur={(e) => handleUpdateCredits(level.id, 'impact_credits_reward', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-green-600 uppercase">Land Dollars</label>
                                  <div className="relative">
                                    <Input 
                                        type="number" 
                                        className="h-8 w-24 text-xs font-mono bg-green-50/50 border-green-100 focus:border-green-300" 
                                        defaultValue={level.land_dollars_reward}
                                        onBlur={(e) => handleUpdateCredits(level.id, 'land_dollars_reward', e.target.value)}
                                    />
                                  </div>
                                </div>
                             </div>
                        </TableCell>
                        
                        <TableCell>
                            <Badge variant={level.is_active ? 'default' : 'secondary'} className={level.is_active ? 'bg-green-600' : ''}>
                                {level.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </TableCell>
                        
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setEditingLevel(level)} title="Edit Translations">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setViewingBenefitsFor(level)} title="Manage Benefits">
                                    <List className="w-4 h-4 text-slate-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setViewingUsersFor(level)} title="View Users">
                                    <Users className="w-4 h-4 text-slate-600" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>

      {/* MODALES DE EDICIÓN */}
      
      <LevelTranslationEditor 
        level={editingLevel} 
        isOpen={!!editingLevel} 
        onClose={() => setEditingLevel(null)}
        onSave={fetchLevels}
      />

      <Dialog open={!!viewingBenefitsFor} onOpenChange={(open) => !open && setViewingBenefitsFor(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Manage Benefits: {viewingBenefitsFor?.displayName}</DialogTitle>
            </DialogHeader>
            <SupportBenefitsManager 
                levelId={viewingBenefitsFor?.id} 
                levelName={viewingBenefitsFor?.displayName} 
            />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingUsersFor} onOpenChange={(open) => !open && setViewingUsersFor(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Users in Tier: {viewingUsersFor?.displayName}</DialogTitle>
            </DialogHeader>
            <UserTierAssignmentView 
                initialFilterLevelId={viewingUsersFor?.id} 
                title={`Users in Tier: ${viewingUsersFor?.displayName}`}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportLevelsManager;