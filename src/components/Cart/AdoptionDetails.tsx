'use client';

import { useState } from 'react';
import { CartItem } from '@/contexts/CartContext';

interface AdoptionDetailsProps {
  item: CartItem;
  onUpdate: (updates: Partial<CartItem>) => void;
}

export default function AdoptionDetails({ item, onUpdate }: AdoptionDetailsProps) {
  const [showGiftDetails, setShowGiftDetails] = useState(false);

  const handleGiftButtonClick = () => {
    if (!item.adoptionType || item.adoptionType === 'self') {
      // Set as gift and show details
      onUpdate({ adoptionType: 'gift' });
      setShowGiftDetails(true);
    } else {
      // Toggle gift details visibility
      const willClose = showGiftDetails;
      setShowGiftDetails(!showGiftDetails);
      
      // If closing and no recipient name, revert to self
      if (willClose && (!item.recipientName || !item.recipientName.trim())) {
        setTimeout(() => {
          onUpdate({ 
            adoptionType: 'self',
            recipientEmail: '',
            giftMessage: ''
          });
        }, 100);
      }
    }
  };

  const handleRecipientNameChange = (value: string) => {
    const trimmedValue = value.trim();
    
    // Update recipient name
    onUpdate({ recipientName: value });
    
    // If recipient name is entered, ensure it's set as gift
    if (trimmedValue.length > 0) {
      if (item.adoptionType !== 'gift') {
        onUpdate({ adoptionType: 'gift' });
      }
    } else {
      // If recipient name is cleared and form is closed, revert to self
      if (!showGiftDetails && item.adoptionType === 'gift') {
        onUpdate({ 
          adoptionType: 'self',
          recipientEmail: '',
          giftMessage: ''
        });
      }
    }
  };

  const handleRecipientNameBlur = () => {
    // When field loses focus, check if empty and form is closed
    if (!item.recipientName || !item.recipientName.trim()) {
      if (!showGiftDetails && item.adoptionType === 'gift') {
        onUpdate({ 
          adoptionType: 'self',
          recipientEmail: '',
          giftMessage: ''
        });
      }
    } else {
      // If recipient name exists, ensure it's set as gift
      if (item.adoptionType !== 'gift') {
        onUpdate({ adoptionType: 'gift' });
      }
    }
  };


  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      {!item.adoptionType || item.adoptionType === 'self' ? (
        <button
          onClick={handleGiftButtonClick}
          type="button"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <span>As a Gift</span>
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleGiftButtonClick}
            type="button"
            className="flex items-center justify-between w-full px-4 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-800 rounded-lg font-medium transition-all duration-200 hover:from-green-100 hover:to-emerald-100"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span>As a Gift</span>
            </div>
            <svg 
              className={`w-4 h-4 text-green-600 transition-transform duration-200 ${showGiftDetails ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showGiftDetails && (
            <div className="space-y-4 bg-white p-4 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <h4 className="font-semibold text-gray-800">Gift Details</h4>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={item.recipientName || ''}
                  onChange={(e) => handleRecipientNameChange(e.target.value)}
                  onBlur={handleRecipientNameBlur}
                  placeholder="Enter recipient's name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
