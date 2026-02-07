'use client';

import { useSession } from 'next-auth/react';
import { 
  CameraIcon, 
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ShieldCheckIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ImageCropper from '@/components/ImageCropper';
import toast from 'react-hot-toast';

export default function WellWisherProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const sessionUpdateRef = useRef(false);
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile data on mount
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
            setProfileData({
              name: userData.name || session?.user?.name || '',
              email: userData.email || session?.user?.email || '',
              phone: userData.phone || '',
              address: userData.address || '',
            });
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

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  // Sync profile image with session image
  useEffect(() => {
    if (!sessionUpdateRef.current && session?.user?.image && !profileImage) {
      setProfileImage(session.user.image);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.image, profileImage]);

  const validateImageFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select a valid image file';
    }
    
    if (file.size > 50 * 1024 * 1024) {
      return 'Image size must be less than 50MB';
    }
    
    return null;
  };

  const handleImageSelect = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setSaveError(validationError);
      toast.error(validationError);
      return;
    }

    setSaveError(null);
    
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

    const croppedFile = new File([croppedImageBlob], 'profile.jpg', {
      type: 'image/jpeg',
    });

    setIsUploadingImage(true);
    setShowCropper(false);
    setSaveError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(croppedFile);

      const formDataToSend = new FormData();
      // Only send image, profile fields are managed by admin
      formDataToSend.append('image', croppedFile);

      await handleImageUploadRequest(formDataToSend, croppedFile);
    } catch (error) {
      console.error('Error processing cropped image:', error);
      setSaveError('Failed to process image. Please try again.');
      setIsUploadingImage(false);
      toast.error('Failed to process image. Please try again.');
    }
  };

  const handleImageUploadRequest = async (formDataToSend: FormData, _file: File) => {
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
        
        setProfileImage(newImage);
        setImagePreview(null);
        
        toast.success('Profile picture updated successfully!', {
          icon: '✅',
          duration: 3000,
        });
        
        if (newImage !== session?.user?.image) {
          sessionUpdateRef.current = true;
          const scheduleUpdate = typeof window !== 'undefined' && 'requestIdleCallback' in window
            ? (cb: () => void) => (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
            : (cb: () => void) => setTimeout(cb, 0);
          
          scheduleUpdate(() => {
            updateSession({
              image: newImage,
            }).catch((error) => {
              console.error('Session update error:', error);
              if (session?.user?.image) {
                setProfileImage(session.user.image);
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current && !isUploadingImage) {
      fileInputRef.current.click();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const infoCards = [
    {
      icon: UserIcon,
      label: 'Full Name',
      value: profileData.name || 'Not set',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
    },
    {
      icon: EnvelopeIcon,
      label: 'Email Address',
      value: profileData.email || 'Not set',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
    },
    {
      icon: PhoneIcon,
      label: 'Phone Number',
      value: profileData.phone || 'Not set',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
    },
    {
      icon: MapPinIcon,
      label: 'Address',
      value: profileData.address || 'Not set',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserIcon className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
          </div>
          <p className="text-gray-600 ml-12">View and manage your profile information</p>
        </motion.div>

        {/* Main Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 px-6 py-8 sm:px-8 sm:py-10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            
            <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-6">
              {/* Profile Picture Section */}
              <div 
                className="relative group"
                onMouseEnter={() => setIsHoveringImage(true)}
                onMouseLeave={() => setIsHoveringImage(false)}
              >
                <motion.div
                  className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl ring-4 ring-white/50"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                    />
                  ) : profileImage ? (
                    <Image
                      src={profileImage}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 flex items-center justify-center text-white text-5xl sm:text-6xl font-bold shadow-inner">
                      {profileData.name?.charAt(0)?.toUpperCase() || 'W'}
                    </div>
                  )}
                  
                  {/* Upload Overlay */}
                  <AnimatePresence>
                    {(isHoveringImage || isUploadingImage) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"
                      >
                        {isUploadingImage ? (
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent mx-auto mb-2"></div>
                            <p className="text-white text-xs font-medium">Uploading...</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <PhotoIcon className="h-8 w-8 text-white mx-auto mb-1" />
                            <p className="text-white text-xs font-medium">Change Photo</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                
                {/* Camera Button */}
                <motion.button
                  onClick={handleImageClick}
                  disabled={isUploadingImage}
                  className="absolute -bottom-2 -right-2 p-3 bg-white text-green-600 rounded-full shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-100"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  title="Update profile picture"
                >
                  <CameraIcon className="h-5 w-5" />
                </motion.button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left text-white">
                <h2 className="text-3xl sm:text-4xl font-bold mb-2 drop-shadow-lg">
                  {profileData.name || 'Well Wisher'}
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-green-50">
                  <ShieldCheckIcon className="h-5 w-5" />
                  <p className="text-sm font-medium">Profile managed by administrators</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6 sm:p-8">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {infoCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                    className={`${card.bgColor} rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all duration-300`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${card.iconBg} p-3 rounded-lg`}>
                        <Icon className={`h-6 w-6 ${card.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          {card.label}
                        </p>
                        <p className={`text-base font-medium text-gray-900 break-words ${
                          card.value === 'Not set' ? 'text-gray-400 italic' : ''
                        }`}>
                          {card.value}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Information Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                  <ShieldCheckIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-gray-900 mb-1">Profile Information</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Your profile information (name, email, phone, and address) is managed by administrators. 
                    If you need to update any of these details, please contact your administrator. 
                    You can update your profile picture by clicking the camera icon above.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {saveError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 mb-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{saveError}</p>
                    </div>
                    <button
                      onClick={() => setSaveError(null)}
                      className="flex-shrink-0 text-red-400 hover:text-red-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
  );
}
