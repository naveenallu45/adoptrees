'use client';

import { useEffect, useState } from 'react';
import { collectPerformanceMetrics, logMemoryUsage } from '@/lib/performance';

interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  cls?: number;
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Collect performance metrics
    collectPerformanceMetrics();
    
    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      logMemoryUsage();
    }, 30000); // Every 30 seconds

    // Listen for performance entries
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
          }
          if (entry.entryType === 'largest-contentful-paint') {
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
          }
          if (entry.entryType === 'layout-shift' && !(entry as { hadRecentInput?: boolean }).hadRecentInput) {
            setMetrics(prev => ({ 
              ...prev, 
              cls: (prev.cls || 0) + (entry as unknown as { value: number }).value 
            }));
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });

      return () => {
        observer.disconnect();
        clearInterval(memoryInterval);
      };
    }

    return () => {
      clearInterval(memoryInterval);
    };
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
      >
        📊 Performance
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80">
          <h3 className="font-semibold text-gray-900 mb-3">Performance Metrics</h3>
          
          <div className="space-y-2 text-sm">
            {metrics.fcp && (
              <div className="flex justify-between">
                <span className="text-gray-600">First Contentful Paint:</span>
                <span className="font-mono">{Math.round(metrics.fcp)}ms</span>
              </div>
            )}
            
            {metrics.lcp && (
              <div className="flex justify-between">
                <span className="text-gray-600">Largest Contentful Paint:</span>
                <span className="font-mono">{Math.round(metrics.lcp)}ms</span>
              </div>
            )}
            
            {metrics.cls !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cumulative Layout Shift:</span>
                <span className="font-mono">{metrics.cls.toFixed(3)}</span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                if ('memory' in performance) {
                  const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
                  setMetrics(prev => ({
                    ...prev,
                    memory: {
                      used: Math.round(memory.usedJSHeapSize / 1048576),
                      total: Math.round(memory.totalJSHeapSize / 1048576),
                      limit: Math.round(memory.jsHeapSizeLimit / 1048576)
                    }
                  }));
                }
              }}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Check Memory Usage
            </button>
            
            {metrics.memory && (
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span>{metrics.memory.used} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{metrics.memory.total} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Limit:</span>
                  <span>{metrics.memory.limit} MB</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
