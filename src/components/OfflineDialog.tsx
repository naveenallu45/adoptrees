'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function OfflineDialog() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Check initial online status
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      setWasOffline(!navigator.onLine);
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      // Keep showing dialog briefly after coming online to confirm connection
      setTimeout(() => {
        setWasOffline(false);
      }, 1500);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check periodically in case events don't fire
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.onLine !== !isOffline) {
        if (navigator.onLine) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, [isOffline]);

  return (
    <AnimatePresence>
      {(isOffline || wasOffline) && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offline-dialog-title"
            aria-describedby="offline-dialog-description"
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-gray-200/50 overflow-hidden pointer-events-auto">
              {/* Header - Professional Gradient */}
              <div className={`relative px-8 py-6 ${
                isOffline 
                  ? 'bg-gradient-to-br from-red-500 via-red-600 to-orange-600' 
                  : 'bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-2xl backdrop-blur-sm ${
                    isOffline 
                      ? 'bg-white/20' 
                      : 'bg-white/20'
                  }`}>
                    {isOffline ? (
                      <WifiIcon className="h-7 w-7 text-white" />
                    ) : (
                      <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <ArrowPathIcon className="h-7 w-7 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 
                      id="offline-dialog-title"
                      className="text-2xl font-bold text-white mb-1"
                    >
                      {isOffline ? 'Connection Lost' : 'Reconnecting...'}
                    </h2>
                    <p className="text-white/90 text-sm font-medium">
                      {isOffline 
                        ? 'No internet connection detected' 
                        : 'Restoring your connection'}
                    </p>
                  </div>
                </div>
                
                {/* Status Indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    isOffline ? 'bg-white/80 animate-pulse' : 'bg-white'
                  }`}></div>
                  <span className="text-white/90 text-xs font-medium uppercase tracking-wider">
                    {isOffline ? 'Offline' : 'Connecting'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <div 
                  id="offline-dialog-description"
                  className="space-y-6"
                >
                  {isOffline ? (
                    <>
                      {/* Warning Alert */}
                      <div className="flex items-start gap-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4">
                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900 mb-1">
                            Network Unavailable
                          </p>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            Your internet connection has been interrupted. Please check your network settings or try again in a moment.
                          </p>
                        </div>
                      </div>

                      {/* Feature List */}
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          Available Features (Offline Mode)
                        </p>
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-3 text-sm text-gray-700">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span>Browse previously loaded content</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-700">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span>View cached pages and data</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-gray-400">×</span>
                            </div>
                            <span>Submit forms or upload files</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-gray-400">×</span>
                            </div>
                            <span>Sync data with server</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-5"
                      >
                        <CheckCircleIcon className="h-10 w-10 text-green-600" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Connection Restored
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Your internet connection has been successfully restored. You can now continue using all features.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              {isOffline && (
                <div className="px-8 py-5 bg-gray-50/80 border-t border-gray-200/50 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.reload();
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-semibold shadow-sm hover:shadow-md"
                    type="button"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    <span>Retry Connection</span>
                  </button>
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Offline</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
