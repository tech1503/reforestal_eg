
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, TrendingUp, Calendar, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AdminUserHistoryModal = ({ isOpen, onClose, userId, userName }) => {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalCredits: 0, totalActions: 0, lastActive: null, topAction: 'N/A' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserHistory();
        }
    }, [isOpen, userId]);

    const fetchUserHistory = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .rpc('get_user_history', { p_user_id: userId, p_limit: 100 });

        if (!error && data) {
            setHistory(data);
            
            // Calculate Stats
            const totalCredits = data.reduce((sum, item) => sum + (item.impact_credits_awarded || 0), 0);
            const actionsByType = {};
            data.forEach(item => {
                actionsByType[item.action_type] = (actionsByType[item.action_type] || 0) + 1;
            });
            const topAction = Object.keys(actionsByType).reduce((a, b) => actionsByType[a] > actionsByType[b] ? a : b, 'N/A');

            setStats({
                totalCredits,
                totalActions: data.length,
                lastActive: data[0]?.action_date,
                topAction
            });
        }
        setLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Activity History: {userName}</DialogTitle>
                    <DialogDescription>Detailed log of user interactions and rewards.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="log">Detailed Log</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 p-1">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-emerald-50 border-emerald-100">
                                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-emerald-600 uppercase">Total Credits</CardTitle></CardHeader>
                                <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-emerald-900">{stats.totalCredits}</div></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-slate-500 uppercase">Actions Logged</CardTitle></CardHeader>
                                <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{stats.totalActions}</div></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-slate-500 uppercase">Top Activity</CardTitle></CardHeader>
                                <CardContent className="p-4 pt-0"><div className="text-lg font-bold truncate" title={stats.topAction}>{stats.topAction}</div></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-bold text-slate-500 uppercase">Last Active</CardTitle></CardHeader>
                                <CardContent className="p-4 pt-0"><div className="text-sm font-medium">{stats.lastActive ? format(new Date(stats.lastActive), 'MMM d, yyyy') : 'Never'}</div></CardContent>
                            </Card>
                        </div>
                        
                        <div className="border rounded-lg p-4 bg-slate-50">
                            <h4 className="font-semibold text-sm mb-3">Recent Timeline</h4>
                            <div className="space-y-4">
                                {history.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="mt-1 min-w-[40px] text-xs text-slate-400 text-right">{format(new Date(item.action_date), 'HH:mm')}</div>
                                        <div className="relative">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 relative z-10"></div>
                                            {i !== 4 && <div className="absolute top-2 left-1 w-px h-full bg-slate-200"></div>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{item.action_name}</p>
                                            <p className="text-xs text-emerald-600 font-bold">+{item.impact_credits_awarded} Credits</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="log" className="flex-1 overflow-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 sticky top-0">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Credits</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No history found.</TableCell></TableRow>
                                ) : (
                                    history.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                {format(new Date(item.action_date), 'PP p')}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">{item.action_name}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-xs font-normal">{item.action_type}</Badge></TableCell>
                                            <TableCell className="text-right font-mono text-emerald-600 font-bold">
                                                +{item.impact_credits_awarded}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AdminUserHistoryModal;
