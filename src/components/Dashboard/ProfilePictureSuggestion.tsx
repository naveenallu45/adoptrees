'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePictureSuggestion() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [hasSeenSuggestion, setHasSeenSuggestion] = useState(false);

  useEffect(() => {
    // Wait for session to be loaded
    if (status === 'loading') {
      return;
    }

    // Don't show if not authenticated
    if (status === 'unauthenticated' || !session?.user?.id) {
      return;
    }

    // Don't show if viewing someone else's profile (publicId in URL)
    const publicId = searchParams.get('publicId');
    if (publicId) {
      return;
    }

    // Check if user just registered (auto-login after registration sets newUser=true)
    // When newUser=true, this is considered as first login for the suggestion
    // Registration form redirects with ?newUser=true after auto-login
    const isNewUser = searchParams.get('newUser') === 'true';
    const userId = session.user.id;
    const isOnProfilePage = pathname?.includes('/dashboard/individual/profile') || 
                            pathname?.includes('/dashboard/company/profile');
    
    // Check if user has already seen/dismissed this suggestion (stored in localStorage)
    const suggestionKey = `profile-picture-suggestion-${userId}`;
    const hasSeenBefore = typeof window !== 'undefined' 
      ? localStorage.getItem(suggestionKey) === 'true'
      : false;
    
    // After registration with auto-login, newUser=true is set, so treat as first login
    // This ensures the suggestion appears and "Upload Profile Picture" redirects to profile page
    
    // Check if dismissed in current session
    const dismissedInSession = typeof window !== 'undefined' 
      ? sessionStorage.getItem('profile-picture-suggestion-dismissed')
      : null;
    
    // Check if user has uploaded their own profile picture
    const userImage = session?.user?.image;
    const hasUploadedProfilePicture = userImage && 
                                      typeof userImage === 'string' &&
                                      userImage.trim().length > 0 &&
                                      userImage !== 'undefined' &&
                                      userImage !== 'null' &&
                                      // Ensure it's a real image URL, not a default/placeholder
                                      (userImage.startsWith('http') || userImage.startsWith('data:image') || userImage.startsWith('/'));
    
    // Don't show if user has uploaded a profile picture
    if (hasUploadedProfilePicture) {
      return;
    }
    
    // Show suggestion if:
    // 1. User just registered (newUser=true), OR
    // 2. This is their first login (not seen before), OR
    // 3. User is on profile page and hasn't seen the suggestion
    const shouldShow = (isNewUser || !hasSeenBefore || isOnProfilePage) && 
                       !hasUploadedProfilePicture && 
                       !dismissedInSession && 
                       !hasSeenSuggestion;
    
    if (shouldShow) {
      setShowModal(true);
      setHasSeenSuggestion(true);
    }
  }, [searchParams, pathname, session?.user?.image, session?.user?.id, status, hasSeenSuggestion]);

  const handleDismiss = () => {
    setShowModal(false);
    
    if (typeof window !== 'undefined' && session?.user?.id) {
      // Store in localStorage so it doesn't show again for this user (persists across sessions)
      const suggestionKey = `profile-picture-suggestion-${session.user.id}`;
      localStorage.setItem(suggestionKey, 'true');
      
      // Also store in sessionStorage for current session
      sessionStorage.setItem('profile-picture-suggestion-dismissed', 'true');
    }
    
    // Remove newUser param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('newUser');
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`${pathname}${newUrl}`);
  };

  const handleGoToProfile = () => {
    const userType = session?.user?.userType || 'individual';
    const isOnProfilePage = pathname?.includes('/dashboard/individual/profile') || 
                            pathname?.includes('/dashboard/company/profile');
    
    // Always redirect to profile page when button is clicked
    // If already on profile page, the redirect will be a no-op but ensures we're on the right page
    const profilePath = `/dashboard/${userType}/profile`;
    
    if (!isOnProfilePage) {
      // Redirect to profile page if not already there
      router.push(profilePath);
    } else {
      // If already on profile page, scroll to top to show the profile picture section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Dismiss the modal
    handleDismiss();
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleDismiss}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <CameraIcon className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {pathname?.includes('/profile') ? 'Add Your Profile Picture' : 'Welcome to Adoptrees! 🌳'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {pathname?.includes('/profile')
                    ? 'Click on your profile picture above to upload a photo. It will appear on your adoption certificates and public profile.'
                    : 'Complete your profile by adding a profile picture. It will appear on your adoption certificates and public profile.'}
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleGoToProfile}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    {pathname?.includes('/profile') ? 'Got It!' : 'Upload now'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

