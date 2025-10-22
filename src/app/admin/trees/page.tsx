'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/Admin/DataTable';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  createdAt: string;
}

export default function TreesManagement() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    info: '',
    oxygenKgs: '',
    image: null as File | null
  });

  const fetchTrees = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/trees');
      const data = await response.json();
      if (data.success) {
        setTrees(data.data);
      } else {
        toast.error('Failed to fetch trees');
      }
    } catch (error) {
      console.error('Error fetching trees:', error);
      toast.error('Error loading trees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrees();
  }, [fetchTrees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('price', formData.price);
    formDataToSend.append('info', formData.info);
    formDataToSend.append('oxygenKgs', formData.oxygenKgs);
    
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
        fetchTrees();
        setShowForm(false);
        setEditingTree(null);
        setFormData({
          name: '',
          price: '',
          info: '',
          oxygenKgs: '',
          image: null
        });
      } else {
        toast.error(data.error || 'Failed to save tree');
      }
    } catch (error) {
      console.error('Error saving tree:', error);
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
        fetchTrees();
      } else {
        toast.error(data.error || 'Failed to delete tree');
      }
    } catch (error) {
      console.error('Error deleting tree:', error);
      toast.error('An error occurred while deleting the tree');
    }
  }, [fetchTrees]);

  const handleCancel = () => {
    setShowForm(false);
    setEditingTree(null);
    setFormData({
      name: '',
      price: '',
      info: '',
      oxygenKgs: '',
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
