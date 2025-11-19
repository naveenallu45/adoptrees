export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24 md:pt-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Refund & Cancellation Policy – Adoptrees
          </h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: November 2025</p>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            <p>
              Adoptrees works with high transparency. We understand that users may sometimes need refunds or
              cancellations.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Cancellation Policy</h2>
              <p>Cancellations are accepted under these conditions:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Request placed within 1 hour of the order</li>
                <li>Plantation has NOT been allocated</li>
                <li>No digital certificate has been created</li>
              </ul>
              <p className="mt-4">
                Once a tree is assigned or planted, cancellation is not possible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Refund Policy</h2>
              <p>Refunds are processed when:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Duplicate payments occur</li>
                <li>Payment fails but money is deducted</li>
                <li>Plantation allocation is not possible due to operational issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Refund Timelines (Strictly Followed)</h2>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-green-50">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Payment Method</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Refund Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">UPI / Wallets</td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">2–3 business days</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">Net Banking</td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">3–5 business days</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">Debit/Credit Card</td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">5–7 business days</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">Corporate Orders</td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">7–15 business days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4">
                Refunds are always initiated back to the original payment source.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Non-refundable Situations</h2>
              <p>Refunds cannot be provided if:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Plantation process has started</li>
                <li>Adoption certificate already issued</li>
                <li>Bulk orders confirmed</li>
                <li>Custom naming/branding completed</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. How to Request Refund</h2>
              <p>Write to us at <a href="mailto:refunds@adoptrees.com" className="text-green-600 hover:text-green-700 underline">refunds@adoptrees.com</a> with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Order ID</li>
                <li>Email ID</li>
                <li>Reason for refund</li>
                <li>Payment screenshot</li>
              </ul>
              <p className="mt-4">
                Our team will respond within 24–48 hours.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

