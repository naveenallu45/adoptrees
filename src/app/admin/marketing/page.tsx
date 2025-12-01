'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon, EnvelopeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
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
  const [emailLimit, setEmailLimit] = useState<number>(100);

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
          <li><strong>Limit:</strong> Up to ${emailLimit} users</li>
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
          limit: emailLimit
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
                <motion.button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${selectedTemplate === template.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                    }
                  `}
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
    </div>
  );
}

