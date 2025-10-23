"use client";

import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
  packageQuantity?: number;
  packagePrice?: number;
}

interface TreesProps {
  initialTrees?: Tree[];
}

export default function Trees({ initialTrees = [] }: TreesProps) {
  const trees = initialTrees;
  const error = trees.length === 0 ? 'No trees available' : null;
  const { addToCart } = useCart();
  const { data: session } = useSession();

  const handleInfoClick = (tree: Tree) => {
    Swal.fire({
      title: `Corporate Program: ${tree.name}`,
      html: `
        <div class="text-left">
          <p class="mb-4">${tree.info}</p>
          <p class="mb-4"><strong>Oxygen Production:</strong> ${tree.oxygenKgs} kg/year</p>
          <p class="mb-4">This premium corporate tree adoption program includes:</p>
          <ul class="list-disc list-inside mb-4 space-y-1">
            <li>Dedicated tree maintenance</li>
            <li>Monthly progress reports</li>
            <li>CSR certification</li>
            <li>Environmental impact tracking</li>
            <li>Corporate sustainability branding</li>
          </ul>
          <p class="text-green-600 font-semibold">Perfect for companies committed to environmental responsibility.</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Got it',
      confirmButtonColor: '#10b981',
      width: '600px'
    });
  };

  const handleAddToCart = (tree: Tree) => {
    // Check if user is logged in
    if (!session) {
      toast.error('Please login to add items to cart');
      return;
    }

    // Check if user is a company user
    if (session.user.userType !== 'company') {
      toast.error('Only company users can add corporate trees to cart');
      return;
    }

    addToCart({
      id: tree._id,
      name: `Corporate ${tree.name}`,
      price: tree.packagePrice || tree.price,
      imageUrl: tree.imageUrl,
      info: tree.info,
      oxygenKgs: tree.oxygenKgs,
      type: 'company',
      packageQuantity: tree.packageQuantity,
      packagePrice: tree.packagePrice
    });
    const displayPrice = tree.packagePrice || tree.price;
    toast.success(`Corporate Program: ${tree.name} (₹${displayPrice}) added to cart!`);
  };


  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4">
        {error && (
          <div className="text-center mb-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
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

                  {/* Price and Package Information */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-2xl font-bold text-blue-600">
                        {tree.packagePrice ? `₹${tree.packagePrice}` : `₹${tree.price}`}
                      </span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Oxygen</p>
                        <p className="text-sm font-semibold text-green-600">{tree.oxygenKgs} kg/year</p>
                      </div>
                    </div>
                    {tree.packageQuantity && tree.packageQuantity > 1 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <p className="text-xs text-blue-700 font-medium">
                          Package: {tree.packageQuantity} trees
                          {tree.packagePrice && (
                            <span className="ml-2">
                              (₹{Math.round(tree.packagePrice / tree.packageQuantity)} per tree)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInfoClick(tree)}
                      className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
                    >
                      Info
                    </button>
                    {!session ? (
                      <a
                        href="/login?redirect=/companies"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        Login to Add
                      </a>
                    ) : session.user.userType !== 'company' ? (
                      <button
                        disabled
                        className="flex-1 bg-gray-400 text-white px-3 py-2 rounded text-sm font-medium cursor-not-allowed flex items-center justify-center"
                      >
                        Company Only
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(tree)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
    </section>
  );
}
