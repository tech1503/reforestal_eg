import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, ToggleRight, ToggleLeft, Loader2, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateLandDollarWithQR } from '@/utils/landDollarGenerator';

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
        .from('land_dollar_tokens')
        .select(`
          id, first_claimed_by_user_id, short_code, is_active, created_at, 
          profiles:first_claimed_by_user_id(name, email)
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

  const toggleActive = async (shortCode, currentStatus) => {
    try {
      const { error } = await supabase
        .from('land_dollar_tokens')
        .update({ is_active: !currentStatus })
        .eq('short_code', shortCode);

      if (error) throw error;

      setLandDollars(prev => prev.map(ld => 
        ld.short_code === shortCode ? { ...ld, is_active: !currentStatus } : ld
      ));
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const [previewImg, setPreviewImg] = useState('');

  useEffect(() => {
    if (selectedQR?.short_code) {
      setPreviewImg(generateLandDollarWithQR(selectedQR.short_code));
    }
  }, [selectedQR]);

  const downloadQR = async (code, refName) => {
    if (!code) return;
    const blob = await generateLandDollarWithQR(code);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LandDollar_${refName || code}.png`;
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
              <thead className="bg-background">
                <tr>
                  <th className="p-3 text-left font-medium text-foreground">{t('admin.land_dollars.user')}</th>
                  <th className="p-3 text-left font-medium text-foreground">{t('admin.land_dollars.link_ref')}</th>
                  <th className="p-3 text-left font-medium text-foreground">{t('admin.land_dollars.status')}</th>
                  <th className="p-3 text-right font-medium text-foreground">{t('admin.land_dollars.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-reforestal-accentPrimary dark:divide-slate-700">
                {landDollars.map((ld) => (
                  <tr key={ld.short_code} className="hover:bg-background dark:hover:bg-background/50">
                    <td className="p-3">
                        <div className="font-medium">{ld.profiles?.name || 'Unknown'}</div>
                        <div className="text-xs text-foreground">{ld.profiles?.email}</div>
                    </td>
                    <td className="p-3 font-mono text-xs text-foreground">{ld.short_code}</td>
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
                      <Button variant="ghost" size="icon" onClick={() => downloadQR(ld.short_code)} title={t('admin.land_dollars.download')}>
                        <Download className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(ld.short_code, ld.is_active)} title={t('admin.land_dollars.toggle')}>
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
                {selectedQR?.short_code && previewImg ? (
                    <img src={previewImg} alt="Land Dollar" className="w-full rounded-lg shadow-lg border" />
                ) : (
                    <div className="flex flex-col items-center text-foreground py-10">
                        <QrCode className="w-12 h-12 mb-2" />
                        <p>No image generated</p>
                    </div>
                )}
                <p className="mt-4 font-mono text-sm text-foreground">REF: {selectedQR?.short_code}</p>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LandDollarsTable;
