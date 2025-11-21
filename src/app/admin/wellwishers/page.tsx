'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HeartIcon, 
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { AdminDataTable } from '@/components/Admin/AdminDataTable';
import { useWellWishers, type WellWisher } from '@/hooks/useAdminData';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminWellWishersPage() {
  const queryClient = useQueryClient();
  const { data: wellWishersData, isLoading: loading } = useWellWishers();
  const wellWishers = (wellWishersData || []) as WellWisher[];
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingWellWisher, setEditingWellWisher] = useState<WellWisher | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingWellWisher, setDeletingWellWisher] = useState<WellWisher | null>(null);

  // Registration form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });


  const handleRegisterWellWisher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store previous state for rollback on error
    const previousWellWishers = queryClient.getQueryData<WellWisher[]>(['admin', 'wellwishers']);
    const previousStats = queryClient.getQueryData<{ totalTrees: number; totalIndividuals: number; totalCompanies: number; totalWellWishers: number; totalRevenue: number }>(['admin', 'stats']);

    // Optimistic update for CREATE operation
    const tempId = `temp-${Date.now()}`;
    const optimisticWellWisher: WellWisher = {
      _id: tempId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      createdAt: new Date().toISOString(),
      upcomingTasks: 0,
      ongoingTasks: 0,
      completedTasks: 0,
      updatingTasks: 0,
      hasPassword: true,
    };

    // Optimistically add wellwisher to cache
    queryClient.setQueryData(['admin', 'wellwishers'], (old: WellWisher[] | undefined) => {
      if (!old) return [optimisticWellWisher];
      return [...old, optimisticWellWisher];
    });

    // Optimistically update stats
    queryClient.setQueryData(['admin', 'stats'], (old: { totalTrees: number; totalIndividuals: number; totalCompanies: number; totalWellWishers: number; totalRevenue: number } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        totalWellWishers: (old.totalWellWishers || 0) + 1
      };
    });

    // Close form immediately for better UX
    setShowRegisterForm(false);
    const formDataCopy = { ...formData };
    setFormData({ name: '', email: '', phone: '', password: '' });
    
    try {
      const response = await fetch('/api/admin/wellwishers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataCopy),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Rollback optimistic update on error
        if (previousWellWishers) {
          queryClient.setQueryData(['admin', 'wellwishers'], previousWellWishers);
        }
        if (previousStats) {
          queryClient.setQueryData(['admin', 'stats'], previousStats);
        }
        // Reopen form on error
        setShowRegisterForm(true);
        setFormData(formDataCopy);
        toast.error(data.message || data.errors?.[0]?.message || 'Failed to register well-wisher');
        return;
      }

      toast.success('Well-wisher registered successfully!');
      
      // Force immediate refetch to get server data (replaces optimistic update)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin', 'wellwishers'] }),
        queryClient.refetchQueries({ queryKey: ['admin', 'stats'] })
      ]);
    } catch (error) {
      // Rollback optimistic update on error
      if (previousWellWishers) {
        queryClient.setQueryData(['admin', 'wellwishers'], previousWellWishers);
      }
      if (previousStats) {
        queryClient.setQueryData(['admin', 'stats'], previousStats);
      }
      // Reopen form on error
      setShowRegisterForm(true);
      setFormData(formDataCopy);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Error registering well-wisher: ${errorMessage}`);
    }
  };

  const handleEditWellWisher = async (wellWisher: WellWisher) => {
    try {
      // Ensure ID is a string
      const wellWisherId = String(wellWisher._id);
      // Fetch current well-wisher details including password info
      const response = await fetch(`/api/admin/wellwishers/${wellWisherId}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        if (response.status === 400) {
          toast.error(data.message || 'Invalid well-wisher ID. Please refresh the page.');
        } else if (response.status === 404) {
          toast.error(data.message || 'Well-wisher not found.');
        } else {
          toast.error(data.message || 'Failed to fetch well-wisher details');
        }
        return;
      }
      
      setEditingWellWisher(data.data);
      setEditFormData({
        name: data.data.name,
        email: data.data.email,
        phone: data.data.phone || '',
        password: '',
      });
      setShowEditForm(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Error fetching well-wisher details: ${errorMessage}`);
    }
  };

  const handleUpdateWellWisher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingWellWisher) return;
    
    // Store previous state for rollback on error
    const previousWellWishers = queryClient.getQueryData<WellWisher[]>(['admin', 'wellwishers']);
    const wellWisherId = String(editingWellWisher._id);

    // Optimistic update for UPDATE operation
    queryClient.setQueryData(['admin', 'wellwishers'], (old: WellWisher[] | undefined) => {
      if (!old) return old;
      return old.map(wellWisher => {
        if (wellWisher._id === wellWisherId) {
          return {
            ...wellWisher,
            name: editFormData.name,
            email: editFormData.email,
            phone: editFormData.phone || undefined,
            hasPassword: editFormData.password ? true : wellWisher.hasPassword,
          };
        }
        return wellWisher;
      });
    });

    // Close form immediately for better UX
    setShowEditForm(false);
    const editingWellWisherCopy = editingWellWisher;
    const editFormDataCopy = { ...editFormData };
    setEditingWellWisher(null);
    setEditFormData({ name: '', email: '', phone: '', password: '' });
    
    try {
      const response = await fetch(`/api/admin/wellwishers/${wellWisherId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormDataCopy),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Rollback optimistic update on error
        if (previousWellWishers) {
          queryClient.setQueryData(['admin', 'wellwishers'], previousWellWishers);
        }
        // Reopen form on error
        setShowEditForm(true);
        setEditingWellWisher(editingWellWisherCopy);
        setEditFormData(editFormDataCopy);
        
        if (response.status === 400) {
          toast.error(data.message || 'Invalid data. Please check all fields and try again.');
        } else if (response.status === 404) {
          toast.error(data.message || 'Well-wisher not found. Please refresh the page.');
        } else {
          toast.error(data.message || 'Failed to update well-wisher');
        }
        return;
      }
      
      toast.success('Well-wisher updated successfully!');
      
      // Force immediate refetch to get server data (replaces optimistic update)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin', 'wellwishers'] }),
        queryClient.refetchQueries({ queryKey: ['admin', 'stats'] })
      ]);
    } catch (error) {
      // Rollback optimistic update on error
      if (previousWellWishers) {
        queryClient.setQueryData(['admin', 'wellwishers'], previousWellWishers);
      }
      // Reopen form on error
      setShowEditForm(true);
      setEditingWellWisher(editingWellWisherCopy);
      setEditFormData(editFormDataCopy);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Error updating well-wisher: ${errorMessage}`);
    }
  };

  const handleDeleteWellWisher = (wellWisher: WellWisher) => {
    setDeletingWellWisher(wellWisher);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteWellWisher = async () => {
    if (!deletingWellWisher) return;
    
    // Ensure ID is a string
    const wellWisherId = String(deletingWellWisher._id);
    
    // Optimistically remove well-wisher from UI IMMEDIATELY (before API call)
    const previousWellWishers = queryClient.getQueryData<WellWisher[]>(['admin', 'wellwishers']);
    const previousStats = queryClient.getQueryData<{ totalTrees: number; totalIndividuals: number; totalCompanies: number; totalWellWishers: number; totalRevenue: number }>(['admin', 'stats']);
    
    queryClient.setQueryData(['admin', 'wellwishers'], (old: WellWisher[] | undefined) => {
      if (!old) return old;
      return old.filter((w) => w._id !== wellWisherId);
    });

    // Update stats optimistically
    queryClient.setQueryData(['admin', 'stats'], (old: { totalTrees: number; totalIndividuals: number; totalCompanies: number; totalWellWishers: number; totalRevenue: number } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        totalWellWishers: Math.max(0, (old.totalWellWishers || 0) - 1)
      };
    });

    // Close confirmation modal immediately for better UX
    setShowDeleteConfirm(false);
    setDeletingWellWisher(null);
    
    try {
      const response = await fetch(`/api/admin/wellwishers/${wellWisherId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // If 404, well-wisher doesn't exist in DB - keep it removed from UI (already deleted)
        if (response.status === 404) {
          toast.success('Well-wisher was already deleted from database.');
          // Force immediate refetch to sync with server
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['admin', 'wellwishers'] }),
            queryClient.refetchQueries({ queryKey: ['admin', 'stats'] })
          ]);
          return;
        }
        
        // Rollback optimistic update on other errors
        if (previousWellWishers) {
          queryClient.setQueryData(['admin', 'wellwishers'], previousWellWishers);
        }
        if (previousStats) {
          queryClient.setQueryData(['admin', 'stats'], previousStats);
        }
        // Show specific error message based on status code
        if (response.status === 400) {
          toast.error(data.message || 'Invalid well-wisher ID. Please refresh the page and try again.');
        } else {
          toast.error(data.message || 'Failed to delete well-wisher. Please try again.');
        }
        return;
      }
      
      toast.success('Well-wisher deleted successfully!');
      // Force immediate refetch to sync with server (replaces optimistic update)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin', 'wellwishers'] }),
        queryClient.refetchQueries({ queryKey: ['admin', 'stats'] })
      ]);
    } catch (error) {
      // Rollback optimistic update on error
      if (previousWellWishers) {
        queryClient.setQueryData(['admin', 'wellwishers'], previousWellWishers);
      }
      if (previousStats) {
        queryClient.setQueryData(['admin', 'stats'], previousStats);
      }
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Error deleting well-wisher: ${errorMessage}`);
    }
  };

  if (loading && wellWishers.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Well-Wishers Management</h1>
            <p className="mt-2 text-gray-600">
              Manage well-wishers and view their task status
            </p>
          </div>
          <motion.button
            onClick={() => setShowRegisterForm(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PlusIcon className="h-5 w-5" />
            Register Well-Wisher
          </motion.button>
        </div>

        {/* Well-Wishers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <AdminDataTable
            data={wellWishers}
            onEdit={handleEditWellWisher}
            onDelete={handleDeleteWellWisher}
            loading={loading}
          />
        </div>

        {wellWishers.length === 0 && !loading && (
          <div className="text-center py-12">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No well-wishers found</h3>
            <p className="text-gray-600 mb-4">Get started by registering the first well-wisher</p>
            <button
              onClick={() => setShowRegisterForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Register Well-Wisher
            </button>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Register Well-Wisher</h2>
            <form onSubmit={handleRegisterWellWisher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegisterForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditForm && editingWellWisher && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Well-Wisher</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingWellWisher(null);
                  setEditFormData({ name: '', email: '', phone: '', password: '' });
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpdateWellWisher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="Enter new password or leave blank"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to keep the current password unchanged
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Update Well-Wisher
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingWellWisher(null);
                    setEditFormData({ name: '', email: '', phone: '', password: '' });
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingWellWisher && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <TrashIcon className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Delete Well-Wisher</h2>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <strong>{deletingWellWisher.name}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                All associated data will be permanently removed.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={confirmDeleteWellWisher}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingWellWisher(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
