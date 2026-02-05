import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AdminFoundingPioneerRanking = () => {
    const { toast } = useToast();
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRanking();
        // Listening to consolidated table
        const channel = supabase.channel('ranking_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics' }, fetchRanking)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchRanking = async () => {
        setLoading(true);
        // Using 'founding_pioneer_metrics'
        const { data, error } = await supabase
            .from('founding_pioneer_metrics')
            .select('*, profile:user_id(email, name)')
            .eq('founding_pioneer_access_status', 'approved')
            .order('evaluation_score', { ascending: false })
            .limit(150);

        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
        else setRanking(data || []);
        setLoading(false);
    };

    const handleLimitToTop100 = async () => {
        if (!window.confirm("WARNING: This will REVOKE access for all approved users currently ranked below 100. Continue?")) return;
        
        setProcessing(true);
        try {
            const { data, error } = await supabase.rpc('limit_founding_pioneers_top_100');
            if (error) throw error;
            toast({ title: 'Success', description: `Top 100 Enforced.` });
            fetchRanking(); 
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div>
                    <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-600" /> Founding Pioneer Top 100
                    </h3>
                    <p className="text-sm text-amber-700">Manage the elite tier. Only the top 100 scored users should maintain access.</p>
                </div>
                <Button variant="destructive" onClick={handleLimitToTop100} disabled={processing} className="whitespace-nowrap">
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enforce Top 100 Limit
                </Button>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead className="w-[80px]">Rank</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead className="text-center">Credits</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
                        ) : ranking.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No approved pioneers found.</TableCell></TableRow>
                        ) : (
                            ranking.map((item, index) => {
                                const rank = index + 1;
                                const isAtRisk = rank > 100;
                                return (
                                    <TableRow key={item.id} className={isAtRisk ? 'bg-red-50' : ''}>
                                        <TableCell className="font-bold text-lg">#{rank}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{item.profile?.name || 'Unknown'}</span>
                                                <span className="text-xs text-gray-500">{item.profile?.email}</span>
                                                {isAtRisk && <span className="text-xs text-red-600 font-bold flex items-center mt-1"><AlertTriangle className="w-3 h-3 mr-1"/> At Risk</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-xl">{item.evaluation_score}</TableCell>
                                        <TableCell className="text-center font-mono text-gray-600">{item.total_impact_credits_earned}</TableCell>
                                        <TableCell className="text-center"><Badge className="bg-emerald-500">Approved</Badge></TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default AdminFoundingPioneerRanking;
