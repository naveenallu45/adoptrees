'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface DemoRequest {
  _id: string;
  email: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  contacted: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons = {
  pending: ClockIcon,
  contacted: CheckCircleIcon,
  completed: CheckCircleIcon,
  cancelled: XCircleIcon,
};

export default function DemoRequestsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: DemoRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>({
    queryKey: ['demo-requests', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'all' 
        ? `/api/demo-requests?t=${Date.now()}`
        : `/api/demo-requests?status=${statusFilter}&t=${Date.now()}`;
      const response = await fetch(url, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch demo requests');
      return response.json();
    },
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // No cache time (formerly cacheTime)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when network reconnects
  });

  const handleStatusUpdate = async (id: string, newStatus: DemoRequest['status']) => {
    // Optimistic update - update UI immediately
    queryClient.setQueryData<{
      success: boolean;
      data: DemoRequest[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(['demo-requests', statusFilter], (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((request: DemoRequest) =>
          request._id === id ? { ...request, status: newStatus } : request
        ),
      };
    });

    try {
      const response = await fetch(`/api/demo-requests/${id}?t=${Date.now()}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      toast.success('Status updated successfully');
      // Invalidate and immediately refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['demo-requests'] });
      await queryClient.refetchQueries({ queryKey: ['demo-requests'], type: 'active' });
    } catch (error) {
      // Invalidate and revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['demo-requests'] });
      await queryClient.refetchQueries({ queryKey: ['demo-requests'], type: 'active' });
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleDelete = async (id: string, email: string) => {
    const result = await Swal.fire({
      title: 'Delete Demo Request?',
      text: `Are you sure you want to delete the request from ${email}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });

    if (result.isConfirmed) {
      // Optimistic UI: Remove request immediately
      const previousData = queryClient.getQueryData<{
        success: boolean;
        data: DemoRequest[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(['demo-requests', statusFilter]);

      queryClient.setQueryData<{
        success: boolean;
        data: DemoRequest[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(['demo-requests', statusFilter], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          data: oldData.data.filter((request: DemoRequest) => request._id !== id),
          pagination: {
            ...oldData.pagination,
            total: oldData.pagination.total - 1,
          },
        };
      });

      try {
        const response = await fetch(`/api/demo-requests/${id}?t=${Date.now()}`, {
          method: 'DELETE',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Rollback on error
          if (previousData) {
            queryClient.setQueryData(['demo-requests', statusFilter], previousData);
          }
          throw new Error(result.error || 'Failed to delete request');
        }

        toast.success('Demo request deleted successfully');
        // Refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['demo-requests'] });
        await queryClient.refetchQueries({ queryKey: ['demo-requests'], type: 'active' });
      } catch (error) {
        // Rollback on error
        if (previousData) {
          queryClient.setQueryData(['demo-requests', statusFilter], previousData);
        }
        toast.error(error instanceof Error ? error.message : 'Failed to delete request');
      }
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedRequest) return;

    // Optimistic UI: Update notes immediately
    const previousData = queryClient.getQueryData<{
      success: boolean;
      data: DemoRequest[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(['demo-requests', statusFilter]);

    queryClient.setQueryData<{
      success: boolean;
      data: DemoRequest[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(['demo-requests', statusFilter], (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        data: oldData.data.map((request: DemoRequest) =>
          request._id === selectedRequest._id ? { ...request, notes } : request
        ),
      };
    });

    // Update selected request optimistically
    setSelectedRequest({ ...selectedRequest, notes });

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/demo-requests/${selectedRequest._id}?t=${Date.now()}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ notes }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Rollback on error
        if (previousData) {
          queryClient.setQueryData(['demo-requests', statusFilter], previousData);
        }
        setSelectedRequest(selectedRequest);
        throw new Error(result.error || 'Failed to update notes');
      }

      toast.success('Notes updated successfully');
      setSelectedRequest(null);
      setNotes('');
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['demo-requests'] });
      await queryClient.refetchQueries({ queryKey: ['demo-requests'], type: 'active' });
    } catch (error) {
      // Rollback on error
      if (previousData) {
        queryClient.setQueryData(['demo-requests', statusFilter], previousData);
      }
      setSelectedRequest(selectedRequest);
      toast.error(error instanceof Error ? error.message : 'Failed to update notes');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredRequests = data?.data?.filter((request) =>
    request.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demo Requests</h1>
          <p className="text-gray-600 mt-1">Manage demo requests from companies</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {data?.data?.length || 0} requests
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {['all', 'pending', 'contacted', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load demo requests. Please try again.</p>
        </div>
      )}

      {/* Demo Requests List */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Demo Requests</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'No demo requests found.'
                  : `No ${statusFilter} demo requests found.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => {
                    const StatusIcon = statusIcons[request.status];
                    return (
                      <motion.tr
                        key={request._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{request.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[request.status]}`}
                          >
                            <StatusIcon className="h-4 w-4" />
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {request.notes ? (
                            <span className="truncate max-w-xs block">{request.notes}</span>
                          ) : (
                            <span className="text-gray-400">No notes</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={request.status}
                              onChange={(e) =>
                                handleStatusUpdate(request._id, e.target.value as DemoRequest['status'])
                              }
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setNotes(request.notes || '');
                              }}
                              className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                              title="Add/Edit Notes"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(request._id, request.email)}
                              className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Notes Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notes for {selectedRequest.email}
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this demo request..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNotes}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

