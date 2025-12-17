'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperAirplaneIcon, EnvelopeIcon, ChartBarIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'adopt-trees',
    name: 'Adopt Trees',
    description: 'Encourage users to adopt more trees and create impact',
    preview: '🌿 Plant More Trees, Create More Impact!'
  },
  {
    id: 'create-forest',
    name: 'Create Forest',
    description: 'Promote forest creation for special occasions',
    preview: '🌳 Create a Forest for Your Special Moments'
  },
  {
    id: 'forest',
    name: 'Forest Growth',
    description: 'Encourage users to grow and manage their forest',
    preview: '🌲 Grow Your Forest: Watch Your Legacy Flourish'
  },
  {
    id: 'tree-growth',
    name: 'Tree Growth Update',
    description: 'Remind users to check their tree growth progress',
    preview: '💚 Your Trees Are Growing Strong!'
  },
  {
    id: 'green-revolution',
    name: 'Green Revolution',
    description: 'Inspire users to join the green movement',
    preview: '🌱 Join the Green Revolution'
  },
  {
    id: 'gift-tree',
    name: 'Gift Tree',
    description: 'Promote gifting trees for special occasions',
    preview: '🎁 Gift a Tree, Gift a Future'
  },
  {
    id: 'environmental-impact',
    name: 'Environmental Impact',
    description: 'Show users their environmental impact',
    preview: '🌿 Your Impact on the Environment'
  },
  {
    id: 'christmas',
    name: 'Christmas Campaign',
    description: 'Seasonal campaign for Christmas gifting and impact',
    preview: '🎄 This Christmas, Plant Hope with Every Tree'
  },
  {
    id: 'new-year',
    name: 'New Year Campaign',
    description: 'Kick off the New Year with a green resolution',
    preview: '✨ New Year, Greener You: Start with a Tree'
  }
];

interface MarketingStats {
  totalUsers: number;
  usersWithEmails: number;
  usersWithoutEmails: number;
  individualUsers: number;
  companyUsers: number;
  lastMarketingEmailSent: string | null;
}

export default function MarketingManagement() {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('adopt-trees');
  const [userType, setUserType] = useState<'all' | 'individual' | 'company'>('all');
  const [adoptionStatus, setAdoptionStatus] = useState<'all' | 'adopted' | 'nonAdopted'>('all');
  const [emailLimit, setEmailLimit] = useState<number>(100);
  const [viewingTemplate, setViewingTemplate] = useState<{ id: string; userType: 'individual' | 'company' } | null>(null);
  const [templateData, setTemplateData] = useState<{ title: string; content: string; cta: string; ctaLink: string } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/marketing/send?userType=all');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!viewingTemplate) {
        setTemplateData(null);
        return;
      }

      try {
        setLoadingTemplate(true);
        const response = await fetch(
          `/api/admin/marketing/template?templateId=${viewingTemplate.id}&userType=${viewingTemplate.userType}&displayName=John Doe`
        );
        const result = await response.json();
        
        if (result.success) {
          setTemplateData(result.data);
        } else {
          toast.error(result.error || 'Failed to load template');
          setViewingTemplate(null);
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        toast.error('Failed to load template');
        setViewingTemplate(null);
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchTemplate();
  }, [viewingTemplate]);

  const handleSendEmails = async () => {
    if (!selectedTemplate) {
      toast.error('Please select an email template');
      return;
    }

    const confirmed = await Swal.fire({
      title: 'Send Marketing Emails?',
      html: `
        <p>You are about to send marketing emails to:</p>
        <ul style="text-align: left; margin: 15px 0;">
          <li><strong>Template:</strong> ${emailTemplates.find(t => t.id === selectedTemplate)?.name}</li>
          <li><strong>User Type:</strong> ${userType === 'all' ? 'All Users' : userType === 'individual' ? 'Individual Users' : 'Company Users'}</li>
          <li><strong>Segment:</strong> ${
            adoptionStatus === 'all'
              ? 'All users'
              : adoptionStatus === 'adopted'
                ? 'Adopted users (with at least one paid order)'
                : 'Non-adopted users (no paid orders)'
          }</li>
          <li><strong>Limit:</strong> Up to ${emailLimit} users</li>
          ${couponCode ? `<li><strong>Coupon Code:</strong> ${couponCode}</li>` : ''}
          ${discount ? `<li><strong>Discount:</strong> ${discount}${discountType === 'percentage' ? '%' : '₹'}</li>` : ''}
        </ul>
        <p style="color: #dc2626; font-weight: 600;">This action cannot be undone!</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#dc2626',
      confirmButtonText: 'Yes, Send Emails',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    try {
      setSending(true);
      const progressToast = toast.loading('Sending marketing emails...');

      const response = await fetch('/api/admin/marketing/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          userType,
          adoptionStatus,
          limit: emailLimit,
          couponCode: couponCode || undefined,
          discount: discount ? parseFloat(discount) : undefined,
          discountType: discount ? discountType : undefined
        }),
      });

      const result = await response.json();
      toast.dismiss(progressToast);

      if (result.success) {
        toast.success(
          `Successfully sent ${result.data.emailsSent} emails! ${result.data.emailsFailed > 0 ? `${result.data.emailsFailed} failed.` : ''}`,
          { duration: 5000 }
        );
        // Refresh stats
        await fetchStats();
      } else {
        toast.error(result.error || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketing Emails</h1>
          <p className="text-gray-600 mt-1">Send marketing emails to registered users</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Sent To</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.usersWithEmails}</p>
              </div>
              <EnvelopeIcon className="h-8 w-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.usersWithoutEmails}</p>
              </div>
              <EnvelopeIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Email Sent</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatDate(stats.lastMarketingEmailSent)}
                </p>
              </div>
              <PaperAirplaneIcon className="h-8 w-8 text-purple-500" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Send Email Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Send Marketing Email</h2>

        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Email Template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emailTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`
                    p-4 rounded-lg border-2 transition-all relative
                    ${selectedTemplate === template.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                    }
                  `}
                >
                  <motion.button
                    onClick={() => setSelectedTemplate(template.id)}
                    className="w-full text-left"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      {selectedTemplate === template.id && (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                    <p className="text-xs text-gray-500 italic">{template.preview}</p>
                  </motion.button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingTemplate({ id: template.id, userType: 'individual' });
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                    View Template
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target User Type
            </label>
            <div className="flex gap-4">
              {(['all', 'individual', 'company'] as const).map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value={type}
                    checked={userType === type}
                    onChange={(e) => setUserType(e.target.value as 'all' | 'individual' | 'company')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {type === 'all' ? 'All Users' : type === 'individual' ? 'Individual Users' : 'Company Users'}
                  </span>
                </label>
              ))}
            </div>
            {stats && (
              <p className="text-xs text-gray-500 mt-2">
                {userType === 'all' && `Total: ${stats.totalUsers} users`}
                {userType === 'individual' && `Total: ${stats.individualUsers} users`}
                {userType === 'company' && `Total: ${stats.companyUsers} users`}
              </p>
            )}
          </div>

          {/* Adoption Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Segment
            </label>
            <div className="flex gap-4">
              {(['all', 'adopted', 'nonAdopted'] as const).map((segment) => (
                <label key={segment} className="flex items-center">
                  <input
                    type="radio"
                    name="adoptionStatus"
                    value={segment}
                    checked={adoptionStatus === segment}
                    onChange={(e) =>
                      setAdoptionStatus(e.target.value as 'all' | 'adopted' | 'nonAdopted')
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    {segment === 'all'
                      ? 'All users'
                      : segment === 'adopted'
                        ? 'Adopted users'
                        : 'Non-adopted users'}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Adopted users have at least one paid, non-cancelled order. Non-adopted users have no paid orders.
            </p>
          </div>

          {/* Email Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Limit (Max 1000)
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={emailLimit}
              onChange={(e) => setEmailLimit(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of users to send emails to (to avoid rate limiting)
            </p>
          </div>

          {/* Coupon Code and Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coupon Code (Optional)
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g., GREEN2024"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter coupon code to include in email
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount (Optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'amount')}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                >
                  <option value="percentage">%</option>
                  <option value="amount">₹</option>
                </select>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 100'}
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {discountType === 'percentage' ? 'Discount percentage (0-100)' : 'Discount amount in rupees'}
              </p>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <motion.button
              onClick={handleSendEmails}
              disabled={sending || !selectedTemplate}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white
                ${sending || !selectedTemplate
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                }
                transition-all shadow-lg hover:shadow-xl
              `}
              whileHover={!sending && selectedTemplate ? { scale: 1.05 } : {}}
              whileTap={!sending && selectedTemplate ? { scale: 0.95 } : {}}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
              {sending ? 'Sending...' : 'Send Marketing Emails'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Template View Modal */}
      <AnimatePresence>
        {viewingTemplate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-white/30"
              onClick={() => setViewingTemplate(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {emailTemplates.find(t => t.id === viewingTemplate.id)?.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {viewingTemplate.userType === 'individual' ? 'Individual User Template' : 'Company User Template'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Toggle between Individual and Company */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewingTemplate({ ...viewingTemplate, userType: 'individual' })}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          viewingTemplate.userType === 'individual'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Individual
                      </button>
                      <button
                        onClick={() => setViewingTemplate({ ...viewingTemplate, userType: 'company' })}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          viewingTemplate.userType === 'company'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Company
                      </button>
                    </div>
                    <button
                      onClick={() => setViewingTemplate(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingTemplate ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    </div>
                  ) : templateData ? (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
                        {/* Email Subject */}
                        <div className="mb-6 pb-4 border-b border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Subject:</p>
                          <p className="text-lg font-semibold text-gray-900">{templateData.title}</p>
                        </div>

                        {/* Email Content Preview */}
                        <div
                          className="email-preview"
                          dangerouslySetInnerHTML={{ __html: templateData.content }}
                          style={{
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}
                        />

                        {/* CTA Button Preview */}
                        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                          <a
                            href={templateData.ctaLink}
                            className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                          >
                            {templateData.cta}
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Failed to load template</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

