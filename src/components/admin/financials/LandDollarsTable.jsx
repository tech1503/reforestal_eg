import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, QrCode, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
// IMPORTAMOS EL GENERADOR
import { generateLandDollarWithQR } from '@/utils/landDollarQRRenderer';

const LandDollarsTable = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    // ESTADO NUEVO PARA LA DESCARGA
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: res } = await supabase
                .from('land_dollars')
                .select('*, profiles:user_id(name, email)')
                .order('created_at', { ascending: false });
            setData(res || []);
            setLoading(false);
        };
        
        // SUSCRIPCIÓN REALTIME (MEJORA)
        const sub = supabase
            .channel('admin_ld_table')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'land_dollars' }, () => load())
            .subscribe();

        load();
        return () => { sub.unsubscribe(); };
    }, []);

    // FUNCIÓN NUEVA PARA DESCARGAR COPIA
    const handleAdminDownload = async (asset) => {
        setDownloadingId(asset.id);
        try {
            const blob = await generateLandDollarWithQR(asset.link_ref);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Admin_Copy_LandDollar_${asset.link_ref}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Download error", e);
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400"/></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
             <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>Holder</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ref Code</TableHead>
                        <TableHead className="text-right">Digital Assets</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No assets issued.</TableCell></TableRow>
                    ) : data.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <div className="font-medium">{row.profiles?.name || 'Guest User'}</div>
                                <div className="text-xs text-slate-500">{row.profiles?.email || 'N/A'}</div>
                            </TableCell>
                            <TableCell className="font-bold text-emerald-600">€{parseFloat(row.amount || 0).toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={row.status === 'active' || row.status === 'issued' ? 'default' : 'secondary'} className={row.status === 'active' || row.status === 'issued' ? 'bg-green-600' : ''}>
                                    {row.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{row.link_ref}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {/* Botón de Descarga Añadido */}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleAdminDownload(row)}
                                        disabled={downloadingId === row.id}
                                        title="Download Copy"
                                    >
                                        {downloadingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
                                    </Button>
                                    
                                    {/* Botones Originales mantenidos */}
                                    {row.qr_code_url && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(row.qr_code_url, '_blank')} title="View QR">
                                            <QrCode className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default LandDollarsTable;