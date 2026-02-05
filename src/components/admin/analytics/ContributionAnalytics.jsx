import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const ContributionAnalytics = ({ contributions }) => {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    if (!contributions.length) return { avg: 0, median: 0, min: 0, max: 0, count: 0 };
    
    const amounts = contributions.map(c => parseFloat(c.contribution_amount)).sort((a, b) => a - b);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const avg = sum / amounts.length;
    const min = amounts[0];
    const max = amounts[amounts.length - 1];
    
    const mid = Math.floor(amounts.length / 2);
    const median = amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;

    return { avg, median, min, max, count: amounts.length };
  }, [contributions]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Card>
                 <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Average {t('admin.startnext.amount')}</CardTitle></CardHeader>
                 <CardContent><div className="text-2xl font-bold">€{stats.avg.toFixed(2)}</div></CardContent>
             </Card>
             <Card>
                 <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Median {t('admin.startnext.amount')}</CardTitle></CardHeader>
                 <CardContent><div className="text-2xl font-bold">€{stats.median.toFixed(2)}</div></CardContent>
             </Card>
             <Card>
                 <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Min {t('admin.startnext.amount')}</CardTitle></CardHeader>
                 <CardContent><div className="text-2xl font-bold">€{stats.min.toFixed(2)}</div></CardContent>
             </Card>
             <Card>
                 <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Max {t('admin.startnext.amount')}</CardTitle></CardHeader>
                 <CardContent><div className="text-2xl font-bold">€{stats.max.toFixed(2)}</div></CardContent>
             </Card>
        </div>
    </div>
  );
};

export default ContributionAnalytics;