import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const ImpactChart = () => {
  const { t } = useTranslation(); // HOOK

  // Nota: Los datos siguen "duros" (mock), pero las etiquetas visuales se traducen.
  const data = [
    { month: 'Jan', trees: 120, credits: 450 },
    { month: 'Feb', trees: 180, credits: 620 },
    { month: 'Mar', trees: 240, credits: 890 },
    { month: 'Apr', trees: 200, credits: 750 },
    { month: 'May', trees: 280, credits: 1100 },
    { month: 'Jun', trees: 320, credits: 1234 }
  ];

  const maxTrees = Math.max(...data.map(d => d.trees));
  const maxCredits = Math.max(...data.map(d => d.credits));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-forest">
            {t('dashboard.impact_chart.title', 'Environmental Impact')}
          </h3>
          <p className="text-gray-600 text-sm">
            {t('dashboard.impact_chart.subtitle', 'Trees planted and credits earned over time')}
          </p>
        </div>
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-5 h-5 mr-1" />
          <span className="text-sm font-medium">+24% {t('dashboard.impact_chart.growth', 'growth')}</span>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item, index) => (
          <motion.div
            key={item.month}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex items-center space-x-4"
          >
            <div className="w-8 text-sm text-gray-600 font-medium">{item.month}</div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('dashboard.impact_chart.trees', 'Trees')}</span>
                <span className="text-xs font-medium text-forest">{item.trees}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.trees / maxTrees) * 100}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="bg-green-500 h-2 rounded-full"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('dashboard.impact_credits')}</span>
                <span className="text-xs font-medium text-forest">{item.credits}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.credits / maxCredits) * 100}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="bg-blue-500 h-2 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">{t('dashboard.impact_chart.trees_planted', 'Trees Planted')}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">{t('dashboard.impact_credits')}</span>
        </div>
      </div>
    </div>
  );
};

export default ImpactChart;