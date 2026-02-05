import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // IMPORTADO
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const AnalyticsLandDollarsIC = () => {
  const { t } = useTranslation(); // HOOK
  const [ldMetrics, setLdMetrics] = useState(null);
  const [icMetrics, setIcMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();

    const channel = supabase
      .channel('analytics-financial-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_history' }, () => fetchMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'land_dollars' }, () => fetchMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // 1. Métricas Land Dollars
      const { data: ldData, error: ldError } = await supabase
        .from('land_dollars')
        .select('id, status');
      
      if (ldError) throw ldError;

      const totalLD = ldData?.length || 0;
      const activeLD = ldData?.filter(ld => ld.status === 'issued' || ld.status === 'active').length || 0;
      const inactiveLD = totalLD - activeLD;
      
      setLdMetrics({ total: totalLD, active: activeLD, inactive: inactiveLD });

      // 2. Métricas Impact Credits
      const { data: icData, error: icError } = await supabase
        .from('gamification_history')
        .select('impact_credits_awarded, action_type');
      
      if (icError) throw icError;

      const totalIC = icData?.reduce((sum, item) => sum + (Number(item.impact_credits_awarded) || 0), 0) || 0;
      
      const sourceMap = icData?.reduce((acc, item) => {
        const src = item.action_type || 'system';
        acc[src] = (acc[src] || 0) + (Number(item.impact_credits_awarded) || 0);
        return acc;
      }, {}) || {};

      const bySource = Object.entries(sourceMap).map(([source, total]) => ({ source, total }));
      
      setIcMetrics({ total: totalIC, bySource });

      // 3. Historial
      const { data: historyData, error: histError } = await supabase
        .from('gamification_history')
        .select(`
          id,
          user_id, 
          impact_credits_awarded, 
          action_type, 
          action_name,
          created_at,
          profiles:user_id(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (histError) throw histError;
        
      setHistory(historyData || []);

    } catch (err) {
      console.error('Analytics Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !ldMetrics) {
      return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={fetchMetrics}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
          </Button>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">{t('admin.analytics.land_dollars_metrics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t('admin.analytics.total')} Issued</div>
              <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{ldMetrics?.total}</div>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">{t('admin.analytics.active')} Assets</div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{ldMetrics?.active}</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 opacity-70">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t('admin.analytics.inactive')} / Pending</div>
              <div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mt-1">{ldMetrics?.inactive}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">{t('admin.analytics.impact_credits_metrics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-indigo-600">{icMetrics?.total?.toLocaleString()}</span>
                <span className="text-sm text-slate-500 font-medium">{t('admin.analytics.total_ic_distributed')}</span>
              </div>
              
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={icMetrics?.bySource || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="source" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-medium">{t('admin.analytics.audit_history')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-y-auto max-h-[350px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="p-3 text-left">{t('admin.analytics.user')}</th>
                      <th className="p-3 text-left">{t('admin.analytics.action')}</th>
                      <th className="p-3 text-right">{t('admin.analytics.ic_awarded')}</th>
                      <th className="p-3 text-right">{t('admin.analytics.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3">
                            <div className="font-medium text-slate-700 dark:text-slate-200">
                                {item.profiles?.name || 'System'}
                            </div>
                            <div className="text-[10px] text-slate-400 hidden sm:block">{item.profiles?.email}</div>
                        </td>
                        <td className="p-3">
                            <div className="text-slate-600 dark:text-slate-300 font-medium text-xs">{item.action_type}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={item.action_name}>
                                {item.action_name}
                            </div>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">+{item.impact_credits_awarded}</td>
                        <td className="p-3 text-right text-slate-400 font-mono text-[10px]">
                          {format(new Date(item.created_at), 'HH:mm')}
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                        <tr><td colSpan="4" className="p-4 text-center text-slate-400 text-xs">No activity recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default AnalyticsLandDollarsIC;