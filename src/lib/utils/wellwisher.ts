// Well-wisher utility functions for production-level features
// NOTE: This file is for CLIENT-SIDE utilities only
// For server-side utilities, use wellwisher-assignment.ts

import { validateImageFile } from '@/lib/validations/tree';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  file?: File;
  size?: string;
}

/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate and process image files for well-wisher uploads
 */
export function validateWellWisherImage(file: File): ImageValidationResult {
  const validation = validateImageFile(file);
  
  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
    };
  }

  return {
    valid: true,
    file,
    size: formatFileSize(file.size),
  };
}

/**
 * Validate multiple image files
 */
export function validateWellWisherImages(files: File[]): {
  valid: boolean;
  errors: string[];
  validFiles: File[];
  fileSizes: string[];
} {
  const errors: string[] = [];
  const validFiles: File[] = [];
  const fileSizes: string[] = [];

  if (files.length === 0) {
    return {
      valid: false,
      errors: ['Please select at least one image'],
      validFiles: [],
      fileSizes: [],
    };
  }

  if (files.length > 5) {
    errors.push('Maximum 5 images allowed');
    return {
      valid: false,
      errors,
      validFiles: [],
      fileSizes: [],
    };
  }

  files.forEach((file, index) => {
    const validation = validateWellWisherImage(file);
    if (validation.valid && validation.file) {
      validFiles.push(validation.file);
      fileSizes.push(validation.size || 'Unknown');
    } else {
      errors.push(`Image ${index + 1}: ${validation.error || 'Invalid file'}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validFiles,
    fileSizes,
  };
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Get network error message with actionable steps
 */
export function getNetworkErrorMessage(error: unknown): string {
  if (!isOnline()) {
    return 'You are offline. Please check your internet connection and try again.';
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Compress image if needed (client-side compression)
 */
export function compressImage(file: File, maxSizeMB: number = 2): Promise<File> {
  return new Promise((resolve, reject) => {
    // If file is already small enough, return as-is
    if (file.size <= maxSizeMB * 1024 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions to reduce file size
        const maxDimension = 1920; // Max width/height
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.85 // Quality (0.85 = 85%)
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

