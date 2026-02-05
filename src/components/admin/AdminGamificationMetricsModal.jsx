import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Activity, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const AdminGamificationMetricsModal = ({ isOpen, onClose, userScoring }) => {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('overview');
    const [evalScore, setEvalScore] = useState(0);
    const [adminNotes, setAdminNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (userScoring) {
            setEvalScore(userScoring.founding_pioneer_evaluation_score || 0);
            setAdminNotes(userScoring.admin_notes || '');
            if (isOpen) fetchUserHistory(userScoring.user_id);
        }
    }, [userScoring, isOpen]);

    const fetchUserHistory = async (userId) => {
        setLoadingHistory(true);
        const { data } = await supabase
            .from('gamification_history')
            .select('*')
            .eq('user_id', userId)
            .order('action_date', { ascending: false });
        setHistory(data || []);
        setLoadingHistory(false);
    };

    const handleSave = async () => {
        setSaving(true);
        // CORRECCIÓN: Apuntando a 'founding_pioneer_metrics'
        const { error } = await supabase
            .from('founding_pioneer_metrics') 
            .update({
                founding_pioneer_evaluation_score: evalScore,
                admin_notes: adminNotes,
                updated_at: new Date().toISOString()
            })
            .eq('id', userScoring.id);

        if (error) toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        else {
            toast({ title: t('common.success'), description: 'Metrics updated successfully.' });
            onClose();
        }
        setSaving(false);
    };

    const handleUpdateStatus = async (status) => {
        const updates = { 
            founding_pioneer_access_status: status,
            updated_at: new Date().toISOString()
        };
        if (status === 'approved') updates.founding_pioneer_access_date = new Date().toISOString();
        if (status === 'revoked') updates.founding_pioneer_revoke_date = new Date().toISOString();

        // CORRECCIÓN: Apuntando a 'founding_pioneer_metrics'
        const { error } = await supabase
            .from('founding_pioneer_metrics')
            .update(updates)
            .eq('id', userScoring.id);

        if (error) toast({ variant: 'destructive', title: t('common.error'), description: error.message });
        else {
            toast({ title: t('common.success'), description: `User access ${status}.` });
            onClose();
        }
    };

    if (!userScoring) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        User Metrics: {userScoring.profile?.name}
                        <Badge variant="outline">{userScoring.founding_pioneer_access_status}</Badge>
                    </DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="overview">{t('admin.overview')}</TabsTrigger>
                        <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto py-4 pr-2">
                        <TabsContent value="overview" className="mt-0 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {/* CORRECCIÓN: Usando 'total_impact_credits_earned' que es el nombre real en DB */}
                                <MetricCard icon={Trophy} label={t('dashboard.impact_credits')} value={userScoring.total_impact_credits_earned} color="text-amber-500" />
                                <MetricCard icon={Activity} label="Eval Score" value={userScoring.founding_pioneer_evaluation_score} color="text-blue-500" />
                                {/* CORRECCIÓN: Usando 'rank' que es el nombre real en DB (si existe) o calculándolo */}
                                <MetricCard icon={ShieldCheck} label="Rank" value={userScoring.rank || 'N/A'} color="text-emerald-500" />
                                
                                <MetricCard label="Quests" value={userScoring.quests_participated} />
                                <MetricCard label="Missions" value={userScoring.mission_quests_participated} />
                                <MetricCard label="Referrals" value={userScoring.referrals_count} />
                                <MetricCard label="Contributions" value={userScoring.contribution_count} />
                                
                                <div className="col-span-full bg-gray-50 p-3 rounded-lg border">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">System Flags</p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant={userScoring.genesis_quest_completed ? "default" : "secondary"}>Genesis Quest</Badge>
                                        <Badge variant={userScoring.profile_updated ? "default" : "secondary"}>Profile Updated</Badge>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="evaluation" className="mt-0 space-y-6">
                            <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
                                <h4 className="font-semibold text-sm">Founding Pioneer Status</h4>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleUpdateStatus('approved')} disabled={userScoring.founding_pioneer_access_status === 'approved'} className="bg-emerald-600 hover:bg-emerald-700">Approve Access</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus('rejected')} disabled={userScoring.founding_pioneer_access_status === 'rejected'}>Reject</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('revoked')} className="text-orange-600 border-orange-200 hover:bg-orange-50">Revoke</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Evaluation Score (0-100)</label>
                                <Input type="number" min="0" max="100" value={evalScore} onChange={e => setEvalScore(e.target.value)} />
                                <p className="text-xs text-muted-foreground">This score determines ranking for the Top 100 limit.</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="mt-0">
                            {loadingHistory ? <Loader2 className="animate-spin mx-auto mt-8" /> : (
                                <div className="space-y-2">
                                    {history.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-2 border rounded-md text-sm hover:bg-gray-50">
                                            <div>
                                                <p className="font-medium">{item.action_name}</p>
                                                <p className="text-xs text-gray-500">{format(new Date(item.action_date), 'PP p')}</p>
                                            </div>
                                            <Badge variant="outline">+{item.impact_credits_awarded}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="notes" className="mt-0 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Admin Notes</label>
                                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={8} placeholder="Internal notes about this user..." />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('common.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const MetricCard = ({ icon: Icon, label, value, color }) => (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-1">
            {Icon && <Icon className={`w-4 h-4 ${color}`} />}
            <span className="text-xs text-gray-500 uppercase font-semibold">{label}</span>
        </div>
        <p className="text-xl font-bold text-gray-900">{value || 0}</p>
    </div>
);

export default AdminGamificationMetricsModal;