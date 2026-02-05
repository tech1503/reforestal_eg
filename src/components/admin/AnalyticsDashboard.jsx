import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FinancialReports from './analytics/FinancialReports';
import ExchangeAnalytics from './analytics/ExchangeAnalytics';
import AnalyticsLandDollarsIC from './AnalyticsLandDollarsIC';
import { BarChart3, ShoppingCart, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const AnalyticsDashboard = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
       <div>
            {/* admin.analytics.title = "Analytics & Reporting" */}
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('admin.analytics.title')}</h2>
            <p className="text-slate-500">In-depth insights into financial performance and user engagement.</p>
       </div>

       <Tabs defaultValue="financials" className="space-y-6">
           <TabsList>
               <TabsTrigger value="financials" className="px-4">
                   <BarChart3 className="w-4 h-4 mr-2"/> 
                   {/* admin.financials.title = "Financial Management" (usamos solo Financials del contexto si existe, o el título general) */}
                   {t('admin.financials.title')}
               </TabsTrigger>
               <TabsTrigger value="assets" className="px-4">
                   <Coins className="w-4 h-4 mr-2"/> 
                   {/* admin.financials.tabs.land_dollars & impact_credits */}
                   {t('admin.financials.tabs.land_dollars')} & {t('admin.financials.tabs.impact_credits')}
               </TabsTrigger>
               <TabsTrigger value="exchange" className="px-4">
                   <ShoppingCart className="w-4 h-4 mr-2"/> 
                   {/* navigation.exchange = "Exchange" */}
                   {t('navigation.exchange')} Activity
               </TabsTrigger>
           </TabsList>

           <TabsContent value="financials">
               <FinancialReports />
           </TabsContent>

           <TabsContent value="assets">
               <AnalyticsLandDollarsIC />
           </TabsContent>

           <TabsContent value="exchange">
               <ExchangeAnalytics />
           </TabsContent>
       </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;