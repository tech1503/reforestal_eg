import React from 'react';
import { motion } from 'framer-motion';

const DonutChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;

  const gradientId = "donutGradient";

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-forest mb-4">{title}</h3>
      <div className="flex-grow flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 36 36" className="w-full h-full">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="transparent"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            {data.map((item, index) => {
              if (item.value === 0) return null;
              const percentage = (item.value / total) * 100;
              const offset = cumulative;
              cumulative += percentage;
              return (
                <motion.circle
                  key={index}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke={item.name.includes('Vested') ? `url(#${gradientId})` : item.color}
                  strokeWidth="3"
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 18 18)"
                  initial={{ strokeDasharray: `0 100` }}
                  animate={{ strokeDasharray: `${percentage} ${100 - percentage}` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.2 }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-forest">{total.toLocaleString()}</span>
            <span className="text-sm text-gray-500">Total Credits</span>
          </div>
        </div>
      </div>
      <div className="flex justify-center space-x-4 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center text-sm">
            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
            <span className="text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;