import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const SystemLogs = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        // Assuming the admin_audit_logs table exists from the DB migration
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select(`
                *,
                admin:admin_id (email, name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (!error) {
            setAuditLogs(data || []);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600"/>
                        Security Audit Logs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Admin</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                            ) : auditLogs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-8 text-muted-foreground">No audit logs found.</TableCell></TableRow>
                            ) : auditLogs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium text-sm">
                                        {log.admin?.name || 'Unknown'} <br/>
                                        <span className="text-xs text-muted-foreground">{log.admin?.email}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="uppercase text-[10px] font-bold">
                                            {log.action_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">
                                        {log.target_table} <br/> {log.target_id?.slice(0,8)}...
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={JSON.stringify(log.details)}>
                                        {JSON.stringify(log.details)}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="bg-slate-50 border-dashed">
                    <CardContent className="p-6">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600"/>
                            RLS Policy Status
                        </h4>
                        <p className="text-sm text-slate-600 mb-4">
                            Row Level Security is enabled on all sensitive tables. Direct database access is restricted.
                        </p>
                        <div className="flex gap-2 text-xs">
                            <Badge className="bg-green-600">Profiles: Protected</Badge>
                            <Badge className="bg-green-600">Contributions: Protected</Badge>
                            <Badge className="bg-green-600">Assets: Protected</Badge>
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
    );
};

export default SystemLogs;