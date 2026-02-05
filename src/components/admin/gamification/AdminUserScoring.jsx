
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, RotateCcw, FileText, BarChart2 } from 'lucide-react';
import AdminUserHistoryModal from './AdminUserHistoryModal';
import AdminGamificationMetricsModal from '../AdminGamificationMetricsModal';

const AdminUserScoring = () => {
    const { toast } = useToast();
    const [scoringData, setScoringData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [selectedUserHistory, setSelectedUserHistory] = useState(null);
    const [selectedUserMetrics, setSelectedUserMetrics] = useState(null);

    useEffect(() => {
        fetchScoring();
        // Subscribe to metrics updates
        const channel = supabase.channel('scoring_view_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics' }, fetchScoring)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchScoring = async () => {
        setLoading(true);
        // We use founding_pioneer_metrics as the cached aggregate source
        const { data, error } = await supabase
            .from('founding_pioneer_metrics')
            .select(`
                *,
                profile:user_id (id, email, name)
            `)
            .order('total_impact_credits_earned', { ascending: false });

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } else {
            setScoringData(data || []);
        }
        setLoading(false);
    };

    const handleResetScoring = async (userId) => {
        if (!window.confirm("DANGER: This will wipe all gamification history and reset scores for this user. Continue?")) return;
        const { error } = await supabase.rpc('admin_reset_user_scoring', { p_user_id: userId });
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
        else toast({ title: 'Reset Complete', description: 'User scoring has been reset.' });
    };

    const filteredData = scoringData.filter(item => 
        item.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">User Scoring Overview</h3>
                    <p className="text-sm text-gray-500">Aggregated metrics from gamification history.</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search user..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>User</TableHead>
                            <TableHead className="text-right">Total Credits</TableHead>
                            <TableHead className="text-center">Genesis</TableHead>
                            <TableHead className="text-center">Quests</TableHead>
                            <TableHead className="text-center">Referrals</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
                        ) : filteredData.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No data found.</TableCell></TableRow>
                        ) : (
                            filteredData.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.profile?.name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{item.profile?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-emerald-600">{item.total_impact_credits_earned}</TableCell>
                                    <TableCell className="text-center">
                                        {item.genesis_quest_completed ? <Badge className="bg-emerald-500">Done</Badge> : <span className="text-gray-400">-</span>}
                                    </TableCell>
                                    <TableCell className="text-center">{item.quests_participated}</TableCell>
                                    <TableCell className="text-center">{item.referrals_count}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedUserHistory({ id: item.user_id, name: item.profile?.name })} title="Full History">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedUserMetrics(item)} title="Metrics Detail">
                                                <BarChart2 className="w-4 h-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleResetScoring(item.user_id)} title="Reset Scoring">
                                                <RotateCcw className="w-4 h-4 text-red-400" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AdminUserHistoryModal 
                isOpen={!!selectedUserHistory} 
                onClose={() => setSelectedUserHistory(null)} 
                userId={selectedUserHistory?.id}
                userName={selectedUserHistory?.name}
            />

            <AdminGamificationMetricsModal
                isOpen={!!selectedUserMetrics}
                onClose={() => setSelectedUserMetrics(null)}
                userScoring={selectedUserMetrics}
            />
        </div>
    );
};

export default AdminUserScoring;
