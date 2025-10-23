'use client';

import { useState } from 'react';
import { CartItem } from '@/contexts/CartContext';

interface AdoptionDetailsProps {
  item: CartItem;
  onUpdate: (updates: Partial<CartItem>) => void;
}

export default function AdoptionDetails({ item, onUpdate }: AdoptionDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAdoptionTypeChange = (type: 'self' | 'gift') => {
    onUpdate({ 
      adoptionType: type,
      ...(type === 'self' ? { recipientName: '', recipientEmail: '', giftMessage: '' } : {})
    });
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">
            Adoption Details
          </span>
          {item.adoptionType === 'gift' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
              Gift
            </span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-lg">
          {/* Adoption Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Who is this tree for?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAdoptionTypeChange('self')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  item.adoptionType === 'self'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">For Myself</span>
                </div>
              </button>
              <button
                onClick={() => handleAdoptionTypeChange('gift')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  item.adoptionType === 'gift'
                    ? 'border-pink-500 bg-pink-50 text-pink-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <span className="font-medium">As a Gift</span>
                </div>
              </button>
            </div>
          </div>

          {/* Gift Details */}
          {item.adoptionType === 'gift' && (
            <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <h4 className="font-semibold text-gray-800">Gift Details</h4>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={item.recipientName || ''}
                  onChange={(e) => onUpdate({ recipientName: e.target.value })}
                  placeholder="Enter recipient's name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={item.recipientEmail || ''}
                  onChange={(e) => onUpdate({ recipientEmail: e.target.value })}
                  placeholder="Enter recipient's email (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Personal Message
                </label>
                <textarea
                  value={item.giftMessage || ''}
                  onChange={(e) => onUpdate({ giftMessage: e.target.value })}
                  placeholder="Write a personal message for your loved one..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
