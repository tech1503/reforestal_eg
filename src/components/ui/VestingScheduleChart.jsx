import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Calendar } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

const VestingScheduleChart = () => {
  const { t } = useI18n();

  const vestingData = [
    { period: '0-12m', label: 'Cliff', vested: 0, color: 'bg-gray-300' },
    { period: '12m', label: '25% Vested', vested: 25, color: 'bg-green-300' },
    { period: '13-48m', label: 'Linear Vesting', vested: 75, color: 'bg-green-500' },
    { period: '48m+', label: 'Fully Vested', vested: 100, color: 'bg-green-700' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-forest">{t('dashboard.vesting_schedule_title')}</h3>
          <p className="text-gray-600 text-sm">{t('dashboard.vesting_schedule_subtitle')}</p>
        </div>
        <Calendar className="w-5 h-5 text-gray-400" />
      </div>

      <div className="w-full h-48 flex items-end space-x-2 px-4">
        {vestingData.map((item, index) => (
          <div key={item.period} className="flex-1 flex flex-col items-center h-full justify-end">
            <motion.div
              className={`w-full rounded-t-lg ${item.color}`}
              initial={{ height: 0 }}
              animate={{ height: `${item.vested}%` }}
              transition={{ duration: 1, delay: 0.5 + index * 0.2, type: 'spring' }}
              whileHover={{ scaleY: 1.05, backgroundColor: '#4ade80' }}
            >
              <div className="relative h-full">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-forest">{item.vested}%</span>
              </div>
            </motion.div>
            <div className="text-center mt-2">
              <p className="text-xs font-medium text-gray-700">{item.period}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VestingScheduleChart;