import React, { useState, useEffect } from 'react';
import { Coins, CheckCircle, XCircle, Trash2, Search, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const PendingImpactCredits = () => {
    const { toast } = useToast();
    const { t } = useTranslation(); // HOOK
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Action State
    const [actionDialog, setActionDialog] = useState(null); 
    const [releaseAmount, setReleaseAmount] = useState('');
    const [adminNote, setAdminNote] = useState('');

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('impact_credits_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Fetch error:', err);
            toast({ variant: "destructive", title: t('common.error'), description: "Failed to fetch impact credit requests." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();

        const channel = supabase.channel('ic-requests-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'impact_credits_requests' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
                    setRequests(prev => [payload.new, ...prev]);
                    toast({ title: "New Credit Request", description: "A user requested credit release." });
                } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
                    if (payload.new && payload.new.status !== 'pending') {
                         setRequests(prev => prev.filter(r => r.id !== payload.new.id));
                    } else if (payload.old) {
                         setRequests(prev => prev.filter(r => r.id !== payload.old.id));
                    }
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const openActionDialog = (type, item) => {
        setActionDialog({ type, item });
        setReleaseAmount(item.impact_credits_balance?.toString() || '0');
        setAdminNote('');
    };

    const executeAction = async () => {
        if (!actionDialog?.item) return;
        setProcessing(actionDialog.item.id);
        const item = actionDialog.item;

        try {
            if (actionDialog.type === 'approve') {
                const amount = parseFloat(releaseAmount);
                if (isNaN(amount) || amount <= 0) throw new Error("Invalid release amount.");
                if (amount > parseFloat(item.impact_credits_balance)) throw new Error("Cannot release more than balance.");

                // 1. Update Request
                const { error: reqError } = await supabase
                    .from('impact_credits_requests')
                    .update({ 
                        status: 'approved', 
                        admin_approved_credits: amount,
                        admin_notes: adminNote 
                    })
                    .eq('id', item.id);
                if (reqError) throw reqError;

                await supabase.from('notifications').insert({
                    user_id: item.user_id,
                    title: "Credits Released! 🔓",
                    message: `Your request to redeem ${amount} Impact Credits has been approved. They are now available.`
                });

                toast({ title: t('common.success'), description: "Request approved successfully." });

            } else if (actionDialog.type === 'reject') {
                const { error } = await supabase
                    .from('impact_credits_requests')
                    .update({ 
                        status: 'rejected', 
                        admin_notes: adminNote 
                    })
                    .eq('id', item.id);
                if (error) throw error;
                
                toast({ title: "Request Rejected" });

            } else if (actionDialog.type === 'delete') {
                const { error } = await supabase.from('impact_credits_requests').delete().eq('id', item.id);
                if (error) throw error;
                toast({ title: "Request Deleted" });
            }
            
            setActionDialog(null);

        } catch (err) {
            toast({ variant: "destructive", title: "Action Failed", description: err.message });
        } finally {
            setProcessing(null);
        }
    };

    const filtered = requests.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 mt-8">
            <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-indigo-500" /> {t('dashboard.impact_credits')} Requests
                </h3>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <Input 
                            placeholder={t('common.search')}
                            className="pl-9 w-48 bg-white h-9 text-sm" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">{t('admin.startnext.user')}</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Current Balance</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">{t('admin.startnext.status')}</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">{t('admin.startnext.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-500">No pending credit requests.</td></tr>
                        ) : (
                            filtered.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{req.name}</div>
                                        <div className="text-gray-500 text-xs">{req.email}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                                        {req.impact_credits_balance} 
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('admin.startnext.pending')}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openActionDialog('approve', req)}>
                                            Release
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={() => openActionDialog('reject', req)}>
                                            {t('admin.startnext.reject')}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 text-gray-400 hover:text-red-600" onClick={() => openActionDialog('delete', req)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionDialog?.type === 'approve' && 'Approve & Release Credits'}
                            {actionDialog?.type === 'reject' && 'Reject Request'}
                            {actionDialog?.type === 'delete' && 'Delete Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionDialog?.type === 'approve' && "Confirm the amount of credits to release to the user. They will be notified immediately."}
                            {actionDialog?.type === 'reject' && "This request will be marked as rejected."}
                            {actionDialog?.type === 'delete' && "Permanently remove this request history."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {actionDialog?.type === 'approve' && (
                            <div className="space-y-2">
                                <Label>Credits to Release</Label>
                                <Input 
                                    type="number" 
                                    value={releaseAmount} 
                                    onChange={(e) => setReleaseAmount(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">Max available: {actionDialog.item.impact_credits_balance}</p>
                            </div>
                        )}
                        {(actionDialog?.type === 'approve' || actionDialog?.type === 'reject') && (
                            <div className="space-y-2">
                                <Label>Admin Notes (Optional)</Label>
                                <Textarea 
                                    value={adminNote} 
                                    onChange={(e) => setAdminNote(e.target.value)} 
                                    placeholder="Reason or internal note..."
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(null)}>{t('common.cancel')}</Button>
                        <Button 
                            variant={actionDialog?.type === 'delete' || actionDialog?.type === 'reject' ? 'destructive' : 'default'}
                            onClick={executeAction}
                            disabled={processing === actionDialog?.item?.id}
                        >
                            {processing ? <Loader2 className="animate-spin w-4 h-4" /> : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingImpactCredits;
