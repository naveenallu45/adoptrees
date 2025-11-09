'use client';

import { PhoneIcon, EnvelopeIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function IndividualSupportPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <PhoneIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-gray-600 mb-4">Call us at +91 9989479158</p>
            <a 
              href="tel:+919989479158"
              className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium text-center"
            >
              Call Now
            </a>
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
            <div className="mx-auto h-12 w-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-gray-600 mb-4">Send us an email at katikolakarthik@gmail.com</p>
            <a 
              href="mailto:katikolakarthik@gmail.com"
              className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium text-center"
            >
              Send Email
            </a>
          </div>
        </motion.div>
      </div>

      {/* FAQ Section */}
      <motion.div
        className="bg-white rounded-lg shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <motion.div
                  key={index}
                  className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-green-300 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 flex items-center justify-between hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all"
                  >
                    <h3 className="text-lg font-bold text-gray-900 text-left pr-4">{faq.question}</h3>
                    <motion.div
                      initial={false}
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      {isOpen ? (
                        <MinusIcon className="h-7 w-7 text-green-600" />
                      ) : (
                        <PlusIcon className="h-7 w-7 text-green-600" />
                      )}
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <p className="text-base text-gray-700 leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
