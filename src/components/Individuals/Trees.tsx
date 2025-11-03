"use client";

import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { memo, useCallback } from 'react';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
}

interface TreesProps {
  initialTrees?: Tree[];
}

const Trees = memo(function Trees({ initialTrees = [] }: TreesProps) {
  const trees = initialTrees;
  const error = trees.length === 0 ? 'No trees available' : null;
  const { addToCart } = useCart();
  const { data: session } = useSession();

  

  const handleAddToCart = useCallback((tree: Tree) => {
    // Check if user is logged in
    if (!session) {
      toast.error('Please login to add items to cart');
      return;
    }

    // Check if user is an individual user
    if (session.user.userType !== 'individual') {
      toast.error('Only individual users can add individual trees to cart');
      return;
    }

    addToCart({
      id: tree._id,
      name: tree.name,
      price: tree.price,
      imageUrl: tree.imageUrl,
      info: tree.info,
      oxygenKgs: tree.oxygenKgs,
      type: 'individual',
      adoptionType: 'self' // Default to self, can be changed in cart
    });
    toast.success(`${tree.name} (₹${tree.price}) added to cart!`);
  }, [session, addToCart]);


  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-green-50">
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

                  {/* Price and Oxygen Contribution */}
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-black-600">₹{tree.price}</span>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Oxygen</p>
                      <p className="text-xs sm:text-sm font-semibold text-green-600">{tree.oxygenKgs} kg/year</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {!session ? (
                      <a
                        href="/login?redirect=/individuals"
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        Add to Cart
                      </a>
                    ) : session.user.userType !== 'individual' ? (
                      <button
                        disabled
                        className="w-full bg-gray-400 text-white px-3 py-2 rounded text-xs sm:text-sm font-medium cursor-not-allowed flex items-center justify-center"
                      >
                        Individual Only
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
});

export default Trees;
