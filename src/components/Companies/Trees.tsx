"use client";

import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

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
    <section className="py-8 sm:py-12 md:py-16 lg:py-10 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {error && (
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <p className="text-red-600 text-sm sm:text-base">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {trees.map((tree) => (
              <div key={tree._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200">
                {/* Tree Image */}
                <div className="relative aspect-square">
                  <Image
                    src={tree.imageUrl}
                    alt={tree.name}
                    fill
                    className="object-cover"
                    loading="lazy"
                    quality={85}
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>

                {/* Product Information */}
                <div className="p-3 sm:p-4">
                  {/* Tree Name */}
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2">
                     {tree.name}
                  </h3>

                  {/* Price and Package Information */}
                  <div className="mb-3 sm:mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-black-500">
                        {tree.packagePrice ? `₹${tree.packagePrice}` : `₹${tree.price}`}
                      </span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Oxygen</p>
                        <p className="text-xs sm:text-sm font-semibold text-green-600">{tree.oxygenKgs} kg/year</p>
                      </div>
                    </div>
                    {tree.packageQuantity && tree.packageQuantity > 1 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <p className="text-xs text-blue-700 font-medium">
                          Package: {tree.packageQuantity} trees
                          {tree.packagePrice && (
                            <span className="ml-1 sm:ml-2">
                              (₹{Math.round(tree.packagePrice / tree.packageQuantity)} per tree)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {!session ? (
                      <a
                        href="/login?redirect=/companies"
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        Add to Cart
                      </a>
                    ) : session.user.userType !== 'company' ? (
                      <button
                        disabled
                        className="w-full bg-gray-400 text-white px-3 py-2 rounded text-xs sm:text-sm font-medium cursor-not-allowed flex items-center justify-center"
                      >
                        Company Only
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(tree)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center"
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
