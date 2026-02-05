import { useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';

export const useFinancialOverview = () => {
    const { 
        contributions, 
        landDollars, 
        impactCredits, 
        loading 
    } = useFinancial();

    const stats = useMemo(() => {
        const totalContributions = contributions.reduce((sum, c) => sum + parseFloat(c.contribution_amount || 0), 0);
        const totalLandDollars = landDollars.reduce((sum, ld) => sum + parseFloat(ld.amount || 0), 0);
        const totalImpactCredits = impactCredits.reduce((sum, ic) => sum + parseFloat(ic.amount || 0), 0);
        
        // Calculate monthly contribution trend (last 6 months)
        const monthlyData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // Keep labels consistent for chart
            
            const monthTotal = contributions
                .filter(c => {
                    const cDate = new Date(c.contribution_date);
                    return cDate.getMonth() === d.getMonth() && cDate.getFullYear() === d.getFullYear();
                })
                .reduce((sum, c) => sum + parseFloat(c.contribution_amount || 0), 0);
                
            monthlyData.push({ month: monthLabel, amount: monthTotal });
        }

        return {
            totalContributions,
            totalLandDollars,
            totalImpactCredits,
            contributionCount: contributions.length,
            assetCount: landDollars.length,
            monthlyTrend: monthlyData
        };
    }, [contributions, landDollars, impactCredits]);

    const globalLoading = loading.contributions || loading.landDollars || loading.impactCredits;

    return { stats, loading: globalLoading };
};