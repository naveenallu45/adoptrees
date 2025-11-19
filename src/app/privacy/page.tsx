export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24 md:pt-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Privacy Policy – Adoptrees
          </h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: November 2025</p>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            <p>
              At Adoptrees, we value your privacy and are committed to safeguarding your personal data. This Privacy
              Policy describes how we collect, use, share, and protect information provided by users.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
              <p>We collect information in the following categories:</p>

              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">A. Personal Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Billing information</li>
                <li>Gift recipient details (if applicable)</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">B. Transaction Data</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Payment method</li>
                <li>Transaction history</li>
                <li>Invoice & GST details (where required)</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">C. Tree-Related Data</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Adopted tree ID</li>
                <li>Plantation site</li>
                <li>Geo-location</li>
                <li>Photographs</li>
                <li>Update logs</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">D. Technical Data</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Device information</li>
                <li>Browser</li>
                <li>IP address</li>
                <li>Cookies</li>
                <li>Usage patterns</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Why We Collect Data</h2>
              <p>We use your data for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Processing Orders:</strong> tree adoption, plantation allocation, certificate generation.</li>
                <li><strong>Communication:</strong> updates, alerts, support, newsletters.</li>
                <li><strong>Platform Improvement:</strong> enhancing service quality, resolving bugs.</li>
                <li><strong>Legal Compliance:</strong> ensuring KYC, taxation, and audit regulations.</li>
                <li><strong>Analytics:</strong> measuring campaign success, understanding user behaviour.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Store & Protect Data</h2>
              <p>We implement:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>SSL encryption</li>
                <li>Firewalls</li>
                <li>Role-based data access</li>
                <li>Encrypted backups</li>
                <li>Secure server environments</li>
              </ul>
              <p className="mt-4">
                We do not store or directly access card numbers or banking login details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Sharing of Data</h2>
              <p>We only share data with trusted parties necessary for fulfilling your order:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Plantation partners</li>
                <li>Payment processors</li>
                <li>Certificate generation systems</li>
                <li>IT infrastructure providers</li>
              </ul>
              <p className="mt-4">
                We never sell or rent personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Cookies & Tracking</h2>
              <p>Cookies help us:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Personalize user experience</li>
                <li>Improve load speed</li>
                <li>Maintain session logins</li>
              </ul>
              <p className="mt-4">
                Users may disable cookies, but some features may not work properly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. User Rights</h2>
              <p>You may request:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Data Access</li>
                <li>Data Correction</li>
                <li>Data Deletion</li>
                <li>Opt-out of marketing emails</li>
              </ul>
              <p className="mt-4">
                Send requests to <a href="mailto:privacy@adoptrees.com" className="text-green-600 hover:text-green-700 underline">privacy@adoptrees.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Policy Updates</h2>
              <p>
                We reserve the right to update the Privacy Policy. Continued usage means acceptance of updates.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

