'use client';

import { QuestionMarkCircleIcon, ChatBubbleLeftRightIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function IndividualSupportPage() {
  const [selectedCategory, setSelectedCategory] = useState('general');

  const supportCategories = [
    { id: 'general', name: 'General Support', icon: QuestionMarkCircleIcon },
    { id: 'trees', name: 'Tree Management', icon: QuestionMarkCircleIcon },
    { id: 'gifts', name: 'Gift Issues', icon: QuestionMarkCircleIcon },
    { id: 'account', name: 'Account Issues', icon: QuestionMarkCircleIcon },
  ];

  const faqs = [
    {
      question: "How do I adopt a tree?",
      answer: "You can adopt a tree by browsing our tree catalog and selecting the tree you'd like to adopt. Click on 'Adopt Tree' and follow the checkout process."
    },
    {
      question: "Can I track my adopted tree's growth?",
      answer: "Yes! Once you adopt a tree, you'll receive regular updates about its growth, location, and environmental impact through your dashboard."
    },
    {
      question: "How do I send a tree as a gift?",
      answer: "Go to the Gifts section in your dashboard, select the type of gift you want to send, and provide the recipient's details. They'll receive a beautiful gift notification."
    },
    {
      question: "What happens to my adopted tree?",
      answer: "Your adopted tree is planted and maintained by our partner organizations. You'll receive updates and can even visit the tree if it's in an accessible location."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
        <p className="mt-2 text-gray-600">
          Get help with your tree adoption journey
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
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-gray-600 mb-4">Get instant help from our support team</p>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
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
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <PhoneIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-gray-600 mb-4">Call us at +1 (555) 123-4567</p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
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
            <p className="text-gray-600 mb-4">Send us an email at support@adoptrees.com</p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supportCategories.map((category) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCategory === category.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
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
