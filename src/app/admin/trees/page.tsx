'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/Admin/DataTable';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useTrees } from '@/hooks/useAdminData';
import { useQueryClient } from '@tanstack/react-query';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  treeType?: string;
  packageQuantity?: number;
  packagePrice?: number;
  createdAt: string;
}

export default function TreesManagement() {
  const queryClient = useQueryClient();
  const { data: trees = [], isLoading: loading } = useTrees();
  const [showForm, setShowForm] = useState(false);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    info: '',
    oxygenKgs: '',
    treeType: 'individual',
    packageQuantity: '',
    packagePrice: '',
    image: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Validate package fields for company trees
    if (formData.treeType === 'company') {
      if (!formData.packageQuantity || formData.packageQuantity === '') {
        toast.error('Package quantity is required for company trees');
        setSubmitting(false);
        return;
      }
      if (!formData.packagePrice || formData.packagePrice === '') {
        toast.error('Package price is required for company trees');
        setSubmitting(false);
        return;
      }
      if (parseInt(formData.packageQuantity) < 1) {
        toast.error('Package quantity must be at least 1');
        setSubmitting(false);
        return;
      }
      if (parseFloat(formData.packagePrice) <= 0) {
        toast.error('Package price must be greater than 0');
        setSubmitting(false);
        return;
      }
    }
    
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    
    // For company trees, calculate single tree price from package
    if (formData.treeType === 'company') {
      const packageQuantity = parseInt(formData.packageQuantity);
      const packagePrice = parseFloat(formData.packagePrice);
      const singleTreePrice = Math.round(packagePrice / packageQuantity);
      formDataToSend.append('price', singleTreePrice.toString());
    } else {
      formDataToSend.append('price', formData.price);
    }
    
    formDataToSend.append('info', formData.info);
    formDataToSend.append('oxygenKgs', formData.oxygenKgs);
    formDataToSend.append('treeType', formData.treeType);
    formDataToSend.append('packageQuantity', formData.packageQuantity);
    formDataToSend.append('packagePrice', formData.packagePrice);
    
    if (formData.image) {
      formDataToSend.append('image', formData.image);
    }

    try {
      const url = editingTree 
        ? `/api/admin/trees/${editingTree._id}` 
        : '/api/admin/trees';
      
      const method = editingTree ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: formDataToSend,
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingTree ? 'Tree updated successfully!' : 'Tree added successfully!');
        queryClient.invalidateQueries({ queryKey: ['admin', 'trees'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        setShowForm(false);
        setEditingTree(null);
        setFormData({
          name: '',
          price: '',
          info: '',
          oxygenKgs: '',
          treeType: 'individual',
          packageQuantity: '',
          packagePrice: '',
          image: null
        });
      } else {
        toast.error(data.error || 'Failed to save tree');
      }
    } catch (_error) {
      toast.error('An error occurred while saving the tree');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tree: Tree) => {
    setEditingTree(tree);
    setFormData({
      name: tree.name,
      price: tree.price.toString(),
      info: tree.info,
      oxygenKgs: tree.oxygenKgs.toString(),
      treeType: (tree as Tree & { treeType?: string }).treeType || 'individual',
      packageQuantity: (tree as Tree & { packageQuantity?: number }).packageQuantity?.toString() || '',
      packagePrice: (tree as Tree & { packagePrice?: number }).packagePrice?.toString() || '',
      image: null
    });
    setShowForm(true);
  };

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Tree?',
      text: "Are you sure you want to delete this tree? This action cannot be undone!",
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

    try {
      const response = await fetch(`/api/admin/trees/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Tree deleted successfully!');
        queryClient.invalidateQueries({ queryKey: ['admin', 'trees'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      } else {
        toast.error(data.error || 'Failed to delete tree');
      }
    } catch (_error) {
      toast.error('An error occurred while deleting the tree');
    }
  }, [queryClient]);

  const handleCancel = () => {
    setShowForm(false);
    setEditingTree(null);
    setFormData({
      name: '',
      price: '',
      info: '',
      oxygenKgs: '',
      treeType: 'individual',
      packageQuantity: '',
      packagePrice: '',
      image: null
    });
  };

  // Define columns for the table
  const columns = useMemo<ColumnDef<Tree>[]>(
    () => [
      {
        accessorKey: 'imageUrl',
        header: 'Image',
        cell: ({ row }) => (
          <div className="relative h-12 w-12 overflow-hidden rounded-lg">
            <Image
              src={row.original.imageUrl}
              alt={row.original.name}
              fill
              className="object-cover"
            />
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">{row.original.name}</div>
            <div className="text-sm text-gray-500">{row.original.info.substring(0, 50)}...</div>
          </div>
        ),
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            ₹{row.original.price.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'treeType',
        header: 'Type',
        cell: ({ row }) => (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            (row.original as Tree & { treeType?: string }).treeType === 'company' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {(row.original as Tree & { treeType?: string }).treeType === 'company' ? 'Company' : 'Individual'}
          </span>
        ),
      },
      {
        accessorKey: 'oxygenKgs',
        header: 'Oxygen/Year',
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">{row.original.oxygenKgs} kg O₂</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Added On',
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(row.original)}
              className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(row.original._id)}
              className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [handleDelete]
  );

  if (loading && trees.length === 0) {
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trees Management</h1>
            <p className="mt-2 text-gray-600">Manage all trees in the system</p>
          </div>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-white shadow-lg hover:bg-green-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PlusIcon className="h-5 w-5" />
            Add New Tree
          </motion.button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editingTree ? 'Edit Tree' : 'Add New Tree'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tree Type Selection - First Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Tree Type</label>
                <select
                  required
                  disabled={submitting}
                  value={formData.treeType}
                  onChange={(e) => {
                    const newTreeType = e.target.value;
                    setFormData({ 
                      ...formData, 
                      treeType: newTreeType,
                      // Reset package fields when switching to individual
                      packageQuantity: newTreeType === 'individual' ? '' : formData.packageQuantity,
                      packagePrice: newTreeType === 'individual' ? '' : formData.packagePrice,
                      // Reset price field when switching to company (will be calculated from package)
                      price: newTreeType === 'company' ? '' : formData.price
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="individual">Individual Tree</option>
                  <option value="company">Company Package</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.treeType === 'individual' 
                    ? 'Single tree for individual adoption' 
                    : 'Package of multiple trees for corporate adoption'
                  }
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                {/* Only show single tree price for individual trees */}
                {formData.treeType === 'individual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                    <input
                      type="number"
                      required
                      disabled={submitting}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  disabled={submitting}
                  value={formData.info}
                  onChange={(e) => setFormData({ ...formData, info: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Oxygen Production (kg/year)</label>
                <input
                  type="number"
                  required
                  disabled={submitting}
                  value={formData.oxygenKgs}
                  onChange={(e) => setFormData({ ...formData, oxygenKgs: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              {/* Package fields - only show for company trees */}
              {formData.treeType === 'company' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Package Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Package Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        disabled={submitting}
                        value={formData.packageQuantity}
                        onChange={(e) => setFormData({ ...formData, packageQuantity: e.target.value })}
                        placeholder="Number of trees in package"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Package Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        disabled={submitting}
                        value={formData.packagePrice}
                        onChange={(e) => setFormData({ ...formData, packagePrice: e.target.value })}
                        placeholder="Total price for the package"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Package pricing will be calculated automatically (Package Price ÷ Package Quantity = Price per tree)
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={submitting}
                  onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex gap-4">
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
                    ? (editingTree ? 'Updating...' : 'Adding...') 
                    : (editingTree ? 'Update Tree' : 'Add Tree')
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
          </motion.div>
        )}

        {/* Data Table with Pagination */}
        <DataTable
          columns={columns}
          data={trees}
          searchPlaceholder="Search trees by name, price, or oxygen..."
          pageSize={10}
        />
      </div>
    </div>
  );
}
