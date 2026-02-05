import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader, Filter } from 'lucide-react';
import { format } from 'date-fns';

const VestingManagement = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('reforestal_credits_ledger')
        .select(`
          *,
          profiles:user_id (email, name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) console.error('Error fetching ledger:', error);
      else setLedger(data || []);
      setLoading(false);
    };

    fetchLedger();
  }, []);

  const getStatusBadge = (status) => {
    const styles = {
      'fully_vested': 'bg-green-100 text-green-800 border-green-200',
      'vesting_linearly': 'bg-blue-100 text-blue-800 border-blue-200',
      'in_cliff': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'forfeited': 'bg-red-100 text-red-800 border-red-200'
    };
    return <Badge variant="outline" className={styles[status] || 'bg-gray-100'}>{status?.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-medium">Vesting & Staking Ledger</h3>
                <p className="text-sm text-muted-foreground">Detailed view of all credit transactions and vesting schedules.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-50">
                <CardContent className="p-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Ledger Entries</p>
                    <h2 className="text-2xl font-bold">{ledger.length}</h2>
                </CardContent>
            </Card>
            {/* Additional summary cards could go here if we calculate totals */}
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Global Vesting Ledger</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Source Event</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Vesting Status</TableHead>
                            <TableHead>Earning Date</TableHead>
                            <TableHead>Last Update</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                    <Loader className="animate-spin mx-auto h-8 w-8 text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : ledger.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{entry.profiles?.name}</span>
                                        <span className="text-xs text-muted-foreground">{entry.profiles?.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                    {entry.source_event}
                                    <span className="block text-xs text-slate-400">ID: {entry.source_event_id}</span>
                                </TableCell>
                                <TableCell>
                                    <span className={`font-mono font-bold ${entry.credits_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {entry.credits_amount > 0 ? '+' : ''}{entry.credits_amount}
                                    </span>
                                </TableCell>
                                <TableCell>{getStatusBadge(entry.vesting_status)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {entry.earning_timestamp && format(new Date(entry.earning_timestamp), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {entry.last_update_timestamp && format(new Date(entry.last_update_timestamp), 'MMM d, HH:mm')}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
};

export default VestingManagement;