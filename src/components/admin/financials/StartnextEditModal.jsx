import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { validateAmount } from '@/utils/validationUtils';

const StartnextEditModal = ({ isOpen, onClose, contribution, onSuccess }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        contribution_amount: '',
        contribution_date: '',
        notes: '',
        city: '',
        country: ''
    });

    useEffect(() => {
        if (contribution) {
            setFormData({
                contribution_amount: contribution.contribution_amount || '',
                contribution_date: contribution.contribution_date ? new Date(contribution.contribution_date).toISOString().split('T')[0] : '',
                notes: contribution.notes || '',
                city: contribution.city || '',
                country: contribution.country || ''
            });
        }
    }, [contribution]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const amountVal = validateAmount(formData.contribution_amount);
            if (!amountVal.isValid) throw new Error(amountVal.error);

            const { error } = await supabase
                .from('startnext_contributions')
                .update({
                    contribution_amount: parseFloat(formData.contribution_amount),
                    contribution_date: formData.contribution_date,
                    notes: formData.notes,
                    city: formData.city,
                    country: formData.country,
                    updated_at: new Date().toISOString()
                })
                .eq('id', contribution.id);

            if (error) throw error;

            toast({ title: "Updated", description: "Contribution updated successfully." });
            onSuccess();
            onClose();
        } catch (error) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Contribution</DialogTitle>
                    <DialogDescription>Modify amount, date or details.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount (€)</Label>
                            <Input 
                                type="number" 
                                value={formData.contribution_amount} 
                                onChange={(e) => setFormData({...formData, contribution_amount: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input 
                                type="date" 
                                value={formData.contribution_date} 
                                onChange={(e) => setFormData({...formData, contribution_date: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Location</Label>
                        <div className="flex gap-2">
                            <Input placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                            <Input placeholder="Country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input 
                            value={formData.notes} 
                            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                            placeholder="Admin notes..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default StartnextEditModal;