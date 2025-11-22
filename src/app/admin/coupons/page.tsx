'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/Admin/DataTable';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';

interface Coupon {
  _id: string;
  code: string;
  category: 'individual' | 'company';
  discountPercentage: number;
  usageLimitType: 'unlimited' | 'custom';
  totalUsageLimit?: number;
  perUserUsageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CouponsManagement() {
  const queryClient = useQueryClient();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    category: 'individual' as 'individual' | 'company',
    discountPercentage: '',
    usageLimitType: 'unlimited' as 'unlimited' | 'custom',
    totalUsageLimit: '',
    perUserUsageLimit: '',
    isActive: true
  });

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/coupons', {
        cache: 'no-store'
      });
      const result = await response.json();
      
      if (result.success) {
        setCoupons(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch coupons');
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: {
        code: string;
        category: 'individual' | 'company';
        discountPercentage: number;
        usageLimitType: 'unlimited' | 'custom';
        perUserUsageLimit: number;
        isActive: boolean;
        totalUsageLimit?: number;
      } = {
        code: formData.code,
        category: formData.category,
        discountPercentage: parseFloat(formData.discountPercentage),
        usageLimitType: formData.usageLimitType,
        perUserUsageLimit: parseInt(formData.perUserUsageLimit),
        isActive: formData.isActive
      };

      if (formData.usageLimitType === 'custom') {
        if (!formData.totalUsageLimit || parseInt(formData.totalUsageLimit) < 1) {
          toast.error('Total usage limit is required when usage limit type is custom');
          setSubmitting(false);
          return;
        }
        payload.totalUsageLimit = parseInt(formData.totalUsageLimit);
      }

      const url = editingCoupon ? `/api/admin/coupons/${editingCoupon._id}` : '/api/admin/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingCoupon ? 'Coupon updated successfully' : 'Coupon created successfully');
        handleCancel();
        fetchCoupons();
        queryClient.invalidateQueries({ queryKey: ['coupons'] });
      } else {
        toast.error(result.error || 'Failed to save coupon');
      }
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCoupon(null);
    setFormData({
      code: '',
      category: 'individual',
      discountPercentage: '',
      usageLimitType: 'unlimited',
      totalUsageLimit: '',
      perUserUsageLimit: '',
      isActive: true
    });
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      category: coupon.category,
      discountPercentage: coupon.discountPercentage.toString(),
      usageLimitType: coupon.usageLimitType,
      totalUsageLimit: coupon.totalUsageLimit?.toString() || '',
      perUserUsageLimit: coupon.perUserUsageLimit.toString(),
      isActive: coupon.isActive
    });
    setShowForm(true);
  };

  const handleDelete = useCallback(async (coupon: Coupon) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete coupon "${coupon.code}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/coupons/${coupon._id}`, {
          method: 'DELETE',
        });

        const deleteResult = await response.json();

        if (deleteResult.success) {
          toast.success('Coupon deleted successfully');
          fetchCoupons();
          queryClient.invalidateQueries({ queryKey: ['coupons'] });
        } else {
          toast.error(deleteResult.error || 'Failed to delete coupon');
        }
      } catch (error) {
        console.error('Error deleting coupon:', error);
        toast.error('Failed to delete coupon');
      }
    }
  }, [fetchCoupons, queryClient]);

  const columns = useMemo<ColumnDef<Coupon>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Coupon Code',
        cell: ({ row }) => (
          <div className="font-mono font-semibold text-green-700">{row.original.code}</div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.original.category === 'individual' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            {row.original.category === 'individual' ? 'Individual' : 'Company'}
          </span>
        ),
      },
      {
        accessorKey: 'discountPercentage',
        header: 'Discount',
        cell: ({ row }) => (
          <div className="font-semibold text-green-600">{row.original.discountPercentage}%</div>
        ),
      },
      {
        accessorKey: 'usageLimitType',
        header: 'Usage Limit',
        cell: ({ row }) => {
          const coupon = row.original;
          if (coupon.usageLimitType === 'unlimited') {
            return <span className="text-gray-600">Unlimited</span>;
          }
          return (
            <span className="text-gray-700">
              {coupon.usedCount} / {coupon.totalUsageLimit || 0}
            </span>
          );
        },
      },
      {
        accessorKey: 'perUserUsageLimit',
        header: 'Per User Limit',
        cell: ({ row }) => (
          <span className="text-gray-700">{row.original.perUserUsageLimit}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            row.original.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {row.original.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(row.original)}
              className="rounded-lg bg-blue-500 p-2 text-white hover:bg-blue-600 transition-colors"
              title="Edit coupon"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(row.original)}
              className="rounded-lg bg-red-500 p-2 text-white hover:bg-red-600 transition-colors"
              title="Delete coupon"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleDelete]
  );

  if (loading && coupons.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coupons Management</h1>
            <p className="mt-2 text-gray-600">
              Create and manage discount coupons for users
            </p>
          </div>
          <motion.button
            onClick={() => {
              handleCancel();
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PlusIcon className="h-5 w-5" />
            Add Coupon
          </motion.button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancel();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-green-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Coupon Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coupon Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SAVE20"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                      required
                      disabled={!!editingCoupon}
                    />
                    <p className="mt-1 text-xs text-gray-500">Uppercase letters and numbers only</p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as 'individual' | 'company' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                    </select>
                  </div>

                  {/* Discount Percentage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Percentage <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.discountPercentage}
                        onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                        placeholder="10"
                        min="1"
                        max="100"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                      <span className="absolute right-4 top-2 text-gray-500">%</span>
                    </div>
                  </div>

                  {/* Usage Limit Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Usage Limit <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="usageLimitType"
                          value="unlimited"
                          checked={formData.usageLimitType === 'unlimited'}
                          onChange={() => setFormData({ ...formData, usageLimitType: 'unlimited', totalUsageLimit: '' })}
                          className="mr-2"
                        />
                        <span>Unlimited</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="usageLimitType"
                          value="custom"
                          checked={formData.usageLimitType === 'custom'}
                          onChange={() => setFormData({ ...formData, usageLimitType: 'custom' })}
                          className="mr-2"
                        />
                        <span>Custom</span>
                      </label>
                      {formData.usageLimitType === 'custom' && (
                        <input
                          type="number"
                          value={formData.totalUsageLimit}
                          onChange={(e) => setFormData({ ...formData, totalUsageLimit: e.target.value })}
                          placeholder="Enter total usage limit"
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ml-6"
                          required={formData.usageLimitType === 'custom'}
                        />
                      )}
                    </div>
                  </div>

                  {/* Per User Usage Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Per User Usage Limit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.perUserUsageLimit}
                      onChange={(e) => setFormData({ ...formData, perUserUsageLimit: e.target.value })}
                      placeholder="1"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">How many times can a single user use this coupon?</p>
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting && (
                        <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {submitting 
                        ? (editingCoupon ? 'Updating...' : 'Creating...') 
                        : (editingCoupon ? 'Update Coupon' : 'Create Coupon')
                      }
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={submitting}
                      className="rounded-lg bg-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <DataTable
            columns={columns}
            data={coupons}
            searchPlaceholder="Search coupons by code, category..."
            pageSize={10}
          />
        </div>
      </div>
    </div>
  );
}

