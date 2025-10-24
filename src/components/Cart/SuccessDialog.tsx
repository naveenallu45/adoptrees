'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: {
    orderId: string;
    totalAmount: number;
    itemsCount: number;
  } | null;
}

export default function SuccessDialog({ isOpen, onClose, orderDetails }: SuccessDialogProps) {
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
          <div className="fixed inset-0 bg-transparent" />
        </Transition.Child>

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
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <Dialog.Title as="h3" className="mt-4 text-2xl font-bold text-gray-900">
                    Tree Placed Successfully!
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <p className="text-lg text-gray-600">
                      Thank you for your contribution to the environment!
                    </p>
                    {orderDetails && (
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
                      className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      onClick={onClose}
                    >
                      View Your Trees
                    </button>
                    <button
                      type="button"
                      className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      onClick={onClose}
                    >
                      Continue Adopting
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
