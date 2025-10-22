'use client';

import { QuestionMarkCircleIcon, ChatBubbleLeftRightIcon, PhoneIcon, EnvelopeIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function CompanySupportPage() {
  const [selectedCategory, setSelectedCategory] = useState('general');

  const supportCategories = [
    { id: 'general', name: 'General Support', icon: QuestionMarkCircleIcon },
    { id: 'trees', name: 'Tree Management', icon: QuestionMarkCircleIcon },
    { id: 'gifts', name: 'Corporate Gifts', icon: QuestionMarkCircleIcon },
    { id: 'account', name: 'Account & Billing', icon: QuestionMarkCircleIcon },
    { id: 'team', name: 'Team Management', icon: BuildingOfficeIcon },
  ];

  const faqs = [
    {
      question: "How do we manage multiple tree adoptions for our company?",
      answer: "You can adopt trees in bulk through our corporate dashboard. Each tree can be assigned to different team members or departments, and you'll receive consolidated reports."
    },
    {
      question: "Can we customize corporate gifts with our company branding?",
      answer: "Yes! We offer custom branding options for corporate gifts, including your company logo and personalized messages for recipients."
    },
    {
      question: "How do we track our company's environmental impact?",
      answer: "Your dashboard provides detailed analytics on CO₂ offset, oxygen production, and overall environmental impact. You can also generate reports for stakeholders."
    },
    {
      question: "Can we add team members to manage our tree portfolio?",
      answer: "Yes, you can invite team members to collaborate on tree management. Each member can have different permission levels based on their role."
    },
    {
      question: "Do you offer corporate sustainability consulting?",
      answer: "Yes, we provide sustainability consulting services to help companies develop comprehensive environmental strategies beyond tree adoption."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Corporate Support</h1>
        <p className="mt-2 text-gray-600">
          Get help with your corporate tree adoption program
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Priority Support</h3>
            <p className="text-gray-600 mb-4">Dedicated corporate support team</p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Start Chat
            </button>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <PhoneIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-gray-600 mb-4">Call us at +1 (555) 123-4567</p>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
              Call Now
            </button>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-gray-600 mb-4">corporate@adoptrees.com</p>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
              Send Email
            </button>
          </div>
        </motion.div>
      </div>

      {/* Support Categories */}
      <motion.div
        className="bg-white rounded-lg shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Support Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {supportCategories.map((category) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-medium text-gray-900">{category.name}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        className="bg-white rounded-lg shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
