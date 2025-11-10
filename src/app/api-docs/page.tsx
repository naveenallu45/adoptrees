'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    // Load the OpenAPI spec
    fetch('/swagger.json')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => {
        console.error('Failed to load OpenAPI spec:', err);
      });
  }, []);

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Adoptrees API Documentation</h1>
          <p className="text-gray-600">
            Complete API documentation for all endpoints. Use the interactive interface below to explore and test endpoints.
          </p>
        </div>
        <SwaggerUI spec={spec} />
      </div>
    </div>
  );
}

