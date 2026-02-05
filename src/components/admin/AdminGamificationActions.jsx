import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, Power } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AdminGamificationActions = () => {
    const { toast } = useToast();
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAction, setEditingAction] = useState(null);
    const [formData, setFormData] = useState({
        action_name: '', action_type: 'Custom', impact_credits_value: 0, description: '', admin_notes: ''
    });

    const actionTypes = ['Genesis Quest', 'Quest', 'Mission Quest', 'Profile', 'Contribution', 'Referral', 'Activity', 'Custom'];

    useEffect(() => {
        fetchActions();
        const channel = supabase.channel('gamification_actions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_actions' }, fetchActions)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchActions = async () => {
        setLoading(true);
        // Using existing table 'gamification_actions' which we just ensured exists via SQL
        const { data, error } = await supabase.from('gamification_actions').select('*').order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error fetching gamification actions:", error);
            // Graceful degradation if table missing despite SQL
            setActions([]); 
        } else {
            setActions(data || []);
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!formData.action_name) return toast({ variant: 'destructive', title: 'Error', description: 'Name required' });
        
        try {
            if (editingAction) {
                const { error } = await supabase.from('gamification_actions').update(formData).eq('id', editingAction.id);
                if (error) throw error;
                toast({ title: 'Updated', description: 'Action updated successfully.' });
            } else {
                const { error } = await supabase.from('gamification_actions').insert(formData);
                if (error) throw error;
                toast({ title: 'Created', description: 'New action created.' });
            }
            setIsModalOpen(false);
            setEditingAction(null);
            setFormData({ action_name: '', action_type: 'Custom', impact_credits_value: 0, description: '', admin_notes: '' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    const handleToggleActive = async (action) => {
        const { error } = await supabase.from('gamification_actions').update({ is_active: !action.is_active }).eq('id', action.id);
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const { error } = await supabase.from('gamification_actions').delete().eq('id', id);
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
        else toast({ title: 'Deleted', description: 'Action definition removed.' });
    };

    const openEdit = (action) => {
        setEditingAction(action);
        setFormData({
            action_name: action.action_name,
            action_type: action.action_type,
            impact_credits_value: action.impact_credits_value,
            description: action.description || '',
            admin_notes: action.admin_notes || ''
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Gamification Actions</h3>
                    <p className="text-sm text-gray-500">Configure point values.</p>
                </div>
                <Button onClick={() => { setEditingAction(null); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add New Action
                </Button>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>Action Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
                        ) : actions.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No actions found.</TableCell></TableRow>
                        ) : (
                            actions.map(action => (
                                <TableRow key={action.id}>
                                    <TableCell className="font-medium">{action.action_name}</TableCell>
                                    <TableCell><Badge variant="outline">{action.action_type}</Badge></TableCell>
                                    <TableCell className="font-mono font-bold text-emerald-600">+{action.impact_credits_value}</TableCell>
                                    <TableCell>
                                        <Badge className={action.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}>
                                            {action.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleActive(action)}>
                                                <Power className={`w-4 h-4 ${action.is_active ? 'text-green-500' : 'text-gray-400'}`} />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(action)}>
                                                <Edit className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(action.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingAction ? 'Edit Action' : 'Create Action'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Name</Label><Input value={formData.action_name} onChange={e => setFormData({ ...formData, action_name: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={formData.action_type} onValueChange={val => setFormData({ ...formData, action_type: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{actionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Credits</Label><Input type="number" value={formData.impact_credits_value} onChange={e => setFormData({ ...formData, impact_credits_value: e.target.value })} /></div>
                        </div>
                        <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button onClick={handleSubmit}>Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminGamificationActions;
