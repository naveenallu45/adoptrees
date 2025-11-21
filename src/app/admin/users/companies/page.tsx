'use client';

import React, { useMemo, useCallback } from 'react';
import { TrashIcon, EnvelopeIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/Admin/DataTable';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useCompanyUsers } from '@/hooks/useAdminData';
import { useQueryClient } from '@tanstack/react-query';

interface CompanyUser {
  _id: string;
  companyName: string;
  email: string;
  phone?: string;
  gstNumber?: string;
  createdAt: string;
  role: string;
  userType: string;
}

export default function CompanyUsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading: loading } = useCompanyUsers();
  

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Company?',
      text: "Are you sure you want to delete this company? This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: '#fff',
      customClass: {
        popup: 'rounded-lg',
        confirmButton: 'rounded-lg px-4 py-2',
        cancelButton: 'rounded-lg px-4 py-2',
      }
    });

    if (!result.isConfirmed) return;

    // Optimistically remove company from UI IMMEDIATELY (before API call)
    const previousUsers = queryClient.getQueryData<CompanyUser[]>(['admin', 'users', 'companies']);
    const previousStats = queryClient.getQueryData<{ totalTrees: number; totalIndividuals: number; totalCompanies: number; totalWellWishers: number; totalRevenue: number }>(['admin', 'stats']);
    
    queryClient.setQueryData(['admin', 'users', 'companies'], (old: CompanyUser[] | undefined) => {
      if (!old) return old;
      return old.filter((user) => user._id !== id);
    });

    // Update stats optimistically
    queryClient.setQueryData(['admin', 'stats'], (old: { totalTrees: number; totalIndividuals: number; totalCompanies: number; totalWellWishers: number; totalRevenue: number } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        totalCompanies: Math.max(0, (old.totalCompanies || 0) - 1)
      };
    });

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // If 404, company doesn't exist in DB - keep it removed from UI (already deleted)
        if (response.status === 404) {
          toast.success('Company was already deleted from database.');
          // Force immediate refetch to sync with server
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['admin', 'users', 'companies'] }),
            queryClient.refetchQueries({ queryKey: ['admin', 'stats'] })
          ]);
          return;
        }
        
        // Rollback optimistic update on other errors
        if (previousUsers) {
          queryClient.setQueryData(['admin', 'users', 'companies'], previousUsers);
        }
        if (previousStats) {
          queryClient.setQueryData(['admin', 'stats'], previousStats);
        }
        // Show specific error message based on status code
        if (response.status === 400) {
          toast.error(data.error || 'Invalid company ID. Please refresh the page and try again.');
        } else {
          toast.error(data.error || 'Failed to delete company. Please try again.');
        }
        return;
      }
      
      toast.success('Company deleted successfully!');
      // Force immediate refetch to sync with server (replaces optimistic update)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin', 'users', 'companies'] }),
        queryClient.refetchQueries({ queryKey: ['admin', 'stats'] })
      ]);
    } catch (error) {
      // Rollback optimistic update on error
      if (previousUsers) {
        queryClient.setQueryData(['admin', 'users', 'companies'], previousUsers);
      }
      if (previousStats) {
        queryClient.setQueryData(['admin', 'stats'], previousStats);
      }
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Failed to delete company: ${errorMessage}`);
    }
  }, [queryClient]);

  // Define columns for the table
  const columns = useMemo<ColumnDef<CompanyUser>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: 'Company Name',
        cell: ({ row }) => (
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <BuildingOfficeIcon className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">{row.original.companyName}</div>
              <div className="text-xs text-gray-500">Company Account</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-gray-900">
            <EnvelopeIcon className="mr-2 h-4 w-4 text-gray-400" />
            {row.original.email}
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.phone || 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'gstNumber',
        header: 'GST Number',
        cell: ({ row }) => (
          <span className="text-sm font-mono text-gray-900">
            {row.original.gstNumber || 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined Date',
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {new Date(row.original.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: () => (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            Active
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => handleDelete(row.original._id)}
            className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
            title="Delete Company"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ),
        enableSorting: false,
      },
    ],
    [handleDelete]
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {loading && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-green-200 z-50">
          <div className="h-full bg-green-600 animate-pulse" style={{ width: '70%' }}></div>
        </div>
      )}
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Company Users</h1>
          <p className="mt-2 text-gray-600">
            Manage all company/organization accounts
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">Total Companies</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">Active Companies</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{users.length}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">New This Month</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {users.filter((u: CompanyUser) => 
                new Date(u.createdAt).getMonth() === new Date().getMonth()
              ).length}
            </p>
          </div>
        </div>

        {/* Data Table with Pagination */}
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search companies by name, email, or GST..."
          pageSize={10}
        />
      </div>
    </div>
  );
}
