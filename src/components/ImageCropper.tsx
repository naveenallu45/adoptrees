'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Cropper, CircleStencil, ImageRestriction, CropperRef } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  aspect?: number;
  circularCrop?: boolean;
}

export default function ImageCropper({
  image,
  onCropComplete,
  onCancel,
  aspect = 1,
  circularCrop = true,
}: ImageCropperProps) {
  const [coordinates, setCoordinates] = useState<{ width: number; height: number; left: number; top: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cropperRef = useRef<CropperRef>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const onChange = useCallback(() => {
    if (cropperRef.current) {
      setCoordinates(cropperRef.current.getCoordinates());
    }
  }, []);

  const getCroppedImage = async (): Promise<Blob> => {
    if (!cropperRef.current) {
      throw new Error('Cropper not initialized');
    }

    const canvas = cropperRef.current.getCanvas({
      height: 500,
      width: 500,
    });

    if (!canvas) {
      throw new Error('Failed to get canvas');
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob: Blob | null) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  const handleSave = async () => {
    if (!coordinates) {
      return;
    }

    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImage();
      onCropComplete(croppedImageBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/30 p-2 sm:p-4"
        onClick={(e) => {
          // Close on backdrop click
          if (e.target === e.currentTarget) {
            onCancel();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
              Adjust Your Profile Picture
            </h2>
            <button
              onClick={onCancel}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
            </button>
          </div>

          {/* Cropper Container */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Main Cropper */}
            <div className="flex-1 relative bg-gray-100 min-h-[300px] sm:min-h-[350px] md:min-h-[400px] lg:min-h-[500px]">
              <Cropper
                ref={cropperRef}
                src={image}
                stencilComponent={circularCrop ? CircleStencil : undefined}
                stencilProps={{
                  aspectRatio: aspect,
                }}
                imageRestriction={ImageRestriction.fillArea}
                onChange={onChange}
                className="cropper-container"
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            </div>

            {/* Preview Sidebar */}
            <div className="w-full lg:w-64 p-3 sm:p-4 lg:p-6 bg-gray-50 border-t lg:border-t-0 lg:border-l flex flex-col items-center justify-center gap-3 sm:gap-4 lg:gap-6 flex-shrink-0">
              <div className="flex flex-col items-center w-full">
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3 text-center">
                  Preview
                </p>
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 sm:border-4 border-gray-300 shadow-lg">
                  {coordinates && cropperRef.current && (() => {
                    try {
                      const canvas = cropperRef.current.getCanvas({
                        height: 128,
                        width: 128,
                      });
                      if (canvas) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`preview-${coordinates.left}-${coordinates.top}`}
                            src={canvas.toDataURL('image/jpeg', 0.95)}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-full"
                          />
                        );
                      }
                    } catch (error) {
                      console.error('Error generating preview:', error);
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Instructions */}
              <div className="text-[10px] sm:text-xs text-gray-600 space-y-1 sm:space-y-2 text-center w-full px-2">
                <p className="sm:hidden">
                  Touch and drag to move • Pinch to zoom
                </p>
                <div className="hidden sm:block lg:hidden space-y-1">
                  <p>• Touch and drag to reposition</p>
                  <p>• Pinch to zoom in/out</p>
                </div>
                <div className="hidden lg:block space-y-2">
                  <p>• Drag to reposition</p>
                  <p>• Scroll or pinch to zoom</p>
                  <p>• Center your face in the circle</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t bg-gray-50 flex-shrink-0">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing || !coordinates}
              className="px-4 py-1.5 sm:px-6 sm:py-2 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">Processing</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Save & Upload</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
