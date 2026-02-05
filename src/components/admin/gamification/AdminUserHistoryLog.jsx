
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const AdminUserHistoryLog = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
        const channel = supabase.channel('global_history_log')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_history' }, fetchLogs)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('gamification_history')
            .select(`
                *,
                profile:user_id (email, name)
            `)
            .order('action_date', { ascending: false })
            .limit(100); // Pagination could be added here
        
        if (error) console.error(error);
        else setLogs(data || []);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this log entry? Credits will NOT be automatically deducted from user total (requires recalc).")) return;
        const { error } = await supabase.from('gamification_history').delete().eq('id', id);
        if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
        else toast({ title: 'Deleted', description: 'Entry removed.' });
    };

    const filteredLogs = logs.filter(log => 
        log.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.action_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">System Activity Log</h3>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>System Binding</TableHead>
                            <TableHead className="text-right">Credits</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
                        ) : filteredLogs.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No logs found.</TableCell></TableRow>
                        ) : (
                            filteredLogs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-slate-500">{format(new Date(log.action_date), 'PP p')}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{log.profile?.name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">{log.profile?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700">{log.action_name}</TableCell>
                                    <TableCell><span className="text-xs bg-gray-100 px-2 py-1 rounded">{log.action_type}</span></TableCell>
                                    <TableCell className="text-right font-mono text-emerald-600 font-bold">+{log.impact_credits_awarded}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="h-6 w-6">
                                            <Trash2 className="w-3 h-3 text-red-300 hover:text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default AdminUserHistoryLog;
