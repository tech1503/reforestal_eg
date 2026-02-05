import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, ToggleRight, ToggleLeft, Loader2, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const LandDollarsTable = () => {
  const { t } = useTranslation();
  const [landDollars, setLandDollars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState(null);

  useEffect(() => {
    fetchLandDollars();
  }, []);

  const fetchLandDollars = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('land_dollars')
        .select(`
          id, user_id, link_ref, is_active, qr_code_url, created_at, 
          profiles!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLandDollars(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('land_dollars')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setLandDollars(prev => prev.map(ld => 
        ld.id === id ? { ...ld, is_active: !currentStatus } : ld
      ));
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const downloadQR = (url, linkRef) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `LandDollar_${linkRef}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.land_dollars.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left font-medium text-slate-500">{t('admin.land_dollars.user')}</th>
                  <th className="p-3 text-left font-medium text-slate-500">{t('admin.land_dollars.link_ref')}</th>
                  <th className="p-3 text-left font-medium text-slate-500">{t('admin.land_dollars.status')}</th>
                  <th className="p-3 text-right font-medium text-slate-500">{t('admin.land_dollars.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {landDollars.map((ld) => (
                  <tr key={ld.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                        <div className="font-medium">{ld.profiles?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{ld.profiles?.email}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-600">{ld.link_ref}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        ld.is_active 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {ld.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedQR(ld)} title={t('admin.land_dollars.view_qr')}>
                        <Eye className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadQR(ld.qr_code_url, ld.link_ref)} title={t('admin.land_dollars.download')}>
                        <Download className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(ld.id, ld.is_active)} title={t('admin.land_dollars.toggle')}>
                        {ld.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Land Dollar Preview</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center p-4">
                {selectedQR?.qr_code_url ? (
                    <img src={selectedQR.qr_code_url} alt="Land Dollar" className="w-full rounded-lg shadow-lg border" />
                ) : (
                    <div className="flex flex-col items-center text-slate-400 py-10">
                        <QrCode className="w-12 h-12 mb-2" />
                        <p>No image generated</p>
                    </div>
                )}
                <p className="mt-4 font-mono text-sm text-slate-500">REF: {selectedQR?.link_ref}</p>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LandDollarsTable;
