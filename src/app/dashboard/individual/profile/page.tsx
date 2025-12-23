'use client';

import { useSession } from 'next-auth/react';
import { PencilIcon, CheckIcon, CameraIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ImageCropper from '@/components/ImageCropper';
import ProfilePictureSuggestion from '@/components/Dashboard/ProfilePictureSuggestion';
import { emitProfileUpdate } from '@/lib/profile-update-events';
import toast from 'react-hot-toast';

export default function IndividualProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const sessionUpdateRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
    dateOfBirth: '',
  });
  const [dateOfBirthLastUpdated, setDateOfBirthLastUpdated] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
    dateOfBirth: '',
  });
  const [credits, setCredits] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile data on mount - only once
  useEffect(() => {
    let isMounted = true;
    
    const loadUserData = async () => {
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
            // Format date of birth for input field (YYYY-MM-DD)
            const dateOfBirthValue = userData.dateOfBirth 
              ? new Date(userData.dateOfBirth).toISOString().split('T')[0]
              : '';
            
            const fetchedData = {
              name: userData.name || session?.user?.name || '',
              email: userData.email || session?.user?.email || '',
              phone: userData.phone || '',
              address: userData.address || '',
              dateOfBirth: dateOfBirthValue,
            };
            setFormData(fetchedData);
            setInitialFormData(fetchedData);
            setProfileImage(userData.image || session?.user?.image || null);
            setCredits(userData.credits || 0);
            
            // Set last update date if it exists
            if (userData.dateOfBirthLastUpdated) {
              setDateOfBirthLastUpdated(userData.dateOfBirthLastUpdated);
            } else {
              setDateOfBirthLastUpdated(null);
            }
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

    loadUserData();

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

  const validateImageFile = (file: File): string | null => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
      return 'Please select a valid image file';
      }
      
      // Accept any image size - certificate generation will resize as needed
      // Very large limit (50MB) as safety check only
      if (file.size > 50 * 1024 * 1024) {
      return 'Image size must be less than 50MB';
    }
    
    return null;
  };

  const handleImageSelect = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaveError(null);
    
    // Create preview and show cropper
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setImageToCrop(imageUrl);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!session?.user?.id) {
      setSaveError('User session not found');
      setShowCropper(false);
      return;
    }

    // Convert blob to File
    const croppedFile = new File([croppedImageBlob], 'profile.jpg', {
      type: 'image/jpeg',
    });

    setIsUploadingImage(true);
    setShowCropper(false);
    setSaveError(null);

    try {
      // Create preview of cropped image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(croppedFile);

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('address', formData.address);
      if (formData.dateOfBirth) {
        formDataToSend.append('dateOfBirth', formData.dateOfBirth);
      }
      formDataToSend.append('image', croppedFile);

      handleImageUploadRequest(formDataToSend, croppedFile);
    } catch (error) {
      console.error('Error processing cropped image:', error);
      setSaveError('Failed to process image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const handleImageUploadRequest = async (formDataToSend: FormData, file: File) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload image' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const newImage = result.data?.image || null;
        
        // Mark the suggestion as seen
        if (newImage && session?.user?.id) {
          const suggestionKey = `profile-picture-suggestion-${session.user.id}`;
          if (typeof window !== 'undefined') {
            localStorage.setItem(suggestionKey, 'true');
          }
        }
        
        // OPTIMISTIC UPDATE: Update state immediately (before session update)
        setProfileImage(newImage);
        setImagePreview(null);
        setProfileImageFile(file);
        
        // Emit profile update event to notify other components
        if (session?.user?.id) {
          emitProfileUpdate(session.user.id, 'image_updated', {
            image: newImage,
          });
        }
        
        // Show success toast
        toast.success('Profile picture uploaded successfully!');
        
        // Update session asynchronously without blocking UI
        // Use requestIdleCallback or setTimeout to prevent blocking
        if (newImage !== session?.user?.image) {
          sessionUpdateRef.current = true;
          // Use requestIdleCallback if available, otherwise setTimeout
          const scheduleUpdate = typeof window !== 'undefined' && 'requestIdleCallback' in window
            ? (cb: () => void) => (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
            : (cb: () => void) => setTimeout(cb, 0);
          
          scheduleUpdate(() => {
            updateSession({
              image: newImage,
            }).catch((error) => {
              console.error('Session update error:', error);
              // Revert optimistic update on error
              if (session?.user?.image) {
                setProfileImage(session.user.image);
                emitProfileUpdate(session.user.id, 'image_updated', {
                  image: session.user.image,
                });
              }
            }).finally(() => {
              sessionUpdateRef.current = false;
            });
          });
        }
      } else {
        const errorMsg = result.message || 'Failed to upload image';
        setSaveError(errorMsg);
        setImagePreview(null);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setSaveError(errorMessage);
      setImagePreview(null);
      toast.error(errorMessage);
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    handleImageSelect(file);

  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current && !isUploadingImage) {
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
        formDataToSend.append('name', formData.name);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phone', formData.phone);
        formDataToSend.append('address', formData.address);
        if (formData.dateOfBirth) {
          formDataToSend.append('dateOfBirth', formData.dateOfBirth);
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
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            dateOfBirth: formData.dateOfBirth || undefined,
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
        
        // If user uploaded a profile picture, mark the suggestion as seen
        if (profileImageFile && newImage && session?.user?.id) {
          const suggestionKey = `profile-picture-suggestion-${session.user.id}`;
          if (typeof window !== 'undefined') {
            localStorage.setItem(suggestionKey, 'true');
          }
        }
        
        // Check if session values actually changed to avoid unnecessary updates
        const nameChanged = formData.name !== session?.user?.name;
        const emailChanged = formData.email !== session?.user?.email;
        const imageChanged = newImage !== session?.user?.image;
        
        // Emit profile update events to notify other components
        if (session?.user?.id) {
          if (imageChanged) {
            emitProfileUpdate(session.user.id, 'image_updated', {
              image: newImage,
            });
          }
          if (nameChanged) {
            emitProfileUpdate(session.user.id, 'name_updated', {
              name: formData.name,
            });
          }
          if (nameChanged || imageChanged || emailChanged) {
            emitProfileUpdate(session.user.id, 'profile_updated', {
              name: formData.name,
              email: formData.email,
              image: newImage,
            });
          }
        }
        
        // Update all state immediately for instant UI feedback
        setProfileImage(newImage);
        setImagePreview(null);
        setProfileImageFile(null);
        setInitialFormData(formData);
        setSaveError(null);
        setIsEditing(false);
        
        // Update date of birth last updated timestamp if available
        if (result.data?.dateOfBirthLastUpdated) {
          setDateOfBirthLastUpdated(result.data.dateOfBirthLastUpdated);
        } else if (!result.data?.dateOfBirth) {
          setDateOfBirthLastUpdated(null);
        }
        
        // Show success toast
        toast.success('Profile updated successfully!');
        
        // Only update session if values actually changed (prevents unnecessary re-renders)
        // Use non-blocking session update to prevent page refresh
        if (nameChanged || emailChanged || imageChanged) {
          sessionUpdateRef.current = true;
          // Update session asynchronously without blocking UI
          // This prevents page refresh while still updating the session
          Promise.resolve().then(() => {
            updateSession({
              name: formData.name,
              email: formData.email,
              image: newImage,
            }).catch((error) => {
              console.error('Session update error:', error);
            }).finally(() => {
              sessionUpdateRef.current = false;
            });
          });
        }
        // Removed router.refresh() to prevent unnecessary full page re-render
        // The component already handles optimistic updates and session updates
      } else {
        const errorMsg = result.message || 'Failed to update profile';
        setSaveError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setSaveError(errorMessage);
      toast.error(errorMessage);
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
    <>
      <ProfilePictureSuggestion />
      {/* Full-page loading overlay during upload/save */}
      {(isUploadingImage || isSaving) && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-medium">
              {isUploadingImage ? 'Uploading profile picture...' : 'Saving profile...'}
            </p>
          </div>
        </div>
      )}
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
          onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
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
            {/* Profile Image */}
            <div className="relative inline-block mb-4">
              <div 
                className={`relative w-32 h-32 rounded-full overflow-hidden border-4 transition-all ${
                  isUploadingImage
                    ? 'border-blue-400'
                    : 'border-gray-200'
                }`}
                style={{ 
                  aspectRatio: '1 / 1',
                  borderRadius: '50%'
                }}
              >
                {imagePreview || profileImage || session?.user?.image ? (
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <Image
                      key={`profile-img-${imagePreview || profileImage || session?.user?.image || 'default'}-${Date.now()}`}
                      src={`${imagePreview || profileImage || session?.user?.image || ''}${(imagePreview || profileImage || session?.user?.image) ? `?t=${Date.now()}` : ''}`}
                      alt="Profile"
                      fill
                      className={`object-cover rounded-full transition-opacity duration-300 ${isUploadingImage ? 'opacity-50' : ''}`}
                      unoptimized={!!imagePreview}
                      style={{ 
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                      sizes="128px"
                      priority
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center rounded-full">
                    <span className="text-white text-3xl font-bold">
                      {(session?.user?.name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Loading overlay */}
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                    <div className="h-8 w-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploadingImage}
              />
              
              {/* Upload Button */}
              <div className="mt-4">
                <motion.button
                  onClick={handleImageClick}
                  disabled={isUploadingImage}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CameraIcon className="h-4 w-4" />
                  {isUploadingImage ? 'Uploading...' : 'Upload Photo'}
                </motion.button>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {session?.user?.name || 'Individual User'}
            </h2>
            <p className="text-gray-600 mb-4">{session?.user?.email}</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-4">
              Individual Account
            </div>
            {/* Credits Display */}
            <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Green Credits</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{credits.toLocaleString()} pts</span>
              </div>
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
                <div className="h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  max={new Date().toISOString().split('T')[0]} // Cannot select future dates
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {dateOfBirthLastUpdated && formData.dateOfBirth && (
                  <p className="mt-1 text-xs text-gray-500">
                    Last updated: {new Date(dateOfBirthLastUpdated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
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
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Image Cropper Modal */}
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setImageToCrop(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          aspect={1}
          circularCrop={true}
        />
      )}
    </div>
    </>
  );
}
