
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Eye, Star } from 'lucide-react';
import AdminGamificationMetricsModal from './AdminGamificationMetricsModal';

const AdminGamificationScoring = () => {
    const { toast } = useToast();
    const [scoring, setScoring] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchScoring();
        // Listening to 'founding_pioneer_metrics' instead of 'gamification_user_scoring'
        const channel = supabase.channel('gamification_scoring_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics' }, fetchScoring)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchScoring = async () => {
        setLoading(true);
        // CRITICAL FIX: Querying 'founding_pioneer_metrics' because 'gamification_user_scoring' was consolidated into it.
        const { data, error } = await supabase
            .from('founding_pioneer_metrics')
            .select(`
                *,
                profile:user_id (email, name)
            `)
            .order('total_impact_credits_earned', { ascending: false });

        if (error) {
            console.error(error);
            setScoring([]);
        } else {
            setScoring(data || []);
        }
        setLoading(false);
    };

    const handleViewMetrics = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const filteredScoring = scoring.filter(item => 
        item.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch(status) {
            case 'approved': return <Badge className="bg-emerald-500">Approved</Badge>;
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
            case 'revoked': return <Badge variant="outline" className="border-red-500 text-red-500">Revoked</Badge>;
            default: return <Badge variant="secondary">Pending</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">User Scoring & Ranking</h3>
                    <p className="text-sm text-gray-500">Founding Pioneer Metrics Table.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search user..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>Rank</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead className="text-center">Total Credits</TableHead>
                            <TableHead className="text-center">Eval Score</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
                        ) : filteredScoring.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No data found.</TableCell></TableRow>
                        ) : (
                            filteredScoring.map((item, idx) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-bold text-gray-500">#{item.rank || idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{item.profile?.name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{item.profile?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono font-bold text-emerald-600">{item.total_impact_credits_earned}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                            <span className="font-bold">{item.evaluation_score}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{getStatusBadge(item.founding_pioneer_access_status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleViewMetrics(item)}>
                                            <Eye className="w-4 h-4 mr-2" /> Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AdminGamificationMetricsModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setSelectedUser(null); }}
                userScoring={selectedUser}
            />
        </div>
    );
};

export default AdminGamificationScoring;
