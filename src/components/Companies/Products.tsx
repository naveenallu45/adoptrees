"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
}

export default function Products() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      const response = await fetch('/api/trees');
      const data = await response.json();
      
      if (data.success) {
        setTrees(data.data);
      } else {
        setError('Failed to load trees');
      }
    } catch (error) {
      console.error('Error fetching trees:', error);
      setError('Failed to load trees');
    } finally {
      setLoading(false);
    }
  };

  const handleInfoClick = (tree: Tree) => {
    alert(`Corporate Program: ${tree.name}\n\n${tree.info}\n\nOxygen Production: ${tree.oxygenKgs} kg/year\n\nThis premium corporate tree adoption program includes:\n• Dedicated tree maintenance\n• Monthly progress reports\n• CSR certification\n• Environmental impact tracking\n• Corporate sustainability branding\n\nPerfect for companies committed to environmental responsibility.`);
  };

  const handleAddToCart = (tree: Tree) => {
    alert(`Corporate Program: ${tree.name} (₹${tree.price})\n\nAdded to your corporate cart! Our team will contact you within 24 hours to discuss implementation and customization options for your corporate sustainability program.`);
  };

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading corporate trees...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (trees.length === 0) {
    return (
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">No corporate trees available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {trees.map((tree) => (
            <div key={tree._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200">
              {/* Tree Image */}
              <div className="relative aspect-square">
                <Image
                  src={tree.imageUrl}
                  alt={tree.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Product Information */}
              <div className="p-4">
                {/* Tree Name */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Corporate {tree.name}
                </h3>

                {/* Price and Oxygen Contribution */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-blue-600">₹{tree.price}</span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Oxygen</p>
                    <p className="text-sm font-semibold text-green-600">{tree.oxygenKgs} kg/year</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInfoClick(tree)}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
                  >
                    Info
                  </button>
                  <button
                    onClick={() => handleAddToCart(tree)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
