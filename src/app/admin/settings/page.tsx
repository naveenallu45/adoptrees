'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface SiteSettings {
  maintenanceMode: boolean;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: SiteSettings;
  }>({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch settings');
      }
      return result;
    },
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const maintenanceMode = data?.data?.maintenanceMode ?? false;

  const handleToggleMaintenance = async () => {
    if (isUpdating) return;

    const nextValue = !maintenanceMode;
    setIsUpdating(true);

    // Prevent an in-flight GET from overwriting this update
    await queryClient.cancelQueries({ queryKey: ['admin', 'settings'] });

    const previous = queryClient.getQueryData<{
      success: boolean;
      data: SiteSettings;
    }>(['admin', 'settings']);

    queryClient.setQueryData(['admin', 'settings'], {
      success: true,
      data: { maintenanceMode: nextValue },
    });

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: nextValue }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update settings');
      }

      queryClient.setQueryData(['admin', 'settings'], {
        success: true,
        data: {
          maintenanceMode: Boolean(result.data?.maintenanceMode),
        },
      });

      toast.success(
        nextValue
          ? 'Maintenance mode enabled. Public visitors will see the maintenance page.'
          : 'Maintenance mode disabled. The site is live again.'
      );
    } catch (err) {
      if (previous) {
        queryClient.setQueryData(['admin', 'settings'], previous);
      } else {
        queryClient.setQueryData(['admin', 'settings'], {
          success: true,
          data: { maintenanceMode: !nextValue },
        });
      }
      toast.error(
        err instanceof Error ? err.message : 'Failed to update settings'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage site-wide options for Adoptrees.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
            <WrenchScrewdriverIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              Maintenance Mode
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              When enabled, visitors see a maintenance message instead of the
              public site. The admin panel stays available so you can turn this
              off anytime.
            </p>

            {isError ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p>
                  {error instanceof Error
                    ? error.message
                    : 'Failed to load settings'}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 font-medium underline"
                >
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div className="mt-6 h-10 w-40 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenanceMode}
                  disabled={isUpdating}
                  onClick={handleToggleMaintenance}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    maintenanceMode ? 'bg-amber-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                      maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-medium ${
                    maintenanceMode ? 'text-amber-700' : 'text-gray-700'
                  }`}
                >
                  {isUpdating
                    ? 'Saving…'
                    : maintenanceMode
                      ? 'Enabled'
                      : 'Disabled'}
                </span>
              </div>
            )}

            {maintenanceMode && !isLoading && !isError && (
              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    The public website is showing the maintenance page. You can
                    keep using this admin panel normally.
                  </p>
                </div>
                <Link
                  href="/maintenance"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Preview maintenance page
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
