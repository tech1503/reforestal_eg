import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Coins } from 'lucide-react';
import { format } from 'date-fns';

const ImpactCreditsTable = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: res } = await supabase
                .from('impact_credits')
                .select('*, profiles:user_id(name, email)')
                .order('issued_date', { ascending: false });
            setData(res || []);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
             <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>User</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No transactions recorded.</TableCell></TableRow>
                    ) : data.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <div className="font-medium">{row.profiles?.name}</div>
                                <div className="text-xs text-slate-500">{row.profiles?.email}</div>
                            </TableCell>
                            <TableCell className="font-bold text-purple-600 flex items-center gap-1.5">
                                <Coins className="w-3.5 h-3.5"/> {parseFloat(row.amount).toFixed(0)}
                            </TableCell>
                            <TableCell>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                    {row.source}
                                </span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 max-w-[200px] truncate" title={row.description}>
                                {row.description}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                                {format(new Date(row.issued_date || row.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default ImpactCreditsTable;