import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Activity, AlertCircle, FileDigit, Coins } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import StatsCard from '@/components/ui/StatsCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

const AdminOverview = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalContributions: 0,
    totalLandDollars: 0,
    totalImpactCredits: 0,
  });
  const [contributionData, setContributionData] = useState([]);
  const [benefitDistribution, setBenefitDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'startnext_contributions' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'land_dollars' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Total Users
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      // 2. Total Contributions (€)
      const { data: contribs } = await supabase.from('startnext_contributions').select('contribution_amount, contribution_date');
      const totalMoney = contribs?.reduce((sum, item) => sum + (Number(item.contribution_amount) || 0), 0) || 0;

      // 3. Total Land Dollars (Active)
      const { data: landDollarsData } = await supabase.from('land_dollars').select('id').or('status.eq.active,status.eq.issued');
      const totalLandDollarsCount = landDollarsData?.length || 0;

      // 4. Total Impact Credits (Cumulative Earned)
      const { data: metrics } = await supabase.from('founding_pioneer_metrics').select('total_impact_credits_earned');
      const totalImpactCredits = metrics?.reduce((sum, item) => sum + (Number(item.total_impact_credits_earned) || 0), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalContributions: totalMoney,
        totalLandDollars: totalLandDollarsCount,
        totalImpactCredits,
      });

      // Charts
      if (contribs) {
        const monthlyData = contribs.reduce((acc, c) => {
          const month = new Date(c.contribution_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const existing = acc.find(item => item.month === month);
          if (existing) { existing.amount += Number(c.contribution_amount); } 
          else { acc.push({ month, amount: Number(c.contribution_amount) }); }
          return acc;
        }, []);
        setContributionData(monthlyData.slice(-6));
      }

      // Benefit Distribution
      const { data: benefits } = await supabase.from('user_benefits').select(`new_support_level_id, support_levels(slug)`).eq('status', 'active');
      if (benefits) {
        const distMap = benefits.reduce((acc, item) => {
          const rawSlug = item.support_levels?.slug || 'Unknown';
          const name = rawSlug.replace('explorer_', 'Explorer ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const existing = acc.find(d => d.name === name);
          if (existing) { existing.value += 1; } else { acc.push({ name, value: 1 }); }
          return acc;
        }, []);
        setBenefitDistribution(distMap);
      }

    } catch (err) {
      console.error("Error fetching overview stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
        title: t('admin.quick_stats.total_users'), 
        value: stats.totalUsers, 
        icon: Users, 
        color: 'blue' 
    },
    { 
        title: t('admin.quick_stats.total_revenue'), 
        value: `€${stats.totalContributions.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, 
        icon: TrendingUp, 
        color: 'green' 
    },
    { 
        title: `Total ${t('admin.financials.tabs.land_dollars')}`, 
        value: `${stats.totalLandDollars} Assets`, 
        icon: FileDigit, 
        color: 'amber' 
    },
    { 
        title: `Total ${t('dashboard.impact_credits')}`, 
        value: stats.totalImpactCredits.toLocaleString(), 
        icon: Coins, 
        color: 'purple' 
    },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (loading) {
    return <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" /> 
              {t('admin.financials.tabs.startnext')} Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#10b981" name="Contributions (€)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Benefit Level Distribution</h3>
          {benefitDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={benefitDistribution} cx="50%" cy="50%" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {benefitDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>{t('dashboard.rewards.no_benefits')}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminOverview;