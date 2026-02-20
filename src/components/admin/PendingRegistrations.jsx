import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Trash2, Clock, Mail, MapPin, Search, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PendingImpactCredits from '@/components/admin/PendingImpactCredits';
import { getSupportLevelByAmount, calculateDynamicCredits } from '@/utils/tierLogicUtils';
import { createNotification } from '@/utils/notificationUtils'; 

const PendingRegistrations = () => {
    const { toast } = useToast();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmAction, setConfirmAction] = useState(null); 

    const fetchRegistrations = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pending_startnext_registrations')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRegistrations(data || []);
        } catch (err) {
            console.error('Fetch error:', err);
            toast({ variant: "destructive", title: "Error fetching data", description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchRegistrations();
        const channel = supabase.channel('pending-regs-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_startnext_registrations' }, (payload) => {
                if(payload.eventType === 'INSERT' && payload.new.status === 'pending') {
                      fetchRegistrations(); 
                } else if(payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
                      fetchRegistrations();
                }
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchRegistrations]);

    const handleApprove = async () => {
        if (!confirmAction?.item) return;
        const item = confirmAction.item;
        setProcessing(item.id);

        try {
            const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'startnext_user').single();
            if (!roleData) throw new Error("Role 'startnext_user' not found.");

            await supabase.from('users_roles').upsert({ user_id: item.user_id, role_id: roleData.id }, { onConflict: 'user_id,role_id' });
            await supabase.from('profiles').update({ role: 'startnext_user' }).eq('id', item.user_id);

            const supportLevelId = await getSupportLevelByAmount(item.amount);
            
            if (supportLevelId) {
                await supabase.from('user_benefits').upsert({
                    user_id: item.user_id,
                    new_support_level_id: supportLevelId,
                    status: 'active',
                    assigned_date: new Date().toISOString()
                }, { onConflict: 'user_id' });
            }

            const { data: contrib, error: contribError } = await supabase.from('startnext_contributions').insert({
                user_id: item.user_id,
                contribution_amount: item.amount,
                new_support_level_id: supportLevelId,
                benefit_assigned: true,
                notes: item.message || 'Approved from pending request'
            }).select().single();

            if (contribError) throw contribError;

            const correctCredits = calculateDynamicCredits(item.amount); 
            
            const { data: existingCredits } = await supabase
                .from('impact_credits')
                .select('id, amount')
                .eq('contribution_id', contrib.id);

            if (existingCredits && existingCredits.length > 0) {
                const firstCredit = existingCredits[0];
                
                await supabase.from('impact_credits')
                    .update({ 
                        amount: correctCredits, 
                        description: `Startnext Contribution (Verified x200)`
                    })
                    .eq('id', firstCredit.id);
                
                if (existingCredits.length > 1) {
                    const idsToDelete = existingCredits.slice(1).map(c => c.id);
                    await supabase.from('impact_credits').delete().in('id', idsToDelete);
                }
            } else {
                await supabase.from('impact_credits').insert({
                    user_id: item.user_id,
                    amount: correctCredits,
                    source: 'startnext',
                    description: 'Startnext Contribution (Manual Verify)',
                    contribution_id: contrib.id,
                    related_support_level_id: supportLevelId
                });
            }

            const { data: currentMetrics } = await supabase
                .from('founding_pioneer_metrics')
                .select('founding_pioneer_access_status, total_impact_credits_earned')
                .eq('user_id', item.user_id)
                .maybeSingle();

            const { data: allCredits } = await supabase.from('impact_credits').select('amount').eq('user_id', item.user_id);
            const totalScore = allCredits?.reduce((sum, c) => sum + Number(c.amount), 0) || correctCredits;

            const pioneerStatus = currentMetrics?.founding_pioneer_access_status || 'pending';

            await supabase.from('founding_pioneer_metrics').upsert({
                user_id: item.user_id,
                total_impact_credits_earned: totalScore,
                founding_pioneer_access_status: pioneerStatus, 
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            await createNotification(
                item.user_id,
                'notifications.contribution_verified.title',
                'notifications.contribution_verified.message',
                { amount: item.amount, credits: correctCredits },
                'success'
            );

            await supabase.from('pending_startnext_registrations').update({ status: 'approved' }).eq('id', item.id);

            toast({ title: "Approved", description: `${item.name} role updated. Credits adjusted to ${correctCredits}. Pioneer status: ${pioneerStatus}.` });
            setConfirmAction(null);
            fetchRegistrations();

        } catch (err) {
            console.error("Approval error:", err);
            toast({ variant: "destructive", title: "Approval Failed", description: err.message });
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!confirmAction?.item) return;
        setProcessing(confirmAction.item.id);
        try {
            await supabase.from('pending_startnext_registrations').update({ status: 'rejected' }).eq('id', confirmAction.item.id);
            toast({ title: "Rejected", description: "Request rejected." });
            setConfirmAction(null);
            fetchRegistrations();
        } catch (err) {
             toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setProcessing(null);
        }
    };

    const handleDelete = async () => {
         if (!confirmAction?.item) return;
         setProcessing(confirmAction.item.id);
         try {
             await supabase.from('pending_startnext_registrations').delete().eq('id', confirmAction.item.id);
             toast({ title: "Deleted", description: "Record deleted." });
             setConfirmAction(null);
             fetchRegistrations();
         } catch (err) {
             toast({ variant: "destructive", title: "Error", description: err.message });
         } finally {
             setProcessing(null);
         }
    };

    const filtered = registrations.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <UserPlus className="w-8 h-8 text-emerald-600" /> User Registrations & Requests
                    </h2>
                    <p className="text-gray-500">Manage incoming Startnext support claims and credit redemption requests.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-4">
                     <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" /> Startnext Support Claims
                    </h3>
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <Input 
                                placeholder="Search..." 
                                className="pl-9 w-48 bg-white h-9 text-sm" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchRegistrations} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No pending Startnext registrations found.</td></tr>
                                ) : (
                                    filtered.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{reg.name}</span>
                                                    <span className="text-sm text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {reg.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-sm">€{reg.amount}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1 text-sm text-gray-600">
                                                    {(reg.city || reg.country) && (
                                                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{reg.city}{reg.city && reg.country ? ', ' : ''}{reg.country}</div>
                                                    )}
                                                    {reg.message && <div className="bg-gray-100 p-2 rounded text-xs italic max-w-xs break-words">"{reg.message}"</div>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{new Date(reg.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConfirmAction({ type: 'approve', item: reg })} disabled={processing === reg.id}><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                                                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirmAction({ type: 'reject', item: reg })} disabled={processing === reg.id}><XCircle className="w-4 h-4" /></Button>
                                                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500" onClick={() => setConfirmAction({ type: 'delete', item: reg })} disabled={processing === reg.id}><Trash2 className="w-4 h-4" /></Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <PendingImpactCredits />

            <Dialog open={!!confirmAction} onOpenChange={(isOpen) => !isOpen && setConfirmAction(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Action</DialogTitle>
                        <DialogDescription>
                            {confirmAction?.type === 'approve' && <span>Are you sure you want to approve <strong>{confirmAction.item.name}</strong>? This will grant Startnext Supporter status (Land Dollar + BP). <strong>Pioneer Access requires separate evaluation.</strong></span>}
                            {confirmAction?.type === 'reject' && <span>Are you sure you want to reject this request from <strong>{confirmAction.item.name}</strong>?</span>}
                            {confirmAction?.type === 'delete' && <span>Are you sure you want to permanently delete this record?</span>}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
                        <Button 
                            variant={confirmAction?.type === 'approve' ? 'default' : 'destructive'}
                            onClick={() => {
                                if (confirmAction.type === 'approve') handleApprove();
                                else if (confirmAction.type === 'reject') handleReject();
                                else handleDelete();
                            }}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingRegistrations;
