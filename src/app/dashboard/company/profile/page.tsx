'use client';

import { useSession } from 'next-auth/react';
import { PencilIcon, CheckIcon, CameraIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function CompanyProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const sessionUpdateRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
    gstNumber: '',
    website: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState(formData);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Fetch user profile data on mount - only once
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserData = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/users/${session.user.id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && isMounted) {
            const userData = result.data;
            // Set form data
            const fetchedData = {
              companyName: userData.companyName || session?.user?.name || '',
              email: userData.email || session?.user?.email || '',
              phone: userData.phone || '',
              address: userData.address || '',
              gstNumber: userData.gstNumber || '',
              website: userData.website || '',
            };
            setFormData(fetchedData);
            setInitialFormData(fetchedData);
            setProfileImage(userData.image || session?.user?.image || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]); // Only depend on user ID to prevent re-fetch on session updates

  // Sync profile image with session image (only on initial load, not on updates)
  useEffect(() => {
    // Only sync if we're not in the middle of an update and image is missing
    if (!sessionUpdateRef.current && session?.user?.image && !profileImage) {
      setProfileImage(session.user.image);
    }
  }, [session?.user?.image, profileImage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSaveError('Please select a valid image file');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSaveError('Image size must be less than 5MB');
        return;
      }

      setProfileImageFile(file);
      setSaveError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id) {
      setSaveError('User session not found');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      let response: Response;
      
      // If there's an image file, use FormData
      if (profileImageFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('companyName', formData.companyName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phone', formData.phone);
        formDataToSend.append('address', formData.address);
        formDataToSend.append('gstNumber', formData.gstNumber);
        if (formData.website) {
          formDataToSend.append('website', formData.website);
        }
        formDataToSend.append('image', profileImageFile);

        response = await fetch(`/api/users/${session.user.id}`, {
          method: 'PUT',
          body: formDataToSend,
        });
      } else {
        // Otherwise, use JSON
        response = await fetch(`/api/users/${session.user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: formData.companyName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            gstNumber: formData.gstNumber,
            website: formData.website,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update profile' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Optimistic update - update UI immediately
        const newImage = result.data?.image || null;
        if (newImage) {
          setProfileImage(newImage);
          setImagePreview(null);
        }
        setProfileImageFile(null);
        
        // Check if session values actually changed to avoid unnecessary updates
        const nameChanged = formData.companyName !== session?.user?.name;
        const emailChanged = formData.email !== session?.user?.email;
        const imageChanged = newImage !== session?.user?.image;
        
        setInitialFormData(formData);
        setSaveError(null);
        setIsEditing(false);
        
        // Only update session if values actually changed (prevents unnecessary re-renders)
        if (nameChanged || emailChanged || imageChanged) {
          sessionUpdateRef.current = true;
          // Defer session update to prevent immediate re-render cascade
          setTimeout(() => {
            updateSession({
              name: formData.companyName,
              email: formData.email,
              image: newImage || undefined,
            }).catch((error) => {
              console.error('Session update error:', error);
            }).finally(() => {
              sessionUpdateRef.current = false;
            });
          }, 0);
        }
        // Removed router.refresh() to prevent unnecessary full page re-render
        // The component already handles optimistic updates and session updates
      } else {
        setSaveError(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to initial values
    setFormData(initialFormData);
    setSaveError(null);
    setIsEditing(false);
    setProfileImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your company information and corporate settings
          </p>
        </div>
        <motion.button
          onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          <PencilIcon className="h-5 w-5" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Card */}
        <motion.div
          className="lg:col-span-1 bg-white rounded-lg shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-6 text-center">
            {/* Profile Image */}
            <div className="relative inline-block mb-4">
              <div
                className={`relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 ${
                  isEditing ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''
                }`}
                onClick={handleImageClick}
              >
                {imagePreview || profileImage ? (
                  <Image
                    src={imagePreview || profileImage || ''}
                    alt={formData.companyName || 'Company'}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {formData.companyName?.charAt(0).toUpperCase() || 'C'}
                    </span>
                  </div>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <CameraIcon className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              {isEditing && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {formData.companyName || session?.user?.name || 'Company Name'}
            </h2>
            <p className="text-gray-600 mb-4">{formData.email || session?.user?.email}</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Company Account
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Company Information</h3>
            
            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {saveError}
              </div>
            )}
            {!saveError && !isSaving && isEditing && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600">
                Make your changes and click &quot;Save Changes&quot; to update your profile.
              </div>
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Enter company phone number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter GST number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://www.company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter company address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSaving ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </motion.div>
              )}
            </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
