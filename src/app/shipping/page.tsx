export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24 md:pt-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Shipping & Delivery Policy – Adoptrees
          </h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: November 2025</p>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            <p>
              Adoptrees deals primarily in digital deliveries, not physical shipping.
            </p>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Digital Deliverables</h2>
              <p>Upon adoption or gifting, the user receives:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Digital Adoption Certificate (PDF)</li>
                <li>Tree ID</li>
                <li>Dashboard Access</li>
                <li>Location & photograph updates</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Delivery Timelines</h2>
              
              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">A. Certificate Delivery</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Minimum:</strong> 1 hour</li>
                <li><strong>Maximum:</strong> 24 hours</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">B. Tree Plantation & Location Update</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Minimum:</strong> 3 days</li>
                <li><strong>Maximum:</strong> 10 days</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">C. First Photograph Upload</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Minimum:</strong> 7 days</li>
                <li><strong>Maximum:</strong> 20 days</li>
              </ul>

              <p className="mt-4">
                Delays may occur in exceptional weather or environmental conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. No Physical Shipping</h2>
              <p>
                Since users are not receiving a plant physically, no logistics or courier services are involved. All updates
                happen digitally.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

