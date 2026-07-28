import { useMemo } from 'react';
import { useFinancial } from '@/contexts/FinancialContext';

export const useFinancialOverview = () => {
    const { 
        contributions, 
        landDollars, 
        impactCredits, 
        loading 
    } = useFinancial();

    // Normalizar: FinancialContext devuelve objetos únicos (maybeSingle),
    // pero este hook espera arrays. Normalizamos para .reduce().
    const contributionsList = contributions 
        ? (Array.isArray(contributions) ? contributions : [contributions]) 
        : [];
    const landDollarsList = landDollars 
        ? (Array.isArray(landDollars) ? landDollars : [landDollars]) 
        : [];
    const impactCreditsList = impactCredits 
        ? (Array.isArray(impactCredits) ? impactCredits : [impactCredits]) 
        : [];

    const stats = useMemo(() => {
        const totalContributions = contributionsList.reduce((sum, c) => 
            sum + parseFloat(c.contribution_amount || 0), 0);
        const totalLandDollars = landDollarsList.reduce((sum, ld) => 
            sum + parseFloat(ld.amount || 0), 0);
        const totalImpactCredits = impactCreditsList.reduce((sum, ic) => 
            sum + parseFloat(ic.amount || 0), 0);

        const monthlyData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
            });

            const monthTotal = contributionsList
                .filter(c => {
                    const cDate = new Date(c.contribution_date);
                    return cDate.getMonth() === d.getMonth() 
                        && cDate.getFullYear() === d.getFullYear();
                })
                .reduce((sum, c) => sum + parseFloat(c.contribution_amount || 0), 0);

            monthlyData.push({ month: monthLabel, amount: monthTotal });
        }

        return {
            totalContributions,
            totalLandDollars,
            totalImpactCredits,
            contributionCount: contributionsList.length,
            assetCount: landDollarsList.length,
            monthlyTrend: monthlyData
        };
    }, [contributions, landDollars, impactCredits]);

    return { stats, loading };
};
