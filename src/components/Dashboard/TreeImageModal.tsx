'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface TreeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{ url: string; caption?: string; type?: string }>;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function TreeImageModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNavigate,
}: TreeImageModalProps) {
  const currentImage = images[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || !currentImage) return null;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Backdrop with blur - doesn't completely hide the page */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 z-20 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg transition-all duration-200 hover:scale-110 group"
              aria-label="Close modal"
              type="button"
            >
              <XMarkIcon className="h-5 w-5 text-gray-700 group-hover:text-gray-900" />
            </button>

            {/* Navigation Buttons */}
            {hasPrevious && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(currentIndex - 1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 group"
                aria-label="Previous image"
                type="button"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-700 group-hover:text-gray-900" />
              </button>
            )}

            {hasNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(currentIndex + 1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 group"
                aria-label="Next image"
                type="button"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-700 group-hover:text-gray-900" />
              </button>
            )}

            {/* Image Container */}
            <div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100 m-0 p-0">
              <Image
                src={currentImage.url}
                alt={currentImage.caption || 'Tree photo'}
                width={800}
                height={600}
                className="w-full h-auto object-cover block m-0 p-0"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 672px"
                priority
                quality={95}
              />
            </div>

            {/* Content Section with Inspirational Message */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 sm:p-5 border-t border-green-100">
              {/* Image Counter */}
              {images.length > 1 && (
                <div className="flex items-center justify-center mb-3">
                  <span className="text-xs font-medium text-gray-600 bg-white/80 px-3 py-1 rounded-full shadow-sm">
                    {currentIndex + 1} of {images.length}
                  </span>
                </div>
              )}

              {/* Inspirational Message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-2"
              >
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center justify-center gap-1.5">
                  <span className="text-xl sm:text-2xl">🌱</span>
                  <span>&quot;Your Tree Has Been Planted!&quot;</span>
                </h3>
                
                <div className="mx-auto space-y-1.5 text-gray-700 leading-relaxed">
                  <p className="text-sm sm:text-base">
                    Thank you for planting this tree with love and responsibility.
                  </p>
                  <p className="text-sm sm:text-base">
                    This image marks the beginning of its journey towards creating oxygen, supporting biodiversity, and fighting climate change.
                  </p>
                  <p className="text-sm sm:text-base font-medium text-green-700">
                    From now on, this tree will grow under your care.
                  </p>
                </div>
              </motion.div>

              {/* Caption if available */}
              {currentImage.caption && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 pt-4 border-t border-green-200"
                >
                  <p className="text-xs sm:text-sm text-gray-600 text-center italic">
                    {currentImage.caption}
                  </p>
                </motion.div>
              )}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

