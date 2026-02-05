import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const LandDollarsManagement = () => {
    const [landDollars, setLandDollars] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchLandDollars();
    }, []);

    const fetchLandDollars = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('land_dollars')
            .select(`
                *,
                profiles:user_id(name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            toast({variant: "destructive", title: "Error fetching Land Dollars"});
        } else {
            setLandDollars(data || []);
        }
        setLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Issued Land Dollars</CardTitle>
                <CardDescription>Registry of all generated certificates and QR codes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Holder</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Issued Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Link Ref</TableHead>
                            <TableHead className="text-right">Assets</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow><TableCell colSpan={6} className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                        ) : landDollars.length === 0 ? (
                             <TableRow><TableCell colSpan={6} className="text-center p-8 text-muted-foreground">No land dollars issued yet.</TableCell></TableRow>
                        ) : (
                            landDollars.map(ld => (
                                <TableRow key={ld.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{ld.profiles?.name || 'Unknown'}</span>
                                            <span className="text-xs text-muted-foreground">{ld.profiles?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold text-green-700">€{ld.amount}</TableCell>
                                    <TableCell>{new Date(ld.issued_date || ld.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px]">
                                            {ld.status || 'Issued'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {ld.link_ref ? ld.link_ref.slice(0,8)+'...' : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {ld.land_dollar_url && (
                                                <Button variant="ghost" size="icon" title="View Certificate" onClick={() => window.open(ld.land_dollar_url, '_blank')}>
                                                    <ImageIcon className="w-4 h-4 text-blue-600" />
                                                </Button>
                                            )}
                                            {ld.link_ref && (
                                                <Button variant="ghost" size="icon" title="Check Link" onClick={() => window.open(`https://reforest.al/ref/${ld.link_ref}`, '_blank')}>
                                                    <ExternalLink className="w-4 h-4 text-gray-600" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default LandDollarsManagement;