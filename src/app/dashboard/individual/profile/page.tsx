'use client';

import { useSession } from 'next-auth/react';
import { UserIcon, PencilIcon, CheckIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function IndividualProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
  });

  // Fetch user profile picture on mount
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/users/${session.user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.profilePicture?.url) {
            setProfilePicture(result.data.profilePicture.url);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile picture:', error);
      }
    };

    fetchProfilePicture();
  }, [session?.user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Here you would typically save the data to your backend
    setIsEditing(false);
  };

  const handleFileSelect = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      const response = await fetch('/api/users/profile-picture', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let browser set it with boundary
      });
      
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload profile picture' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setProfilePicture(result.data.profilePicture.url);
        // Update session with new profile picture
        await updateSession({ image: result.data.profilePicture.url });
      } else {
        setUploadError(result.message || result.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePicture = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) {
      return;
    }

    try {
      const response = await fetch('/api/users/profile-picture', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setProfilePicture(null);
        // Update session to remove profile picture
        await updateSession({ image: null });
      } else {
        setUploadError(result.message || 'Failed to delete profile picture');
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      setUploadError('Failed to delete profile picture');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>
        <motion.button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PencilIcon className="h-5 w-5" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          className="lg:col-span-1 bg-white rounded-lg shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-6 text-center">
            <div className="relative mx-auto h-24 w-24 mb-4">
              {profilePicture ? (
                <div 
                  className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-green-200 cursor-pointer group"
                  onClick={!isEditing ? (e) => handleFileSelect(e) : undefined}
                  title={!isEditing ? "Click to change profile picture" : undefined}
                >
                  <Image
                    src={profilePicture}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                  {!isEditing && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <ArrowUpTrayIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {isEditing && (
                    <button
                      onClick={handleDeletePicture}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                      title="Delete profile picture"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div 
                  className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-200 cursor-pointer hover:bg-green-200 transition-colors relative"
                  onClick={handleFileSelect}
                  title="Click to upload profile picture"
                >
                  <UserIcon className="h-12 w-12 text-green-600" />
                </div>
              )}
              <button
                onClick={handleFileSelect}
                disabled={isUploading}
                className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full p-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                title="Upload profile picture"
              >
                {isUploading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUpTrayIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploadError && (
              <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {uploadError}
              </div>
            )}
            {isUploading && (
              <div className="mb-2 text-sm text-blue-600">Uploading...</div>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {session?.user?.name || 'Individual User'}
            </h2>
            <p className="text-gray-600 mb-4">{session?.user?.email}</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Individual Account
            </div>
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          className="lg:col-span-2 bg-white rounded-lg shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter your address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {isEditing && (
                <motion.div
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <motion.button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CheckIcon className="h-4 w-4" />
                    Save Changes
                  </motion.button>
                  <motion.button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
