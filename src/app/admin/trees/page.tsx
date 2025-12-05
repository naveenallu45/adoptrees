'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/Admin/DataTable';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useQuery } from '@tanstack/react-query';
import { fetchTrees, type Tree } from '@/hooks/useAdminData';
import { useTreeMutations } from '@/hooks/useAdminMutations';
import { VALID_LOCAL_USES } from '@/lib/validations/tree';

export default function TreesManagement() {
  // Use React Query for data fetching with instant cache updates
  const { data: trees = [], isLoading: loading, error, refetch } = useQuery<Tree[]>({
    queryKey: ['admin', 'trees'],
    queryFn: fetchTrees,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  const { createTree, updateTree, deleteTree } = useTreeMutations();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const submitting = createTree.isPending || updateTree.isPending;
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    info: '',
    oxygenKgs: '',
    treeType: 'individual',
    packageQuantity: '',
    packagePrice: '',
    scientificSpecies: '',
    speciesInfoAvailable: false,
    co2: '',
    foodSecurity: '',
    economicDevelopment: '',
    co2Absorption: '',
    environmentalProtection: '',
    localUses: [] as string[],
    image: null as File | null,
    smallImages: [null, null, null, null] as (File | null)[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate package fields for company and forest trees
    if (formData.treeType === 'company' || formData.treeType === 'forest') {
      if (!formData.packageQuantity || formData.packageQuantity === '') {
        toast.error(`Package quantity is required for ${formData.treeType === 'company' ? 'company' : 'forest'} trees`);
        return;
      }
      if (!formData.packagePrice || formData.packagePrice === '') {
        toast.error(`Package price is required for ${formData.treeType === 'company' ? 'company' : 'forest'} trees`);
        return;
      }
      if (parseInt(formData.packageQuantity) < 1) {
        toast.error('Package quantity must be at least 1');
        return;
      }
      if (parseFloat(formData.packagePrice) <= 0) {
        toast.error('Package price must be greater than 0');
        return;
      }
    }
    
    // Validate price only for individual trees
    if (formData.treeType === 'individual') {
      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue <= 0) {
        toast.error('Price must be a valid positive number');
        return;
      }
    }
    
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    // For company/forest trees, calculate price from packagePrice/packageQuantity
    // For individual trees, use the entered price directly
    let priceToSend = formData.price;
    if (formData.treeType === 'company' || formData.treeType === 'forest') {
      const packagePrice = parseFloat(formData.packagePrice);
      const packageQuantity = parseInt(formData.packageQuantity);
      if (!isNaN(packagePrice) && !isNaN(packageQuantity) && packageQuantity > 0) {
        // Calculate price per tree from package
        priceToSend = (packagePrice / packageQuantity).toFixed(2);
      }
    }
    formDataToSend.append('price', priceToSend);
    
    formDataToSend.append('info', formData.info);
    formDataToSend.append('oxygenKgs', formData.oxygenKgs);
    formDataToSend.append('treeType', formData.treeType);
    formDataToSend.append('packageQuantity', formData.packageQuantity);
    formDataToSend.append('packagePrice', formData.packagePrice);
    
    // Additional fields - always send to ensure they're saved/cleared
    formDataToSend.append('scientificSpecies', formData.scientificSpecies || '');
    formDataToSend.append('speciesInfoAvailable', formData.speciesInfoAvailable.toString());
    formDataToSend.append('co2', formData.co2 || '');
    formDataToSend.append('foodSecurity', formData.foodSecurity || '');
    formDataToSend.append('economicDevelopment', formData.economicDevelopment || '');
    formDataToSend.append('co2Absorption', formData.co2Absorption || '');
    formDataToSend.append('environmentalProtection', formData.environmentalProtection || '');
    
    // Append local uses as array
    formData.localUses.forEach((use) => {
      formDataToSend.append('localUses[]', use);
    });
    
    if (formData.image) {
      formDataToSend.append('image', formData.image);
    }
    
    // Append small images
    formData.smallImages.forEach((smallImage, index) => {
      if (smallImage) {
        formDataToSend.append(`smallImage${index}`, smallImage);
      }
    });

    // Close form immediately for instant UX (before server response)
    setShowForm(false);
    const editingTreeCopy = editingTree;
    const formDataCopy = { ...formData };
    setEditingTree(null);
    setFormData({
      name: '',
      price: '',
      info: '',
      oxygenKgs: '',
      treeType: 'individual',
      packageQuantity: '',
      packagePrice: '',
      scientificSpecies: '',
      speciesInfoAvailable: false,
      co2: '',
      foodSecurity: '',
      economicDevelopment: '',
      co2Absorption: '',
      environmentalProtection: '',
      localUses: [],
      image: null,
      smallImages: [null, null, null, null]
    });

    // Use React Query mutations - fire and forget for instant UI
    // Errors are handled in mutation callbacks
    if (editingTreeCopy) {
      updateTree.mutate(
        { id: editingTreeCopy._id, formData: formDataToSend },
        {
          onError: () => {
            // Reopen form on error
            setShowForm(true);
            setEditingTree(editingTreeCopy);
            setFormData(formDataCopy);
          }
        }
      );
    } else {
      createTree.mutate(formDataToSend, {
        onError: () => {
          // Reopen form on error
          setShowForm(true);
          setFormData(formDataCopy);
        }
      });
    }
  };

  const handleEdit = (tree: Tree) => {
    setEditingTree(tree);
    // Use price exactly as stored - no manipulation at all
    setFormData({
      name: tree.name,
      price: String(tree.price),
      info: tree.info,
      oxygenKgs: tree.oxygenKgs.toString(),
      treeType: (tree as Tree & { treeType?: string }).treeType || 'individual',
      packageQuantity: (tree as Tree & { packageQuantity?: number }).packageQuantity?.toString() || '',
      packagePrice: (tree as Tree & { packagePrice?: number }).packagePrice?.toString() || '',
      scientificSpecies: tree.scientificSpecies || '',
      speciesInfoAvailable: tree.speciesInfoAvailable || false,
      co2: tree.co2?.toString() || '',
      foodSecurity: tree.foodSecurity?.toString() || '',
      economicDevelopment: tree.economicDevelopment?.toString() || '',
      co2Absorption: tree.co2Absorption?.toString() || '',
      environmentalProtection: tree.environmentalProtection?.toString() || '',
      localUses: tree.localUses || [],
      image: null,
      smallImages: [null, null, null, null] // Small images will be loaded from existing tree data if editing
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

    if (result.isConfirmed) {
      try {
        setDeleting(id);
        // Mutation handles optimistic update automatically
        await deleteTree.mutateAsync(id);
      } catch (_error) {
        // Error handling is done in the mutation hook
      } finally {
        setDeleting(null);
      }
    }
  }, [deleteTree]);

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
      scientificSpecies: '',
      speciesInfoAvailable: false,
      co2: '',
      foodSecurity: '',
      economicDevelopment: '',
      co2Absorption: '',
      environmentalProtection: '',
      localUses: [],
      image: null,
      smallImages: [null, null, null, null]
    });
  };

  // Local uses descriptions
  const localUsesDescriptions: Record<string, string> = {
    'Natural pesticide': 'Its leaves and fruits naturally repel pests and diseases, offering a safe, chemical-free way to protect plants.',
    'Soil': 'With its nitrogen-fixing abilities and deep roots, it nourishes the soil, protects it from erosion, and restores fertility.',
    'Fence': 'Acting as a natural barrier, it shields crops and creates cool, shaded spaces for animals to rest.',
    'Anti-wind': 'It stands strong against harsh winds, safeguarding tender plants and helping the soil retain precious moisture.',
    'Cosmetics': 'From its blossoms to its leaves, valuable extracts are used to create gentle, earth-derived beauty products.',
    'Biodiversity': 'This tree supports the return of birds, insects, and small animals, helping restore balance to the entire ecosystem.',
    'Consumption and sales': 'Its fruits, seeds, and leaves provide nourishment for farming families and can also be sold, supporting local markets.',
    'Livestock': 'Its fresh or dried leaves serve as a nutritious feed for livestock, helping farmers care for their animals naturally.',
    'Medicine': 'Its leaves, roots, bark, and fruits have long been used in traditional remedies — offering healing straight from nature.'
  };

  const handleLocalUseToggle = (use: string) => {
    setFormData(prev => ({
      ...prev,
      localUses: prev.localUses.includes(use)
        ? prev.localUses.filter(u => u !== use)
        : [...prev.localUses, use]
    }));
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
        cell: ({ row }) => {
          const treeType = (row.original as Tree & { treeType?: string }).treeType || 'individual';
          const typeConfig = {
            company: { label: 'Company', color: 'bg-blue-100 text-blue-800' },
            forest: { label: 'Forest', color: 'bg-emerald-100 text-emerald-800' },
            individual: { label: 'Individual', color: 'bg-green-100 text-green-800' },
          };
          const config = typeConfig[treeType as keyof typeof typeConfig] || typeConfig.individual;
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
              {config.label}
          </span>
          );
        },
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
              disabled={deleting === row.original._id}
              className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [handleDelete, deleting]
  );

  if (loading && trees.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error && trees.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-red-50 border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-lg font-semibold text-red-900">Error Loading Trees</h2>
            </div>
            <p className="text-red-700 mb-4">
              {error instanceof Error ? error.message : 'Failed to load trees. Please try again.'}
            </p>
            <button
              onClick={() => {
                // Use React Query's refetch to retry
                refetch();
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
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
                      // Reset price field when switching to company or forest (will use package price)
                      price: (newTreeType === 'company' || newTreeType === 'forest') ? '' : formData.price
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="individual">Individual Tree</option>
                  <option value="company">Company Package</option>
                  <option value="forest">Forest Tree</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.treeType === 'individual' 
                    ? 'Single tree for individual adoption' 
                    : formData.treeType === 'company'
                    ? 'Package of multiple trees for corporate adoption'
                    : 'Package of trees for forest creation - users can set forest name at checkout'
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

              {/* Additional Tree Information Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Tree Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scientific Species</label>
                    <input
                      type="text"
                      disabled={submitting}
                      value={formData.scientificSpecies}
                      onChange={(e) => setFormData({ ...formData, scientificSpecies: e.target.value })}
                      placeholder="e.g., Ficus religiosa"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="speciesInfoAvailable"
                      disabled={submitting}
                      checked={formData.speciesInfoAvailable}
                      onChange={(e) => setFormData({ ...formData, speciesInfoAvailable: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="speciesInfoAvailable" className="ml-2 block text-sm text-gray-700">
                      Species information available upon request
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">CO₂ (kg)</label>
                    <input
                      type="number"
                      disabled={submitting}
                      value={formData.co2}
                      onChange={(e) => setFormData({ ...formData, co2: e.target.value })}
                      placeholder="e.g., -294"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Can be negative (e.g., -294kg)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Food Security (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        disabled={submitting}
                        value={formData.foodSecurity}
                        onChange={(e) => setFormData({ ...formData, foodSecurity: e.target.value })}
                        placeholder="e.g., 3"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Economic Development (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        disabled={submitting}
                        value={formData.economicDevelopment}
                        onChange={(e) => setFormData({ ...formData, economicDevelopment: e.target.value })}
                        placeholder="e.g., 9"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">CO₂ Absorption (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        disabled={submitting}
                        value={formData.co2Absorption}
                        onChange={(e) => setFormData({ ...formData, co2Absorption: e.target.value })}
                        placeholder="e.g., 5"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Environmental Protection (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        disabled={submitting}
                        value={formData.environmentalProtection}
                        onChange={(e) => setFormData({ ...formData, environmentalProtection: e.target.value })}
                        placeholder="e.g., 4"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Local Uses Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Local Uses</h3>
                <p className="text-xs text-gray-500 mb-4">Select all applicable local uses for this tree</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {VALID_LOCAL_USES.map((use) => (
                    <div key={use} className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        id={`localUse-${use}`}
                        disabled={submitting}
                        checked={formData.localUses.includes(use)}
                        onChange={() => handleLocalUseToggle(use)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed flex-shrink-0"
                      />
                      <label htmlFor={`localUse-${use}`} className="flex-1 cursor-pointer">
                        <div className="font-medium text-sm text-gray-900">{use}</div>
                        <div className="text-xs text-gray-600 mt-1">{localUsesDescriptions[use]}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Package fields - show for company and forest trees */}
              {(formData.treeType === 'company' || formData.treeType === 'forest') && (
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
                    {formData.treeType === 'company' 
                      ? 'Package pricing will be calculated automatically (Package Price ÷ Package Quantity = Price per tree)'
                      : 'Package pricing for forest trees. Users can set their forest name at checkout.'}
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
                <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-1.5">📸 Image Size Guidelines:</p>
                  <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                    <li><strong>Recommended Aspect Ratio:</strong> 1:1 (square) or 4:4 (width:height)</li>
                    <li><strong>Recommended Dimensions:</strong> 1200x1200px or 1600x1600px</li>
                    <li><strong>Maximum File Size:</strong> 5MB</li>
                    <li><strong>Note:</strong> Images with 1:1 (square) aspect ratio will fit perfectly in the card without cropping. Other ratios may be cropped to fit.</li>
                  </ul>
                </div>
                {editingTree && editingTree.imageUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Current Image:</p>
                    <Image
                      src={editingTree.imageUrl}
                      alt={editingTree.name}
                      width={100}
                      height={100}
                      className="rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
              
              {/* Small Images Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Small Images (4 images for collage display)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload up to 4 small square images that will be displayed in a collage format on the tree detail page.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Small Image {index + 1}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={submitting}
                        onChange={(e) => {
                          const newSmallImages = [...formData.smallImages];
                          newSmallImages[index] = e.target.files?.[0] || null;
                          setFormData({ ...formData, smallImages: newSmallImages });
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {editingTree && editingTree.smallImageUrls && editingTree.smallImageUrls[index] && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 mb-1">Current:</p>
                          <Image
                            src={editingTree.smallImageUrls[index]}
                            alt={`Small image ${index + 1}`}
                            width={80}
                            height={80}
                            className="rounded-lg border border-gray-300 object-cover"
                          />
                        </div>
                      )}
                      {formData.smallImages[index] && (
                        <div className="mt-2">
                          <p className="text-xs text-green-600 mb-1">New:</p>
                          <Image
                            src={URL.createObjectURL(formData.smallImages[index]!)}
                            alt={`New small image ${index + 1}`}
                            width={80}
                            height={80}
                            className="rounded-lg border border-gray-300 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-xs font-semibold text-green-900 mb-1.5">💡 Small Image Guidelines:</p>
                  <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
                    <li><strong>Recommended:</strong> Square images (1:1 aspect ratio)</li>
                    <li><strong>Recommended Size:</strong> 400x400px to 800x800px</li>
                    <li><strong>Maximum File Size:</strong> 2MB per image</li>
                    <li><strong>Display:</strong> These images will appear as a vertical stack on the tree detail page</li>
                  </ul>
                </div>
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

        {/* Loading Dialog - Centered on screen (non-blocking) */}
        {createTree.isPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 pointer-events-auto">
              <div className="flex flex-col items-center justify-center gap-4">
                <svg className="h-12 w-12 animate-spin text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Adding Tree</h3>
                  <p className="text-sm text-gray-600">Please wait while we add the tree to the system...</p>
                </div>
              </div>
            </div>
          </div>
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
