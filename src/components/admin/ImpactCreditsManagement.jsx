import React, { useState, useEffect } from 'react';
import { Search, Plus, Coins, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const ImpactCreditsManagement = () => {
  const { toast } = useToast();
  const { t } = useTranslation(); // HOOK
  const [credits, setCredits] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingCredit, setEditingCredit] = useState(null);
  
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    source: 'admin',
    description: '',
  });

  useEffect(() => {
    fetchCredits();
    fetchUsers();

    // Subscribe to changes
    const sub = supabase.channel('impact_credits_manage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impact_credits' }, () => {
        fetchCredits();
      })
      .subscribe();
      
    return () => supabase.removeChannel(sub);
  }, []);

  const fetchCredits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('impact_credits')
      .select('*, profiles:user_id(name, email)')
      .order('issued_date', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'Failed to fetch credits' });
    } else {
      setCredits(data || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('id, name, email');
    if (!error) setUsers(data || []);
  };

  const handleSaveCredit = async () => {
    if (!formData.amount) {
      toast({ variant: 'destructive', title: t('common.error'), description: 'Amount is required' });
      return;
    }

    let error;
    
    if (editingCredit) {
        // Edit Mode
        const { error: err } = await supabase.from('impact_credits').update({
            amount: parseFloat(formData.amount),
            description: formData.description,
        }).eq('id', editingCredit.id);
        error = err;
    } else {
        // Create Mode
        if (!formData.user_id) {
             toast({ variant: 'destructive', title: t('common.error'), description: 'Select a user' });
             return;
        }
        const { error: err } = await supabase.from('impact_credits').insert({
          user_id: formData.user_id,
          amount: parseFloat(formData.amount),
          source: formData.source,
          description: formData.description,
          issued_date: new Date().toISOString()
        });
        error = err;
    }

    if (error) {
      toast({ variant: 'destructive', title: t('common.error'), description: error.message });
    } else {
      toast({ title: t('common.success'), description: editingCredit ? 'Credit updated' : 'Impact credits issued successfully!' });
      closeDialog();
    }
  };

  const handleDelete = async () => {
      if(!deleteId) return;
      const { error } = await supabase.from('impact_credits').delete().eq('id', deleteId);
      if (error) toast({ variant: 'destructive', title: t('common.error'), description: error.message });
      else toast({ title: 'Deleted', description: 'Record removed.' });
      setShowDeleteConfirm(false);
  };

  const openEdit = (credit) => {
      setEditingCredit(credit);
      setFormData({
          user_id: credit.user_id,
          amount: credit.amount,
          source: credit.source,
          description: credit.description || ''
      });
      setShowDialog(true);
  };

  const closeDialog = () => {
      setShowDialog(false);
      setEditingCredit(null);
      setFormData({ user_id: '', amount: '', source: 'admin', description: '' });
  };

  const filteredCredits = credits.filter(c =>
    c.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowDialog(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Issue {t('dashboard.impact_credits')}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-700">{t('admin.startnext.user')}</th>
                <th className="text-left p-4 font-semibold text-gray-700">{t('admin.startnext.amount')}</th>
                <th className="text-left p-4 font-semibold text-gray-700">{t('dashboard.source')}</th>
                <th className="text-left p-4 font-semibold text-gray-700">Description</th>
                <th className="text-left p-4 font-semibold text-gray-700">{t('dashboard.date')}</th>
                <th className="text-right p-4 font-semibold text-gray-700">{t('admin.startnext.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="6" className="text-center p-8 text-gray-500">{t('common.loading')}</td></tr>
              ) : filteredCredits.length === 0 ? (
                <tr><td colSpan="6" className="text-center p-8 text-gray-500">No credits found</td></tr>
              ) : (
                filteredCredits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-slate-900">{credit.profiles?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{credit.profiles?.email}</p>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-purple-700 flex items-center">
                      <Coins className="w-4 h-4 mr-1 text-purple-500" />
                      {parseFloat(credit.amount).toFixed(0)}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {credit.source}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 max-w-xs truncate" title={credit.description}>{credit.description || '-'}</td>
                    <td className="p-4 text-gray-600">{new Date(credit.issued_date || credit.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4 text-slate-500"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(credit)}>
                                    <Edit className="w-4 h-4 mr-2"/> Adjust / Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteId(credit.id); setShowDeleteConfirm(true); }}>
                                    <Trash2 className="w-4 h-4 mr-2"/> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Dialog */}
      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCredit ? 'Edit Credit Entry' : `Issue ${t('dashboard.impact_credits')}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingCredit && (
                <div className="space-y-2">
                  <Label htmlFor="user">{t('admin.startnext.user')}</Label>
                  <select
                    id="user"
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">Select a user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                    ))}
                  </select>
                </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="amount">{t('admin.startnext.amount')}</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">{t('dashboard.source')}</Label>
              <select
                id="source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full p-2 border rounded-lg text-sm"
                disabled={!!editingCredit} 
              >
                <option value="admin">Admin Grant</option>
                <option value="startnext">Startnext</option>
                <option value="quest">Quest Reward</option>
                <option value="referral">Referral Bonus</option>
                <option value="bonus">Special Bonus</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Reason for issuing credits..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveCredit} className="btn-primary">{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
            <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-500">Are you sure you want to remove this record?</p>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>{t('common.cancel')}</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImpactCreditsManagement;