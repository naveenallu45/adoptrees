'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import AuthGuard from '@/components/Admin/AuthGuard';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    info: '',
    oxygenKgs: '',
    image: null as File | null
  });

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      const response = await fetch('/api/admin/trees');
      const data = await response.json();
      if (data.success) {
        setTrees(data.data);
      }
    } catch (error) {
      console.error('Error fetching trees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.price || !formData.info || !formData.oxygenKgs) {
      alert('Please fill in all fields');
      return;
    }

    if (!formData.image) {
      alert('Please select an image');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('price', formData.price);
    formDataToSend.append('info', formData.info);
    formDataToSend.append('oxygenKgs', formData.oxygenKgs);
    formDataToSend.append('image', formData.image);

    console.log('Submitting form with image:', formData.image.name, 'Size:', formData.image.size);

    try {
      const response = await fetch('/api/admin/trees', {
        method: 'POST',
        body: formDataToSend,
      });
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        setFormData({ name: '', price: '', info: '', oxygenKgs: '', image: null });
        setShowForm(false);
        fetchTrees();
        alert('Tree created successfully!');
      } else {
        console.error('API Error:', data.error);
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating tree:', error);
      alert('Error creating tree: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tree?')) return;

    try {
      const response = await fetch(`/api/admin/trees/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchTrees();
        alert('Tree deleted successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting tree:', error);
      alert('Error deleting tree');
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTree) return;

    try {
      const response = await fetch(`/api/admin/trees/${editingTree._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          info: formData.info,
          oxygenKgs: parseFloat(formData.oxygenKgs),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFormData({ name: '', price: '', info: '', oxygenKgs: '', image: null });
        setShowForm(false);
        setEditingTree(null);
        fetchTrees();
        alert('Tree updated successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating tree:', error);
      alert('Error updating tree');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage trees and monitor your platform</p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex gap-4"
        >
          <button
            onClick={() => {
              setShowForm(true);
              setEditingTree(null);
              setFormData({ name: '', price: '', info: '', oxygenKgs: '', image: null });
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Tree
          </button>
        </motion.div>

        {/* Form Modal */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6">
                {editingTree ? 'Edit Tree' : 'Add New Tree'}
              </h2>
              
              <form onSubmit={editingTree ? handleUpdate : handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tree Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Information
                  </label>
                  <textarea
                    value={formData.info}
                    onChange={(e) => setFormData({ ...formData, info: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oxygen Production (kg/year)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.oxygenKgs}
                    onChange={(e) => setFormData({ ...formData, oxygenKgs: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                {!editingTree && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tree Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required={!editingTree}
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    {editingTree ? 'Update Tree' : 'Create Tree'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTree(null);
                      setFormData({ name: '', price: '', info: '', oxygenKgs: '', image: null });
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Trees Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading trees...</p>
            </div>
          ) : trees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No trees found. Add your first tree!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trees.map((tree, index) => (
                <motion.div
                  key={tree._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="aspect-w-16 aspect-h-12">
                    <img
                      src={tree.imageUrl}
                      alt={tree.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{tree.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{tree.info}</p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-green-600">${tree.price}</span>
                      <span className="text-sm text-gray-500">{tree.oxygenKgs} kg O₂/year</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(tree)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tree._id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-sm transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
    </AuthGuard>
  );
}
