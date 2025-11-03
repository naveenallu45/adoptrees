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
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          title: 'Tree Placed Successfully!',
          message: 'Thank you for your contribution to the environment!',
          primaryButton: 'View Your Trees',
          secondaryButton: 'Continue Adopting',
          primaryButtonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          secondaryButtonClass: 'border-gray-300 bg-white hover:bg-gray-50',
          showRetry: false
        };
      case 'failed':
        return {
          icon: ExclamationTriangleIcon,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          title: 'Payment Failed',
          message: errorMessage || 'Something went wrong with your payment.',
          primaryButton: 'Try Again',
          secondaryButton: 'Close',
          primaryButtonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          secondaryButtonClass: 'border-gray-300 bg-white hover:bg-gray-50',
          showRetry: true
        };
      case 'pending':
        return {
          icon: ClockIcon,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          title: 'Payment Pending',
          message: 'Your payment is being processed. Please wait for confirmation.',
          primaryButton: 'Check Status',
          secondaryButton: 'Close',
          primaryButtonClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          secondaryButtonClass: 'border-gray-300 bg-white hover:bg-gray-50',
          showRetry: false
        };
      default:
        return {
          icon: CheckCircleIcon,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          title: 'Success',
          message: 'Operation completed successfully.',
          primaryButton: 'OK',
          secondaryButton: 'Close',
          primaryButtonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          secondaryButtonClass: 'border-gray-300 bg-white hover:bg-gray-50',
          showRetry: false
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

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex flex-col items-center text-center">
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${config.iconBg}`}>
                    <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
                  </div>
                  
                  <Dialog.Title as="h3" className="mt-4 text-2xl font-bold text-gray-900">
                    {config.title}
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <p className="text-lg text-gray-600">
                      {config.message}
                    </p>
                    {orderDetails && status === 'success' && (
                      <div className="mt-4 space-y-2 text-sm text-gray-500">
                        <p>Order ID: {orderDetails.orderId}</p>
                        <p>Total Amount: ₹{orderDetails.totalAmount.toFixed(2)}</p>
                        <p>Trees Adopted: {orderDetails.itemsCount}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      type="button"
                      className={`flex-1 inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${config.primaryButtonClass}`}
                      onClick={handlePrimaryAction}
                    >
                      {config.primaryButton}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors ${config.secondaryButtonClass}`}
                      onClick={onClose}
                    >
                      {config.secondaryButton}
                    </button>
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