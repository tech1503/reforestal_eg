import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import DateRangeFilter from './DateRangeFilter';
import { subDays, format, isWithinInterval } from 'date-fns';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const FinancialReports = () => {
  const { t } = useTranslation(); // HOOK
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  
  // Data State
  const [contributions, setContributions] = useState([]);
  const [landDollars, setLandDollars] = useState([]);
  const [impactCredits, setImpactCredits] = useState([]);
  const [supportLevels, setSupportLevels] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contribs, ld, ic, tiers] = await Promise.all([
        supabase.from('startnext_contributions').select('*'),
        supabase.from('land_dollars').select('*'),
        supabase.from('impact_credits').select('*'),
        supabase.from('support_levels').select('id, slug, support_level_translations(name, language_code)')
      ]);

      setContributions(contribs.data || []);
      setLandDollars(ld.data || []);
      setImpactCredits(ic.data || []);
      setSupportLevels(tiers.data || []);
    } catch (e) {
      console.error("Error fetching analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- Data Processing ---
  
  const filteredData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return { c: contributions, l: landDollars, i: impactCredits };
    
    const filterFn = (dateStr) => {
        if(!dateStr) return false;
        return isWithinInterval(new Date(dateStr), { start: dateRange.from, end: dateRange.to });
    };

    return {
        c: contributions.filter(x => filterFn(x.contribution_date)),
        l: landDollars.filter(x => filterFn(x.issued_date || x.created_at)),
        i: impactCredits.filter(x => filterFn(x.issued_date || x.created_at))
    };
  }, [contributions, landDollars, impactCredits, dateRange]);

  // 1. Contributions by Tier (Bar Chart)
  const contributionsByTier = useMemo(() => {
    const map = {};
    filteredData.c.forEach(c => {
        let tierName = c.benefit_level || 'Unknown';
        // Try to map ID to name if available
        if (c.new_support_level_id) {
            const level = supportLevels.find(l => l.id === c.new_support_level_id);
            if (level) {
                const trans = level.support_level_translations?.find(t => t.language_code === 'en');
                tierName = trans?.name || level.slug;
            }
        }
        map[tierName] = (map[tierName] || 0) + parseFloat(c.contribution_amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData.c, supportLevels]);

  // 2. Revenue by Month (Line Chart)
  const revenueByMonth = useMemo(() => {
      const map = {};
      filteredData.c.forEach(c => {
          const month = format(new Date(c.contribution_date), 'MMM yyyy');
          map[month] = (map[month] || 0) + parseFloat(c.contribution_amount);
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData.c]);

  // 3. Impact Credits Distribution (Pie)
  const icDistribution = useMemo(() => {
      const map = {};
      filteredData.i.forEach(ic => {
          const source = ic.source || 'Other';
          map[source] = (map[source] || 0) + parseFloat(ic.amount);
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData.i]);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Date,Type,Amount,User\n"
        + filteredData.c.map(c => `${c.contribution_date},Contribution,${c.contribution_amount},${c.user_id}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400 w-8 h-8"/></div>;

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
           {/* admin.financials.title = "Financial Management" */}
           <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('admin.financials.title')} Reports</h2>
       </div>

       <DateRangeFilter range={dateRange} setRange={setDateRange} onExport={handleExport} />

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
               <CardHeader>
                   {/* admin.quick_stats.total_revenue = "Total Revenue" */}
                   <CardTitle>{t('admin.quick_stats.total_revenue')} by Tier</CardTitle>
                   <CardDescription>Revenue breakdown per support level</CardDescription>
               </CardHeader>
               <CardContent className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={contributionsByTier}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                           <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                           <Tooltip formatter={(value) => `€${value.toFixed(2)}`} cursor={{fill: 'transparent'}} />
                           <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                       </BarChart>
                   </ResponsiveContainer>
               </CardContent>
           </Card>

           <Card>
               <CardHeader>
                   <CardTitle>{t('admin.quick_stats.total_revenue')} Trend</CardTitle>
                   <CardDescription>Monthly contribution volume</CardDescription>
               </CardHeader>
               <CardContent className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={revenueByMonth}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                           <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                           <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                           <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{r: 4}} />
                       </LineChart>
                   </ResponsiveContainer>
               </CardContent>
           </Card>

           <Card>
               <CardHeader>
                   <CardTitle>{t('dashboard.impact_credits')} Source</CardTitle>
                   <CardDescription>Where credits are being generated from</CardDescription>
               </CardHeader>
               <CardContent className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                           <Pie
                               data={icDistribution}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                           >
                               {icDistribution.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                           </Pie>
                           <Tooltip formatter={(value) => `${value.toLocaleString()} IC`} />
                           <Legend />
                       </PieChart>
                   </ResponsiveContainer>
               </CardContent>
           </Card>

           <Card>
               <CardHeader>
                   <CardTitle>Metrics Summary</CardTitle>
                   <CardDescription>Key performance indicators for selected period</CardDescription>
               </CardHeader>
               <CardContent>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-50 rounded-lg">
                           <p className="text-sm text-slate-500">{t('admin.quick_stats.total_revenue')}</p>
                           <p className="text-2xl font-bold text-emerald-700">
                               €{filteredData.c.reduce((sum, item) => sum + parseFloat(item.contribution_amount), 0).toLocaleString()}
                           </p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-lg">
                           <p className="text-sm text-slate-500">Credits Issued</p>
                           <p className="text-2xl font-bold text-violet-700">
                               {filteredData.i.reduce((sum, item) => sum + parseFloat(item.amount), 0).toLocaleString()} IC
                           </p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-lg">
                           {/* admin.financials.tabs.land_dollars */}
                           <p className="text-sm text-slate-500">{t('admin.financials.tabs.land_dollars')} Issued</p>
                           <p className="text-2xl font-bold text-green-700">
                               {filteredData.l.length}
                           </p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-lg">
                           <p className="text-sm text-slate-500">Avg. Contribution</p>
                           <p className="text-2xl font-bold text-slate-700">
                               €{(filteredData.c.reduce((sum, item) => sum + parseFloat(item.contribution_amount), 0) / (filteredData.c.length || 1)).toFixed(2)}
                           </p>
                       </div>
                   </div>
               </CardContent>
           </Card>
       </div>
    </div>
  );
};

export default FinancialReports;