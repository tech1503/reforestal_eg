import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

const AdminGamificationHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        fetchHistory();
        const channel = supabase.channel('gamification_history_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gamification_history' }, fetchHistory)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        // CORRECCIÓN: Quitamos el hint explícito.
        const { data, error } = await supabase
            .from('gamification_history')
            .select(`
                *,
                profile:user_id (email, name)
            `)
            .order('action_date', { ascending: false })
            .limit(100);

        if (error) {
            console.warn("Gamification History table not ready or empty", error);
            setHistory([]);
        } else {
            setHistory(data || []);
        }
        setLoading(false);
    };

    const filteredHistory = history.filter(item => 
        item.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.action_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <h3 className="text-lg font-bold text-gray-800">Activity Log</h3>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Credits</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
                        ) : filteredHistory.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No logs found.</TableCell></TableRow>
                        ) : (
                            filteredHistory.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{item.profile?.name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{item.profile?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700">{item.action_name}</TableCell>
                                    <TableCell><span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{item.action_type}</span></TableCell>
                                    <TableCell className="text-right font-mono text-emerald-600 font-bold">+{item.impact_credits_awarded}</TableCell>
                                    <TableCell className="text-xs text-gray-500">{format(new Date(item.action_date), 'PP p')}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default AdminGamificationHistory;
