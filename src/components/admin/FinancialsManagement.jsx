import React, { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BarChart3, CheckCircle, Coins, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // IMPORTADO

// Lazy load heavy components
const AnalyticsLandDollarsIC = lazy(() => import('@/components/admin/AnalyticsLandDollarsIC'));
const StartnextApprovals = lazy(() => import('@/components/admin/financials/StartnextApprovals'));
const LandDollarsTable = lazy(() => import('@/components/admin/financials/LandDollarsTable'));
const ImpactCreditsMLM = lazy(() => import('@/components/admin/financials/ImpactCreditsMLM'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
  </div>
);

const FinancialsManagement = () => {
  const { t } = useTranslation(); // HOOK

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('admin.financials.title')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Comprehensive control center for all platform currencies and transactions
        </p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg">
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('admin.financials.tabs.overview')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="approvals" 
            className="data-[state=active]:bg-violet-100 dark:data-[state=active]:bg-violet-900/30 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {t('admin.financials.tabs.startnext')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="land-dollars" 
            className="data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900/30 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-300"
          >
            <Coins className="w-4 h-4 mr-2" />
            {t('admin.financials.tabs.land_dollars')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="impact-credits" 
            className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300"
          >
            <Users className="w-4 h-4 mr-2" />
            {t('admin.financials.tabs.impact_credits')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="m-0 space-y-6">
          <Suspense fallback={<LoadingFallback />}>
            <AnalyticsLandDollarsIC />
          </Suspense>
        </TabsContent>

        <TabsContent value="approvals" className="m-0 space-y-6">
          <Suspense fallback={<LoadingFallback />}>
            <StartnextApprovals />
          </Suspense>
        </TabsContent>

        <TabsContent value="land-dollars" className="m-0 space-y-6">
          <Suspense fallback={<LoadingFallback />}>
            <LandDollarsTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="impact-credits" className="m-0 space-y-6">
          <Suspense fallback={<LoadingFallback />}>
            <ImpactCreditsMLM />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialsManagement;
