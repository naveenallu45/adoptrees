'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';

interface Adoption {
  _id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userType: 'individual' | 'company';
  items: {
    treeId: string;
    treeName: string;
    treeImageUrl?: string;
    quantity: number;
    price: number;
    oxygenKgs: number;
    adoptionType: 'self' | 'gift';
    recipientName?: string;
    recipientEmail?: string;
    giftMessage?: string;
  }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'planted' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  isGift: boolean;
  giftRecipientName?: string;
  giftRecipientEmail?: string;
  giftMessage?: string;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
}

interface AdoptionFilters {
  search: string;
  status: string;
  userType: string;
  startDate: Date | null;
  endDate: Date | null;
}


const columnHelper = createColumnHelper<Adoption>();

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  planted: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons = {
  pending: ClockIcon,
  confirmed: CheckCircleIcon,
  planted: CheckCircleIcon,
  completed: CheckCircleIcon,
  cancelled: XCircleIcon,
};

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function AdminAdoptionsPage() {
  const [filters, setFilters] = useState<AdoptionFilters>({
    search: '',
    status: '',
    userType: '',
    startDate: null,
    endDate: null,
  });
  const [searchInput, setSearchInput] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const queryClient = useQueryClient();

  // Fetch all adoptions data once
  const { data: allData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-adoptions-all'],
    queryFn: async () => {
      const response = await fetch('/api/admin/adoptions/all', {
        cache: 'no-store', // Always fetch fresh data from server
      });
      if (!response.ok) {
        throw new Error('Failed to fetch adoptions');
      }
      return response.json();
    },
    staleTime: 0, // No cache - always consider data stale
    gcTime: 0, // No cache - remove immediately when unused
    refetchInterval: false, // Disable automatic polling - only refetch on mutations
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: 'always', // Always refetch when component mounts
  });


  // Client-side filtering
  const filteredAdoptions = useMemo(() => {
    if (!allData?.data) return [];
    
    let filtered = [...(allData as { data: Adoption[] }).data];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((adoption: Adoption) => 
        adoption.orderId.toLowerCase().includes(searchLower) ||
        adoption.userEmail.toLowerCase().includes(searchLower) ||
        adoption.userName.toLowerCase().includes(searchLower) ||
        adoption.items.some((item) => item.treeName.toLowerCase().includes(searchLower))
      );
    }
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter((adoption: Adoption) => adoption.status === filters.status);
    }
    
    // User type filter
    if (filters.userType) {
      filtered = filtered.filter((adoption: Adoption) => adoption.userType === filters.userType);
    }
    
    // Date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((adoption: Adoption) => new Date(adoption.createdAt) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((adoption: Adoption) => new Date(adoption.createdAt) <= endDate);
    }
    
    // Sorting
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      filtered.sort((a, b) => {
        let aVal: unknown = a[id as keyof Adoption];
        let bVal: unknown = b[id as keyof Adoption];
        
        if (id === 'createdAt') {
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
        }
        
        // Handle undefined and null values
        if ((aVal === undefined || aVal === null) && (bVal === undefined || bVal === null)) return 0;
        if (aVal === undefined || aVal === null) return desc ? 1 : -1;
        if (bVal === undefined || bVal === null) return desc ? -1 : 1;
        
        if (aVal < bVal) return desc ? 1 : -1;
        if (aVal > bVal) return desc ? -1 : 1;
        return 0;
      });
    }
    
    return filtered;
  }, [allData, filters, sorting]);

  // Pagination for filtered results
  const paginatedAdoptions = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAdoptions.slice(start, end);
  }, [filteredAdoptions, pagination]);

  // Update metrics based on filtered data
  const metrics = useMemo(() => {
    if (!allData?.data) return { totalRevenue: 0, statusCounts: {}, userTypeCounts: {}, giftOrders: 0 };
    
    // Only count revenue from paid orders (exclude pending, failed, cancelled)
    const totalRevenue = filteredAdoptions
      .filter(adoption => adoption.paymentStatus === 'paid' && adoption.status !== 'pending')
      .reduce((sum, adoption) => sum + adoption.totalAmount, 0);
    
    const statusCounts = filteredAdoptions.reduce((acc, adoption) => {
      acc[adoption.status] = (acc[adoption.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userTypeCounts = filteredAdoptions.reduce((acc, adoption) => {
      acc[adoption.userType] = (acc[adoption.userType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const giftOrders = filteredAdoptions.filter(adoption => adoption.isGift).length;

    return {
      totalCount: filteredAdoptions.length,
      totalRevenue,
      statusCounts,
      userTypeCounts,
      giftOrders,
    };
  }, [filteredAdoptions, allData?.data]);

  const adoptions = paginatedAdoptions;
  const paginationInfo = {
    totalCount: filteredAdoptions.length,
    totalPages: Math.ceil(filteredAdoptions.length / pagination.pageSize),
  };

  // Delete handler - must be defined before columns useMemo
  const handleDelete = useCallback(async (id: string, orderId: string) => {
    const result = await Swal.fire({
      title: 'Delete Adoption?',
      text: `Are you sure you want to delete adoption ${orderId}? This action cannot be undone!`,
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

    // Optimistically remove adoption from UI IMMEDIATELY (before API call)
    const previousData = queryClient.getQueryData<{ data: Adoption[] }>(['admin-adoptions-all']);
    queryClient.setQueryData(['admin-adoptions-all'], (old: { data: Adoption[] } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.filter((adoption) => adoption._id !== id)
      };
    });

    try {
      const response = await fetch(`/api/admin/adoptions/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // If 404, adoption doesn't exist in DB - keep it removed from UI (already deleted)
        if (response.status === 404) {
          toast.success('Adoption was already deleted from database.');
          // Force immediate refetch to sync with server
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['admin-adoptions-all'] })
          ]);
          return;
        }
        
        // Rollback optimistic update on other errors
        if (previousData) {
          queryClient.setQueryData(['admin-adoptions-all'], previousData);
        }
        // Show specific error message based on status code
        if (response.status === 400) {
          toast.error(data.error || 'Invalid adoption ID. Please refresh the page and try again.');
        } else {
          toast.error(data.error || 'Failed to delete adoption. Please try again.');
        }
        return;
      }
      
      toast.success('Adoption deleted successfully!');
      // Immediately refetch to show instant updates
      await queryClient.refetchQueries({ queryKey: ['admin-adoptions-all'] });
    } catch (error) {
      // Rollback optimistic update on error
      if (previousData) {
        queryClient.setQueryData(['admin-adoptions-all'], previousData);
      }
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Failed to delete adoption: ${errorMessage}`);
    }
  }, [queryClient]);

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('orderId', {
        header: 'Order ID',
        cell: (_info) => {
          const orderId = _info.getValue();
          // Format order ID for better readability
          // New format: ABC12345 (3 letters + 5 numbers)
          // Old format: ORD-... or other formats
          const isNewUserFormat = /^[A-Z]{3}\d{5}$/.test(orderId);
          const isOldOrdFormat = orderId.startsWith('ORD-');
          
          let formattedId = orderId;
          let showFullId = false;
          
          if (isNewUserFormat) {
            // New format is already readable: ABC12345
            formattedId = orderId;
          } else if (isOldOrdFormat) {
            // Old ORD format - truncate if too long
            formattedId = orderId.length > 15 
              ? `${orderId.slice(0, 8)}...${orderId.slice(-4)}`
              : orderId;
            showFullId = orderId.length > 15;
          } else {
            // Other formats - truncate if too long
            formattedId = orderId.length > 12 
              ? `${orderId.slice(0, 8)}...${orderId.slice(-4)}`
              : orderId;
            showFullId = orderId.length > 12;
          }
          
          return (
            <div 
              className="flex flex-col cursor-pointer group"
              title={`Full Order ID: ${orderId}`}
            >
              <span className="font-mono text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {formattedId}
              </span>
              {showFullId && (
                <span className="text-xs text-gray-500 font-mono">
                  {orderId}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('userName', {
        header: 'Customer',
        cell: (_info) => (
          <div>
            <div className="font-medium text-gray-900">{_info.getValue()}</div>
            <div className="text-sm text-gray-500">{_info.row.original.userEmail}</div>
          </div>
        ),
      }),
      columnHelper.accessor('userType', {
        header: 'Type',
        cell: (_info) => (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            _info.getValue() === 'company' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {_info.getValue() === 'company' ? 'Company' : 'Individual'}
          </span>
        ),
      }),
      columnHelper.accessor('items', {
        header: 'Trees',
        cell: (_info) => {
          const items = _info.getValue();
          return (
            <div className="space-y-1">
              {items.map((item, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{item.treeName}</span>
                  <span className="text-gray-500 ml-1">(x{item.quantity})</span>
                </div>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor('totalAmount', {
        header: 'Amount',
        cell: (_info) => (
          <span className="font-medium text-gray-900">
            ₹{_info.getValue().toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (_info) => {
          const status = _info.getValue();
          const Icon = statusIcons[status];
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
              <Icon className="w-3 h-3 mr-1" />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          );
        },
      }),
      columnHelper.accessor('paymentStatus', {
        header: 'Payment',
        cell: (_info) => {
          const status = _info.getValue();
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          );
        },
      }),
      columnHelper.accessor('isGift', {
        header: 'Gift',
        cell: (_info) => (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            _info.getValue() 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {_info.getValue() ? 'Yes' : 'No'}
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: 'Date',
        cell: (_info) => (
          <div className="text-sm text-gray-900">
            {format(parseISO(_info.getValue()), 'MMM dd, yyyy')}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const adoption = info.row.original;
          return (
            <div className="flex items-center">
              <button
                onClick={() => handleDelete(adoption._id, adoption.orderId)}
                className="text-red-600 hover:text-red-700 transition-colors"
                title="Delete Adoption"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          );
        },
      }),
    ],
    [handleDelete]
  ) as ColumnDef<Adoption>[];

  const table = useReactTable({
    data: adoptions,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: paginationInfo.totalPages || -1,
  });

  const handleFilterChange = (key: keyof AdoptionFilters, value: string | Date | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  // Debounced search
  const debouncedSearch = useCallback(
    (value: string) => {
      const timeoutId = setTimeout(() => {
        handleFilterChange('search', value);
      }, 500); // 500ms delay
      return () => clearTimeout(timeoutId);
    },
    []
  );

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleExport = () => {
    // Implement CSV export functionality
  };


  // Only show full loading screen if we have no data at all
  if (isLoading && !allData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
          <div className="text-gray-500">Loading adoptions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading adoptions</h3>
        <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adoption Management</h1>
          <p className="text-gray-600">Manage and track all tree adoptions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 font-semibold">₹</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{metrics.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 font-semibold">#</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {paginationInfo.totalCount || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 font-semibold">G</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Gift Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {adoptions.filter((a: Adoption) => a.isGift).length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                <span className="text-orange-600 font-semibold">P</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(metrics.statusCounts as Record<string, number>).pending || 0}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 relative">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search orders, customers, emails..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <ToggleGroup
              type="single"
              value={filters.status || ''}
              onValueChange={(value) => handleFilterChange('status', value || '')}
              variant="outline"
              size="sm"
              className="[&_[data-state=on]]:!bg-black [&_[data-state=on]]:!text-white [&_[data-state=on]]:!border-black"
              defaultValue=""
            >
              <ToggleGroupItem value="" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="pending" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                Pending
              </ToggleGroupItem>
              <ToggleGroupItem value="confirmed" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                Confirmed
              </ToggleGroupItem>
              <ToggleGroupItem value="planted" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                Planted
              </ToggleGroupItem>
              <ToggleGroupItem value="completed" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                Completed
              </ToggleGroupItem>
              <ToggleGroupItem value="cancelled" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                Cancelled
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* User Type Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <ToggleGroup
              type="single"
              value={filters.userType || ''}
              onValueChange={(value) => handleFilterChange('userType', value || '')}
              variant="outline"
              size="sm"
              className="[&_[data-state=on]]:!bg-black [&_[data-state=on]]:!text-white [&_[data-state=on]]:!border-black"
              defaultValue=""
            >
              <ToggleGroupItem value="" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="individual" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                Individual
              </ToggleGroupItem>
              <ToggleGroupItem value="company" className="text-xs data-[state=on]:!bg-black data-[state=on]:!text-white">
                Company
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <div className="flex space-x-2">
              <DatePicker
                selected={filters.startDate}
                onChange={(date) => {
                  handleFilterChange('startDate', date);
                }}
                dateFormat="MMM dd, yyyy"
                className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholderText="From Date"
                maxDate={filters.endDate || new Date()}
                showYearDropdown
                showMonthDropdown
                isClearable
                selectsStart
                startDate={filters.startDate}
                endDate={filters.endDate}
              />
              <span className="text-gray-400 text-sm">to</span>
              <DatePicker
                selected={filters.endDate}
                onChange={(date) => {
                  handleFilterChange('endDate', date);
                }}
                dateFormat="MMM dd, yyyy"
                className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholderText="To Date"
                minDate={filters.startDate || undefined}
                maxDate={new Date()}
                showYearDropdown
                showMonthDropdown
                isClearable
                selectsEnd
                startDate={filters.startDate}
                endDate={filters.endDate}
              />
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.search || filters.status || filters.userType || filters.startDate || filters.endDate) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    status: '',
                    userType: '',
                    startDate: null,
                    endDate: null,
                  });
                  setSearchInput('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.search && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                  Search: {filters.search}
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                  Status: {filters.status}
                  <button
                    onClick={() => handleFilterChange('status', '')}
                    className="ml-1 text-yellow-600 hover:text-yellow-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.userType && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                  Type: {filters.userType}
                  <button
                    onClick={() => handleFilterChange('userType', '')}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.startDate && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                  From: {filters.startDate.toLocaleDateString()}
                  <button
                    onClick={() => handleFilterChange('startDate', null)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.endDate && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                  To: {filters.endDate.toLocaleDateString()}
                  <button
                    onClick={() => handleFilterChange('endDate', null)}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8 relative">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-100">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-5 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-4 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {pagination.pageIndex * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    paginationInfo.totalCount || 0
                  )}
                </span>{' '}
                of{' '}
                <span className="font-medium">{paginationInfo.totalCount || 0}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
