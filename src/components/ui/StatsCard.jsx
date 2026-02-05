import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatsCard = ({ title, value, change, icon: Icon, color }) => {
  // Safely handle undefined/null change prop
  const safeChange = change || '';
  const hasChange = !!change;
  const isPositive = safeChange.startsWith && safeChange.startsWith('+');
  const isNegative = safeChange.startsWith && safeChange.startsWith('-');
  
  // Map colors explicitly to ensure Tailwind picks them up during build
  const colorVariants = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    // Fallback
    default: { bg: 'bg-gray-100', text: 'text-gray-600' }
  };

  const colorStyle = colorVariants[color] || colorVariants.default;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-green-100 card-hover"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          
          {/* Only render footer if change prop exists */}
          {hasChange && (
            <div className="flex items-center mt-2">
              {isPositive && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
              {isNegative && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
              
              <span className={`text-sm font-medium ${
                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
              }`}>
                {change}
              </span>
              
              {/* Only show "vs last month" if it's a numeric delta */}
              {(isPositive || isNegative) && (
                <span className="text-gray-500 text-sm ml-1">vs last month</span>
              )}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${colorStyle.bg} rounded-lg flex items-center justify-center`}>
          {Icon && <Icon className={`w-6 h-6 ${colorStyle.text}`} />}
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;