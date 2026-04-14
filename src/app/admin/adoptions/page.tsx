'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
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
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAdoptionMutations } from '../../../hooks/useAdminMutations';

interface Adoption {
  _id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userType: 'individual' | 'company' | 'dealer';
  items: {
    treeId: string;
    treeName: string;
    treeImageUrl?: string;
    quantity: number;
    price: number;
    oxygenKgs: number;
    treeType?: 'individual' | 'company' | 'forest';
    adoptionType: 'self' | 'gift';
    recipientName?: string;
    recipientEmail?: string;
    giftMessage?: string;
    forestName?: string;
    occasion?: string;
    // Dealer customer fields
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    vehicleName?: string;
    customerProfilePicture?: string;
  }[];
  totalAmount: number;
  couponCode?: string;
  couponDiscount?: number;
  finalAmount?: number;
  status: 'pending' | 'confirmed' | 'planted' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  isGift: boolean;
  giftRecipientName?: string;
  giftRecipientEmail?: string;
  giftMessage?: string;
  // Dealer/Showroom specific fields
  dealerName?: string;
  showroomName?: string;
  showroomLocation?: string;
  customerUserId?: string;
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
  const pathname = usePathname();
  const isForestPage = pathname?.includes('/admin/forest-adoptions');
  const isDealerPage = pathname?.includes('/admin/dealer-adoptions');
  const isCsrPage = pathname?.includes('/admin/csr-adoptions');

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
  const [downloadingCertificate, setDownloadingCertificate] = useState<string | null>(null);

  const { updateAdoption, deleteAdoption } = useAdoptionMutations();

  // Fetch all adoptions data once
  const { data: allData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-adoptions-all'],
    queryFn: async () => {
      // Add cache-busting timestamp to ensure fresh data
      const response = await fetch(`/api/admin/adoptions/all?t=${Date.now()}`, {
        cache: 'no-store', // Always fetch fresh data from server
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
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

    if (isForestPage) {
      filtered = filtered.filter((adoption: Adoption) =>
        adoption.items.some((item) => (item.treeType || (item.forestName ? 'forest' : 'individual')) === 'forest')
      );
    }
    
    if (isDealerPage) {
      // Dealer adoptions page: show only dealer adoptions
      filtered = filtered.filter((adoption: Adoption) => adoption.userType === 'dealer');
    } else if (isCsrPage) {
      // CSR adoptions page: show only company adoptions
      filtered = filtered.filter((adoption: Adoption) => adoption.userType === 'company');
    } else {
      // Regular adoptions page: show only individual adoptions (exclude company & dealer)
      filtered = filtered.filter((adoption: Adoption) => adoption.userType === 'individual');
    }
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter((adoption: Adoption) => adoption.status === filters.status);
    }
    
    // User type filter - Only apply on Forest Adoptions page (not needed on Individual/CSR/Dealer pages)
    if (isForestPage && filters.userType) {
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
  }, [allData, filters, sorting, isForestPage, isDealerPage, isCsrPage]);

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
    // Use finalAmount if available (after coupon discount), otherwise calculate from totalAmount - couponDiscount
    const totalRevenue = filteredAdoptions
      .filter(adoption => adoption.paymentStatus === 'paid' && adoption.status !== 'pending')
      .reduce((sum, adoption) => {
        if (adoption.finalAmount !== undefined && adoption.finalAmount !== null) {
          return sum + adoption.finalAmount;
        }
        // Calculate finalAmount from totalAmount - couponDiscount if coupon exists
        if (adoption.couponDiscount && adoption.couponDiscount > 0) {
          return sum + (adoption.totalAmount - adoption.couponDiscount);
        }
        return sum + adoption.totalAmount;
      }, 0);
    
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

  // Certificate download handler
  const handleDownloadCertificate = useCallback(async (orderId: string) => {
    setDownloadingCertificate(orderId);
    try {
      const response = await fetch(`/api/certificates/${orderId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        // Check if response is JSON (error) or PDF (unexpected)
        const contentType = response.headers.get('content-type') || '';
        let errorMessage = 'Failed to download certificate';
        
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('Failed to parse error response:', jsonError);
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        } else {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        
        toast.error(errorMessage);
        return;
      }

      // Verify we got a PDF
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        console.error('Unexpected content type:', contentType);
        toast.error('Server returned unexpected content type. Please try again.');
        return;
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Verify blob is not empty
      if (blob.size === 0) {
        toast.error('Certificate file is empty. Please try again.');
        return;
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to download certificate: ${errorMessage}`);
    } finally {
      setDownloadingCertificate(null);
    }
  }, []);

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

    // Mutation handles optimistic update automatically
    try {
      await deleteAdoption.mutateAsync(id);
    } catch (_error) {
      // Error handling is done in the mutation hook
    }
  }, [deleteAdoption]);

  // Define columns
  const columns = useMemo(() => {
    const cols = [
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
        header: isDealerPage ? 'Dealer' : 'Customer',
        cell: (_info) => {
          const adoption = _info.row.original;
          const isDealerOrder = adoption.userType === 'dealer';
          
          if (isDealerOrder && adoption.items.length > 0) {
            // For dealer orders, show dealer info and customer info
            const firstItem = adoption.items[0];
            const customerName = firstItem.customerName;
            const customerEmail = firstItem.customerEmail;
            const customerPhone = firstItem.customerPhone;
            const vehicleName = firstItem.vehicleName;
            const dealerName = adoption.dealerName || adoption.showroomName || adoption.userName;
            
            return (
              <div className="space-y-2">
                <div>
                  <div className="font-medium text-gray-900">{dealerName}</div>
                  <div className="text-sm text-gray-500">{adoption.userEmail}</div>
                  <div className="text-xs text-purple-600 font-medium mt-1">Dealer</div>
                </div>
                {customerName && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="font-medium text-gray-900">{customerName}</div>
                    {customerEmail && (
                      <div className="text-sm text-gray-500">{customerEmail}</div>
                    )}
                    {customerPhone && (
                      <div className="text-sm text-gray-500">📞 {customerPhone}</div>
                    )}
                    {vehicleName && (
                      <div className="text-xs text-blue-600 font-medium mt-1">🚗 {vehicleName}</div>
                    )}
                    <div className="text-xs text-green-600 font-medium mt-1">Customer</div>
                  </div>
                )}
              </div>
            );
          }
          
          return (
            <div>
              <div className="font-medium text-gray-900">{_info.getValue()}</div>
              <div className="text-sm text-gray-500">{adoption.userEmail}</div>
            </div>
          );
        },
      }),
      columnHelper.accessor('items', {
        header: 'Trees',
        cell: (_info) => {
          const items = _info.getValue();
          return (
            <div className="space-y-1">
              {items.map((item, index) => {
                const treeType = item.treeType || (item.forestName ? 'forest' : 'individual');
                const typeColors = {
                  company: 'bg-blue-100 text-blue-800',
                  forest: 'bg-emerald-100 text-emerald-800',
                  individual: 'bg-green-100 text-green-800',
                };
                const typeLabel = {
                  company: 'Company',
                  forest: 'Forest',
                  individual: 'Individual',
                };
                return (
                <div key={index} className="text-sm">
                    <div className="flex items-center gap-2">
                  <span className="font-medium">{item.treeName}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${typeColors[treeType as keyof typeof typeColors] || typeColors.individual}`}>
                        {typeLabel[treeType as keyof typeof typeLabel] || 'Individual'}
                      </span>
                </div>
                    <span className="text-gray-500">(x{item.quantity})</span>
                  </div>
                );
              })}
            </div>
          );
        },
      }),
      columnHelper.accessor('totalAmount', {
        header: 'Amount',
        cell: (_info) => {
          const adoption = _info.row.original;
          const hasCoupon = adoption.couponCode && adoption.couponDiscount;
          // Calculate finalAmount if missing but coupon exists
          const finalAmount = adoption.finalAmount ?? 
            (hasCoupon && adoption.couponDiscount ? adoption.totalAmount - adoption.couponDiscount : adoption.totalAmount);
          
          return (
            <div className="flex flex-col">
              {hasCoupon ? (
                <>
                  <span className="font-medium text-gray-900">
                    ₹{finalAmount.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 line-through">
                    ₹{adoption.totalAmount.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="font-medium text-gray-900">
                  ₹{adoption.totalAmount.toFixed(2)}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'coupon',
        header: 'Coupon',
        cell: (info) => {
          const adoption = info.row.original;
          if (adoption.couponCode && adoption.couponDiscount) {
            return (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-purple-700">
                  {adoption.couponCode}
                </span>
                <span className="text-xs text-gray-500">
                  -₹{adoption.couponDiscount.toFixed(2)}
                </span>
              </div>
            );
          }
          return <span className="text-xs text-gray-400">—</span>;
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (_info) => {
          const adoption = _info.row.original;
          const status = _info.getValue();
          const Icon = statusIcons[status];
          
          const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newStatus = e.target.value;
            try {
              await updateAdoption.mutateAsync({
                orderId: adoption.orderId,
                status: newStatus,
              });
            } catch (_error) {
              // Error handling is done in the mutation hook
            }
          };

          return (
            <div className="flex items-center gap-1">
              <Icon className="w-3 h-3" />
              <select
                value={status}
                onChange={handleStatusChange}
                disabled={updateAdoption.isPending}
                className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${statusColors[status]} ${
                  updateAdoption.isPending ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                }`}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="planted">Planted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
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
      columnHelper.accessor('createdAt', {
        header: 'Date',
        cell: (_info) => (
          <div className="text-sm text-gray-900">
            {format(parseISO(_info.getValue()), 'MMM dd, yyyy')}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'certificate',
        header: 'Certificate',
        cell: (info) => {
          const adoption = info.row.original;
          const canDownloadCertificate = adoption.paymentStatus === 'paid' && 
            (adoption.status === 'confirmed' || adoption.status === 'planted' || adoption.status === 'completed');
          const isDownloading = downloadingCertificate === adoption.orderId;
          
          if (!canDownloadCertificate) {
            return (
              <span className="text-xs text-gray-400">N/A</span>
            );
          }
          
          return (
            <button
              onClick={() => handleDownloadCertificate(adoption.orderId)}
              disabled={isDownloading}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download Certificate"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="h-3 w-3 mr-1" />
                  Download
                </>
              )}
            </button>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const adoption = info.row.original;
          return (
            <div className="flex items-center gap-2">
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
    ];
    
    // Add Type and Gift columns only if not on dealer page
    if (!isDealerPage) {
      // Insert Type column after userName
      const userNameIndex = cols.findIndex(col => {
        const accessorKey = (col as { accessorKey?: string }).accessorKey;
        return accessorKey === 'userName';
      });
      
      cols.splice(userNameIndex + 1, 0, columnHelper.accessor('userType', {
        header: 'Type',
        cell: (_info) => {
          const userType = _info.getValue();
          const typeColors = {
            company: 'bg-blue-100 text-blue-800',
            dealer: 'bg-purple-100 text-purple-800',
            individual: 'bg-green-100 text-green-800',
          };
          const typeLabels = {
            company: 'Company',
            dealer: 'Dealer',
            individual: 'Individual',
          };
          
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[userType] || typeColors.individual}`}>
              {typeLabels[userType] || 'Individual'}
            </span>
          );
        },
      }) as ColumnDef<Adoption>);
      
      // Insert Gift column after paymentStatus
      const paymentStatusIndex = cols.findIndex(col => {
        const accessorKey = (col as { accessorKey?: string }).accessorKey;
        return accessorKey === 'paymentStatus';
      });
      
      cols.splice(paymentStatusIndex + 1, 0, columnHelper.accessor('isGift', {
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
      }) as ColumnDef<Adoption>);
    }
    
    return cols as ColumnDef<Adoption>[];
  }, [handleDelete, handleDownloadCertificate, downloadingCertificate, updateAdoption, isDealerPage]);

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

  const pageTitle = isDealerPage 
    ? 'Dealer Adoption Management' 
    : isForestPage 
    ? 'Forest Adoption Management' 
    : isCsrPage
    ? 'CSR Adoption Management'
    : 'Individual Adoption Management';
  const pageSubtitle = isDealerPage 
    ? 'Manage and track all dealer adoptions for customers' 
    : isForestPage 
    ? 'Manage and track all forest adoptions' 
    : isCsrPage
    ? 'Manage and track all CSR/company adoptions'
    : 'Manage and track all individual tree adoptions';

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-gray-600">{pageSubtitle}</p>
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

          {/* User Type Toggle - Only show on Forest Adoptions page */}
          {isForestPage && (
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
          )}

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
        {(filters.search || filters.status || (isForestPage && filters.userType) || filters.startDate || filters.endDate) && (
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
              {isForestPage && filters.userType && (
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
