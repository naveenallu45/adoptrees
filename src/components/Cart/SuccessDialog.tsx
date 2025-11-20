'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

export type PaymentStatus = 'success' | 'failed' | 'pending';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: PaymentStatus;
  orderDetails?: {
    orderId: string;
    totalAmount: number;
    itemsCount: number;
  } | null;
  errorMessage?: string;
  onRetry?: () => void;
}

export default function PaymentDialog({ 
  isOpen, 
  onClose, 
  status, 
  orderDetails, 
  errorMessage,
  onRetry 
}: PaymentDialogProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircleIcon,
          iconBg: 'bg-white',
          iconColor: 'text-green-600',
          title: 'Payment Successful!',
          message: 'Thank you for your contribution to the environment!',
          primaryButton: 'View Your Trees',
          secondaryButton: 'Continue Adopting',
          primaryButtonClass: 'bg-white text-green-600 hover:bg-green-50 focus:ring-green-500 shadow-lg',
          secondaryButtonClass: 'border-2 border-white bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 shadow-md',
          showRetry: false,
          bgGradient: 'from-green-500 via-green-600 to-emerald-600'
        };
      case 'failed':
        return {
          icon: ExclamationTriangleIcon,
          iconBg: 'bg-white',
          iconColor: 'text-red-600',
          title: 'Payment Failed',
          message: errorMessage || 'Something went wrong with your payment. Please try again.',
          primaryButton: 'Try Again',
          secondaryButton: 'Close',
          primaryButtonClass: 'bg-white text-red-600 hover:bg-red-50 focus:ring-red-500 shadow-lg',
          secondaryButtonClass: 'border-2 border-white bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 shadow-md',
          showRetry: true,
          bgGradient: 'from-red-500 via-red-600 to-rose-600'
        };
      case 'pending':
        return {
          icon: ClockIcon,
          iconBg: 'bg-white',
          iconColor: 'text-yellow-600',
          title: 'Payment Pending',
          message: 'Your payment is being processed. Please wait for confirmation.',
          primaryButton: 'Check Status',
          secondaryButton: 'Close',
          primaryButtonClass: 'bg-white text-yellow-600 hover:bg-yellow-50 focus:ring-yellow-500 shadow-lg',
          secondaryButtonClass: 'border-2 border-white bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 shadow-md',
          showRetry: false,
          bgGradient: 'from-yellow-500 via-yellow-600 to-amber-600'
        };
      default:
        return {
          icon: CheckCircleIcon,
          iconBg: 'bg-white',
          iconColor: 'text-green-600',
          title: 'Success',
          message: 'Operation completed successfully.',
          primaryButton: 'OK',
          secondaryButton: 'Close',
          primaryButtonClass: 'bg-white text-green-600 hover:bg-green-50 focus:ring-green-500 shadow-lg',
          secondaryButtonClass: 'border-2 border-white bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 shadow-md',
          showRetry: false,
          bgGradient: 'from-green-500 via-green-600 to-emerald-600'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  const handlePrimaryAction = () => {
    if (status === 'failed' && onRetry) {
      onRetry();
    } else {
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className={`w-full max-w-lg transform overflow-hidden rounded-3xl bg-gradient-to-br ${config.bgGradient} p-1 shadow-2xl transition-all`}>
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 sm:p-10">
                <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className={`mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full ${config.iconBg} shadow-lg mb-6`}>
                      <IconComponent className={`h-10 w-10 sm:h-12 sm:w-12 ${config.iconColor}`} />
                  </div>
                  
                    {/* Title */}
                    <Dialog.Title 
                      as="h3" 
                      className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-['Calibri'] tracking-tight"
                    >
                    {config.title}
                  </Dialog.Title>
                  
                    {/* Message */}
                    <div className="mt-2 w-full">
                      <p className="text-lg sm:text-xl text-gray-700 font-medium leading-relaxed">
                      {config.message}
                    </p>
                      
                      {/* Order Details */}
                    {orderDetails && status === 'success' && (
                        <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/50 shadow-sm">
                          <div className="space-y-3 text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Order ID</span>
                              <span className="text-base font-bold text-gray-900 font-mono">{orderDetails.orderId}</span>
                            </div>
                            <div className="h-px bg-green-200"></div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Amount</span>
                              <span className="text-xl font-bold text-green-600">₹{orderDetails.totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-green-200"></div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Trees Adopted</span>
                              <span className="text-lg font-bold text-gray-900">{orderDetails.itemsCount} {orderDetails.itemsCount === 1 ? 'Tree' : 'Trees'}</span>
                            </div>
                          </div>
                      </div>
                    )}
                  </div>

                    {/* Buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full">
                    <button
                      type="button"
                        className={`flex-1 inline-flex justify-center items-center rounded-xl border-2 border-transparent px-6 py-3.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${config.primaryButtonClass}`}
                      onClick={handlePrimaryAction}
                    >
                      {config.primaryButton}
                    </button>
                    <button
                      type="button"
                        className={`flex-1 inline-flex justify-center items-center rounded-xl px-6 py-3.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${config.secondaryButtonClass}`}
                      onClick={onClose}
                    >
                      {config.secondaryButton}
                    </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}