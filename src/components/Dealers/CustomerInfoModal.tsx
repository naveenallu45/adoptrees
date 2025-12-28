'use client';

import { useState } from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerInfo: { customerName: string; customerEmail: string; customerPhone: string; vehicleName: string; customerProfilePicture: string }) => void;
  treeName: string;
}

export default function CustomerInfoModal({ isOpen, onClose, onConfirm, treeName }: CustomerInfoModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [customerProfilePicture, setCustomerProfilePicture] = useState<string | null>(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [errors, setErrors] = useState<{ customerName?: string; customerEmail?: string; customerPhone?: string; vehicleName?: string; profilePicture?: string }>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    // Indian phone number validation: 10 digits, optionally with +91 or 0 prefix
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^(\+91|0)?[6-9]\d{9}$/.test(cleaned) || /^[6-9]\d{9}$/.test(cleaned);
  };

  // Check if customer account exists when email is entered
  const checkCustomerAccount = async (email: string) => {
    if (!email || !validateEmail(email)) {
      setAccountExists(false);
      return;
    }

    setIsCheckingAccount(true);
    try {
      const response = await fetch('/api/customer-profile/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!response.ok) {
        setAccountExists(false);
        return;
      }

      const result = await response.json();
      if (result.success && result.data?.exists) {
        setAccountExists(true);
        // Pre-fill customer name if account exists
        if (result.data.name && !customerName) {
          setCustomerName(result.data.name);
        }
        // Pre-fill phone number if account exists
        if (result.data.phone && !customerPhone) {
          setCustomerPhone(result.data.phone);
        }
        // Pre-fill profile picture if account exists
        if (result.data.image && !customerProfilePicture) {
          setCustomerProfilePicture(result.data.image);
        }
      } else {
        setAccountExists(false);
      }
    } catch (error) {
      console.error('Error checking customer account:', error);
      setAccountExists(false);
    } finally {
      setIsCheckingAccount(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ ...errors, profilePicture: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors({ ...errors, profilePicture: 'Image size must be less than 5MB' });
      return;
    }

    setIsUploadingProfile(true);
    setErrors({ ...errors, profilePicture: undefined });

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomerProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/customer-profile/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }

      const result = await response.json();
      if (result.success && result.data?.url) {
        setCustomerProfilePicture(result.data.url);
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      setErrors({ ...errors, profilePicture: error instanceof Error ? error.message : 'Failed to upload profile picture' });
      setCustomerProfilePicture(null);
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleRemoveProfilePicture = () => {
    setCustomerProfilePicture(null);
    setErrors({ ...errors, profilePicture: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { customerName?: string; customerEmail?: string; customerPhone?: string; vehicleName?: string; profilePicture?: string } = {};
    
    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    
    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else if (!validateEmail(customerEmail)) {
      newErrors.customerEmail = 'Please enter a valid email address';
    }
    
    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Customer phone number is required';
    } else if (!validatePhone(customerPhone)) {
      newErrors.customerPhone = 'Please enter a valid 10-digit phone number';
    }
    
    if (!vehicleName.trim()) {
      newErrors.vehicleName = 'Vehicle name is required';
    }
    
    // Profile picture is mandatory for dealer orders
    if (!customerProfilePicture || !customerProfilePicture.trim()) {
      newErrors.profilePicture = 'Customer profile picture is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Wait for profile picture upload if in progress
    if (isUploadingProfile) {
      setErrors({ ...errors, profilePicture: 'Please wait for profile picture to finish uploading' });
      return;
    }
    
    onConfirm({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      vehicleName: vehicleName.trim(),
      customerProfilePicture: customerProfilePicture!
    });
    
    // Reset form
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setVehicleName('');
    setCustomerProfilePicture(null);
    setAccountExists(false);
    setErrors({});
  };

  // Reset form when modal closes
  const handleClose = () => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setVehicleName('');
    setCustomerProfilePicture(null);
    setAccountExists(false);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Enter customer details for <span className="font-semibold text-gray-900">{treeName}</span>
            </p>
          </div>

          {/* Customer Email - First Field */}
          <div className="mb-4">
            <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                id="customerEmail"
                value={customerEmail}
                onChange={async (e) => {
                  const emailValue = e.target.value;
                  setCustomerEmail(emailValue);
                  if (errors.customerEmail) setErrors({ ...errors, customerEmail: undefined });
                  
                  // Check for existing account when email is valid
                  if (validateEmail(emailValue)) {
                    await checkCustomerAccount(emailValue);
                  } else {
                    setAccountExists(false);
                  }
                }}
                onBlur={async () => {
                  if (customerEmail && validateEmail(customerEmail)) {
                    await checkCustomerAccount(customerEmail);
                  }
                }}
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.customerEmail ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                } focus:outline-none focus:ring-2 focus:ring-green-200 text-gray-900`}
                placeholder="customer@example.com"
              />
              {isCheckingAccount && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              {accountExists && !isCheckingAccount && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-xs text-green-600 font-medium">✓ Account exists</span>
                </div>
              )}
            </div>
            {accountExists && (
              <p className="mt-1 text-xs text-green-600">
                Customer account found. Name and profile will be used from existing account.
              </p>
            )}
            {!accountExists && customerEmail && validateEmail(customerEmail) && !isCheckingAccount && (
              <div className="mt-2 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg shadow-sm">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-lg">📋</span>
                  <div className="flex-1">
                    <p className="text-sm text-amber-900 font-semibold mb-1">
                      New Account Will Be Created
                    </p>
                    <p className="text-xs text-amber-800">
                      Please inform the customer of their login credentials:
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-white border-2 border-amber-400 rounded-lg shadow-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Email:</span>
                      <span className="text-xs font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        {customerEmail}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Password:</span>
                      <span className="text-xs font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-300 font-bold">
                        {customerEmail}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Note:</strong> The password is the same as the email address. The customer can change it after logging in.
                  </p>
                </div>
              </div>
            )}
            {errors.customerEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>
            )}
          </div>

          {/* Customer Name */}
          <div className="mb-4">
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="customerName"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (errors.customerName) setErrors({ ...errors, customerName: undefined });
              }}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                errors.customerName ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
              } focus:outline-none focus:ring-2 focus:ring-green-200 text-gray-900`}
              placeholder="Enter customer full name"
            />
            {errors.customerName && (
              <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
            )}
          </div>

          {/* Customer Phone */}
          <div className="mb-4">
            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (errors.customerPhone) setErrors({ ...errors, customerPhone: undefined });
              }}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                errors.customerPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
              } focus:outline-none focus:ring-2 focus:ring-green-200 text-gray-900`}
              placeholder="Enter customer number"
              maxLength={13}
            />
            {errors.customerPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.customerPhone}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Enter 10-digit phone number</p>
          </div>

          {/* Vehicle Name */}
          <div className="mb-4">
            <label htmlFor="vehicleName" className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="vehicleName"
              value={vehicleName}
              onChange={(e) => {
                setVehicleName(e.target.value);
                if (errors.vehicleName) setErrors({ ...errors, vehicleName: undefined });
              }}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                errors.vehicleName ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
              } focus:outline-none focus:ring-2 focus:ring-green-200 text-gray-900`}
              placeholder="e.g., Honda City, Toyota Innova"
            />
            {errors.vehicleName && (
              <p className="mt-1 text-sm text-red-600">{errors.vehicleName}</p>
            )}
          </div>

          {/* Customer Profile Picture */}
          <div className="mb-6">
            <label htmlFor="customerProfilePicture" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Profile Picture <span className="text-red-500">*</span>
              {accountExists && customerProfilePicture && (
                <span className="text-gray-400 text-xs ml-2"> (Using existing profile)</span>
              )}
            </label>
            <div className="space-y-3">
              {customerProfilePicture ? (
                <div className="relative">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-green-500">
                    <Image
                      src={customerProfilePicture}
                      alt="Customer profile"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized={customerProfilePicture.startsWith('data:')}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveProfilePicture}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    aria-label="Remove profile picture"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="customerProfilePicture"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 transition-colors bg-gray-50"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-2 text-gray-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> profile picture
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 5MB)</p>
                  </div>
                  <input
                    id="customerProfilePicture"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleProfilePictureChange}
                    disabled={isUploadingProfile}
                  />
                </label>
              )}
              {isUploadingProfile && (
                <p className="text-sm text-blue-600">Uploading profile picture...</p>
              )}
              {errors.profilePicture && (
                <p className="mt-1 text-sm text-red-600">{errors.profilePicture}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

