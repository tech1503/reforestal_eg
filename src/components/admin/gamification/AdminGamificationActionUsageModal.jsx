import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const AdminGamificationActionUsageModal = ({ isOpen, onClose, action }) => {
    const { t } = useTranslation();
    const [usageHistory, setUsageHistory] = useState([]);
    const [stats, setStats] = useState({ totalCalls: 0, totalCredits: 0, uniqueUsers: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && action) {
            fetchUsage(action.id);
        }
    }, [isOpen, action]);

    const fetchUsage = async (actionId) => {
        setLoading(true);
        
        const { data, error } = await supabase
            .from('gamification_history')
            .select(`
                *,
                profiles:user_id(email, name)
            `)
            .eq('action_id', actionId)
            .order('action_date', { ascending: false })
            .limit(100);

        if (!error && data) {
            setUsageHistory(data);
            
            const totalCredits = data.reduce((acc, curr) => acc + (curr.impact_credits_awarded || 0), 0);
            const usersSet = new Set(data.map(d => d.user_id));
            
            const { count } = await supabase
                .from('gamification_history')
                .select('*', { count: 'exact', head: true })
                .eq('action_id', actionId);

            setStats({
                totalCalls: count || data.length,
                totalCredits: totalCredits, 
                uniqueUsers: usersSet.size
            });
        }
        setLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600"/>
                        {t('gamification_admin.action_usage_modal.title', 'Usage Report:')} {action?.action_title}
                    </DialogTitle>
                    <DialogDescription>{t('gamification_admin.action_usage_modal.desc', 'Analysis of how this action affects user scoring.')}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 my-4">
                    <Card className="bg-slate-50">
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-slate-500">{t('gamification_admin.action_usage_modal.stats.total_calls', 'Total Executions')}</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{stats.totalCalls}</div></CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-slate-500">{t('gamification_admin.action_usage_modal.stats.unique_users', 'Unique Users (Recent)')}</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{stats.uniqueUsers}</div></CardContent>
                    </Card>
                    <Card className="bg-slate-50">
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-slate-500">{t('gamification_admin.action_usage_modal.stats.action_value', 'Action Value')}</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-emerald-600">+{action?.impact_credits_value}</div></CardContent>
                    </Card>
                </div>

                <div className="flex-1 overflow-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 sticky top-0">
                                <TableHead>{t('gamification_admin.action_usage_modal.table.user', 'User')}</TableHead>
                                <TableHead>{t('gamification_admin.action_usage_modal.table.credits_awarded', 'Credits Awarded')}</TableHead>
                                <TableHead>{t('gamification_admin.action_usage_modal.table.date', 'Date')}</TableHead>
                                <TableHead>{t('gamification_admin.action_usage_modal.table.context', 'Context/Trigger')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : usageHistory.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('gamification_admin.action_usage_modal.no_usage', 'No usage recorded yet.')}</TableCell></TableRow>
                            ) : (
                                usageHistory.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{record.profiles?.name || 'Unknown'}</span>
                                                <span className="text-xs text-muted-foreground">{record.profiles?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-bold text-emerald-600">+{record.impact_credits_awarded}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{format(new Date(record.action_date), 'PP p')}</TableCell>
                                        <TableCell className="text-xs">{record.action_type}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AdminGamificationActionUsageModal;
