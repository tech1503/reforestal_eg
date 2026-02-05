import React, { useEffect } from 'react';
import { reportWebVitals } from '@/utils/webVitals';

const PerformanceMonitor = () => {
  useEffect(() => {
    // Initialize Web Vitals Reporting
    reportWebVitals((metric) => {
      // Log to console in development
      if (import.meta.env.DEV) {
        console.log('[Web Vital]', metric);
      }
    });

    // Monitor Long Tasks (if supported)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
             if (entry.duration > 50) { // Long task > 50ms
                 if (import.meta.env.DEV) console.warn('Long Task detected:', entry);
             }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Observer not supported
      }
    }
  }, []);

  return null; // Renderless component
};

export default PerformanceMonitor;