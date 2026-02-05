import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Users, Gift, Activity, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const MlmManagement = () => {
    const { toast } = useToast();
    const { t } = useTranslation(); // HOOK
    const [actions, setActions] = useState([]);
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [newAction, setNewAction] = useState({
        name: '',
        description: '',
        credits: 50,
        status: 'active'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: actionsData } = await supabase
                .from('gamification_actions')
                .select('*')
                .ilike('type', '%referral%')
                .order('created_at', { ascending: false });
            
            const { data: referralsData } = await supabase
                .from('referrals')
                .select(`
                    id, created_at, status,
                    referrer:referrer_id(name, email),
                    referee:referee_id(name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            setActions(actionsData || []);
            setReferrals(referralsData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAction = async () => {
        if(!newAction.name) return toast({variant: "destructive", title: t('common.error'), description: "Name required"});
        
        const payload = {
            title: newAction.name,
            description: newAction.description,
            credits: parseInt(newAction.credits),
            type: 'Referral (MLM)',
            slug: `referral_${Date.now()}`,
            status: newAction.status,
            binding: 'referral_custom'
        };

        const { error } = await supabase.from('gamification_actions').insert(payload);
        if(error) {
            toast({variant: "destructive", title: t('common.error'), description: error.message});
        } else {
            toast({title: t('common.success'), description: "MLM Action created"});
            setShowDialog(false);
            fetchData();
            setNewAction({ name: '', description: '', credits: 50, status: 'active' });
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await supabase.from('gamification_actions').update({ status: newStatus }).eq('id', id);
        fetchData();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Referral System (MLM)</h2>
                    <p className="text-muted-foreground">Manage referral rewards and track network growth.</p>
                </div>
                <Button onClick={() => setShowDialog(true)} className="btn-primary">
                    <Plus className="w-4 h-4 mr-2"/> New Reward Action
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.referrals.total')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{referrals.length}</div>
                        <p className="text-xs text-muted-foreground">Registered via links</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{actions.filter(a => a.status === 'active').length}</div>
                        <p className="text-xs text-muted-foreground">Reward types running</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network Growth</CardTitle>
                        <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {referrals.filter(r => r.status === 'completed').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Successful conversions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Actions Table */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Reward Actions</CardTitle>
                        <CardDescription>Configure rewards for referrals.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Reward ({t('dashboard.impact_credits')})</TableHead>
                                    <TableHead>{t('admin.startnext.status')}</TableHead>
                                    <TableHead>{t('admin.impact_credits.action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {actions.map(action => (
                                    <TableRow key={action.id}>
                                        <TableCell className="font-medium">{action.title || action.name}</TableCell>
                                        <TableCell>{action.credits} IC</TableCell>
                                        <TableCell>
                                            <Badge variant={action.status === 'active' ? 'default' : 'secondary'}>
                                                {action.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => toggleStatus(action.id, action.status)}>
                                                Toggle
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Referrals List */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Recent Referrals</CardTitle>
                        <CardDescription>Latest users joined via referral links.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Referrer</TableHead>
                                    <TableHead>New User</TableHead>
                                    <TableHead>{t('dashboard.date')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={3}><Loader2 className="w-4 h-4 animate-spin mx-auto"/></TableCell></TableRow>
                                ) : referrals.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No referrals yet.</TableCell></TableRow>
                                ) : (
                                    referrals.map(ref => (
                                        <TableRow key={ref.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{ref.referrer?.name || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground">{ref.referrer?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{ref.referee?.name || 'Pending'}</span>
                                                    <span className="text-xs text-muted-foreground">{ref.referee?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(ref.created_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create Action Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Referral Action</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Campaign Name</Label>
                            <Input value={newAction.name} onChange={e => setNewAction({...newAction, name: e.target.value})} placeholder="Summer 2024 Promo" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={newAction.description} onChange={e => setNewAction({...newAction, description: e.target.value})} placeholder="Internal notes" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label>Reward ({t('dashboard.impact_credits')})</Label>
                                <Input type="number" value={newAction.credits} onChange={e => setNewAction({...newAction, credits: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateAction}>Create Action</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MlmManagement;