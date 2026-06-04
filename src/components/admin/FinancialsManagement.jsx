import React, { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BarChart3, CheckCircle, Coins, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next'; 

// Lazy load heavy components
const AnalyticsLandDollarsIC = lazy(() => import('@/components/admin/AnalyticsLandDollarsIC'));
const StartnextApprovals = lazy(() => import('@/components/admin/financials/StartnextApprovals'));
const LandDollarsTable = lazy(() => import('@/components/admin/financials/LandDollarsTable'));
const ImpactCreditsMLM = lazy(() => import('@/components/admin/financials/ImpactCreditsMLM'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-gold" />
  </div>
);

const FinancialsManagement = () => {
  const { t } = useTranslation(); 

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {t('admin.financials.title')}
        </h2>
        <p className="text-muted-foreground">
          Comprehensive control center for all platform currencies and transactions
        </p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-muted/50 border border-border p-1 rounded-xl gap-1 h-auto">
          <TabsTrigger 
            value="analytics" 
            className="py-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('admin.financials.tabs.overview')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="approvals" 
            className="py-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {t('admin.financials.tabs.startnext')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="land-dollars" 
            className="py-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all"
          >
            <Coins className="w-4 h-4 mr-2" />
            {t('admin.financials.tabs.land_dollars')}
          </TabsTrigger>
          
          <TabsTrigger 
            value="impact-credits" 
            className="py-2 rounded-lg data-[state=active]:bg-gradient-gold data-[state=active]:text-[#063127] data-[state=active]:shadow-glow data-[state=active]:font-bold text-muted-foreground hover:text-foreground transition-all"
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
