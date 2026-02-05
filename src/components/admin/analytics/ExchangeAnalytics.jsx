import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const ExchangeAnalytics = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  
  useEffect(() => {
    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('user_purchases')
            .select('*, exchange_products(name, price)');
        setPurchases(data || []);
        setLoading(false);
    };
    load();
  }, []);

  const stats = React.useMemo(() => {
      const productCount = {};
      let totalRev = 0;
      
      purchases.forEach(p => {
          const name = p.exchange_products?.name || 'Unknown';
          productCount[name] = (productCount[name] || 0) + p.quantity;
          totalRev += parseFloat(p.credits_spent);
      });

      const topProducts = Object.entries(productCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const avgPurchase = purchases.length ? totalRev / purchases.length : 0;

      return { topProducts, totalRev, avgPurchase };
  }, [purchases]);

  if(loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Top Purchased Products</CardTitle>
                    <CardDescription>Most popular items by quantity</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    {/* Exchange Overview */}
                    <CardTitle>{t('exchange.title')} Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium">{t('exchange.labels.total')} Credits Spent</p>
                            <p className="text-3xl font-bold text-blue-900">{stats.totalRev.toLocaleString()} </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 font-medium">Avg. Purchase Value</p>
                            <p className="text-2xl font-bold text-slate-800">{stats.avgPurchase.toFixed(0)} </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 font-medium">{t('exchange.labels.total')} Transactions</p>
                            <p className="text-2xl font-bold text-slate-800">{purchases.length}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default ExchangeAnalytics;