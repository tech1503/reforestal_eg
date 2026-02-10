import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getImpactCreditsHistory, getImpactCreditsSummary } from '@/services/impactCreditService';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, TrendingDown, Network, Coins } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const ImpactCreditsMLM = () => {
  const { t } = useTranslation(); // HOOK
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState([]);
  const [mlmData, setMLMData] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [chartData, setChartData] = useState({ earned: [], spent: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: icData, error: icError } = await supabase
        .from('impact_credits')
        .select(`
          id, user_id, amount, source, description, issued_date,
          profiles:user_id(name, email)
        `)
        .order('issued_date', { ascending: false })
        .limit(100);

      if (icError) throw icError;

      // Fetch MLM Referrals
      const { data: mlmReferrals, error: mlmError } = await supabase
        .from('mlm_referrals')
        .select(`
          *,
          referrer:referrer_id(name, email),
          referred:referred_id(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (mlmError) throw mlmError;

      // Fetch purchase data for trend analysis
      const { data: purchases } = await supabase
        .from('user_purchases')
        .select('credits_spent, purchased_at')
        .order('purchased_at', { ascending: false })
        .limit(50);

      setLedgerData(icData || []);
      setMLMData(mlmReferrals || []);
      
      // Process chart data
      processChartData(icData || [], purchases || []);

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (credits, purchases) => {
    // Group by month
    const earnedByMonth = credits.reduce((acc, c) => {
      const month = format(new Date(c.issued_date), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + parseFloat(c.amount);
      return acc;
    }, {});

    const spentByMonth = purchases.reduce((acc, p) => {
      const month = format(new Date(p.purchased_at), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + parseFloat(p.credits_spent);
      return acc;
    }, {});

    const months = [...new Set([...Object.keys(earnedByMonth), ...Object.keys(spentByMonth)])];
    
    const chartData = months.map(month => ({
      month,
      earned: earnedByMonth[month] || 0,
      spent: spentByMonth[month] || 0
    }));

    setChartData(chartData);
  };

  const filteredLedger = sourceFilter === 'all' 
    ? ledgerData 
    : ledgerData.filter(item => item.source === sourceFilter);

  const uniqueSources = [...new Set(ledgerData.map(item => item.source))];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total {t('dashboard.impact_credits')} Issued</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {ledgerData.reduce((sum, item) => sum + parseFloat(item.amount), 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">MLM Distributions</p>
                <p className="text-2xl font-bold text-violet-600">
                  {mlmData.reduce((sum, item) => sum + parseFloat(item.ic_assigned_sender || 0), 0).toLocaleString()}
                </p>
              </div>
              <Network className="w-8 h-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Transactions</p>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {ledgerData.length}
                </p>
              </div>
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ledger" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ledger">{t('dashboard.impact_credits')} Ledger</TabsTrigger>
          <TabsTrigger value="mlm">MLM Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('dashboard.impact_credits')} Ledger</span>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {uniqueSources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
              <CardDescription>Complete transaction history across all users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="p-3 text-left font-medium text-slate-500">{t('admin.startnext.user')}</th>
                      <th className="p-3 text-left font-medium text-slate-500">{t('admin.startnext.amount')}</th>
                      <th className="p-3 text-left font-medium text-slate-500">{t('dashboard.source')}</th>
                      <th className="p-3 text-left font-medium text-slate-500">Description</th>
                      <th className="p-3 text-right font-medium text-slate-500">{t('dashboard.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3">
                            <div className="font-medium">{item.profiles?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400">{item.profiles?.email}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-emerald-600">+{item.amount}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {item.source}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate">
                            {item.description}
                          </td>
                          <td className="p-3 text-right text-xs text-slate-400 font-mono">
                            {format(new Date(item.issued_date), 'MMM d, yyyy HH:mm')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mlm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MLM Referral Distribution</CardTitle>
              <CardDescription>Tracking {t('dashboard.impact_credits')} distributed through referral network</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="p-3 text-left font-medium text-slate-500">Referrer</th>
                      <th className="p-3 text-left font-medium text-slate-500">Referred</th>
                      <th className="p-3 text-right font-medium text-slate-500">BP to Referrer</th>
                      <th className="p-3 text-right font-medium text-slate-500">BP to Referred</th>
                      <th className="p-3 text-right font-medium text-slate-500">{t('dashboard.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {mlmData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No MLM distributions yet
                        </td>
                      </tr>
                    ) : (
                      mlmData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3">
                            <div className="font-medium">{item.referrer?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400">{item.referrer?.email}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{item.referred?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400">{item.referred?.email}</div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-violet-600">+{item.ic_assigned_sender}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-emerald-600">+{item.ic_assigned_receiver}</span>
                          </td>
                          <td className="p-3 text-right text-xs text-slate-400 font-mono">
                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>BP Earned vs Spent Trends</CardTitle>
              <CardDescription>Monthly comparison of {t('dashboard.impact_credits')} flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="earned" stroke="#10b981" strokeWidth={2} name="Earned" />
                    <Line type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={2} name="Spent" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImpactCreditsMLM;
