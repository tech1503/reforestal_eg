import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAnalyticsFeedback } from '@/hooks/useAnalyticsFeedback';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer 
} from 'recharts';
import { Loader2, Users, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const AnalyticsReporting = () => {
    useAnalyticsFeedback();
    const { t } = useTranslation();

    // --- Estado ---
    const [metrics, setMetrics] = useState({
        communityGrowth: 0,
        exchangeVolume: 0,
        activity: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Lógica de Obtención de Datos ---
    // Usamos useCallback para evitar que la función se recree en cada renderizado
    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: reportData, error: apiError } = await supabase
                .from('analytics_reporting')
                .select('metric_name, metric_value, recorded_at');

            if (apiError) throw apiError;

            let growth = 0;
            let volume = 0;
            let act = 0;
            const timeline = {};

            reportData.forEach(row => {
                const val = parseFloat(row.metric_value);
                
                // Agregados totales
                if (row.metric_name === 'community_growth') growth += val;
                if (row.metric_name === 'exchange_volume') volume += val;
                if (row.metric_name === 'user_activity') act += val;

                // Procesamiento para el gráfico por fecha
                const date = new Date(row.recorded_at).toLocaleDateString();
                if (!timeline[date]) {
                    timeline[date] = { date, activity: 0, volume: 0, growth: 0 };
                }
                
                if (row.metric_name === 'user_activity') timeline[date].activity += val;
                if (row.metric_name === 'exchange_volume') timeline[date].volume += val;
                if (row.metric_name === 'community_growth') timeline[date].growth += val;
            });

            setMetrics({ communityGrowth: growth, exchangeVolume: volume, activity: act });
            
            // Ordenar y limitar a los últimos 7 días
            const formattedData = Object.values(timeline)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(-7);
                
            setChartData(formattedData);

        } catch (err) {
            console.error("Error fetching analytics:", err);
            setError(t('common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    // --- Suscripción en Tiempo Real ---
    useEffect(() => {
        fetchMetrics();

        const channel = supabase.channel('dashboard-analytics')
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'analytics_reporting' }, 
                () => fetchMetrics()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchMetrics]);

    // --- Renderizado de Estados de Carga/Error ---
    if (loading) {
        return (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-emerald-500 w-8 h-8"/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-500 bg-red-50 rounded border border-red-200">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900 text-white border-slate-800">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-500">
                            <Users className="w-6 h-6"/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">{t('admin.quick_stats.total_users')}</p>
                            <p className="text-2xl font-bold">{metrics.communityGrowth}</p>
                            <p className="text-xs text-slate-500">{t('admin.analytics.total')} {t('navigation.referral')}</p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-slate-900 text-white border-slate-800">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-500">
                            <TrendingUp className="w-6 h-6"/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">{t('admin.quick_stats.impact_generated')}</p>
                            <p className="text-2xl font-bold">{metrics.exchangeVolume.toLocaleString()} </p>
                            <p className="text-xs text-slate-500">Credits Redeemed</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white border-slate-800">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-full text-purple-500">
                            <Activity className="w-6 h-6"/>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">{t('admin.quick_stats.recent_activity')}</p>
                            <p className="text-2xl font-bold">{metrics.activity}</p>
                            <p className="text-xs text-slate-500">Gamification Events</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Growth & Activity</CardTitle>
                        <CardDescription>User actions over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line 
                                    type="monotone" 
                                    dataKey="activity" 
                                    name={t('common.active')} 
                                    stroke="#10b981" 
                                    strokeWidth={2} 
                                    dot={{r: 4}} 
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="growth" 
                                    name="New Referrals" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2} 
                                    dot={{r: 4}} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Exchange Volume</CardTitle>
                        <CardDescription>Credits spent over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar 
                                    dataKey="volume" 
                                    name="Credits Spent" 
                                    fill="#3b82f6" 
                                    radius={[4, 4, 0, 0]} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AnalyticsReporting;