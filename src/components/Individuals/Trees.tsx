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
    // Allow adding to cart without login - login will be required at checkout
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
  }, [addToCart]);

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-b from-white via-gray-50 to-green-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wider bg-green-50 px-4 py-2 rounded-full">
              Available Trees
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Choose Your Tree
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Select from our curated collection of trees and start your green journey today
          </p>
        </div>

        {error && (
          <div className="text-center mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-600 text-base font-medium">{error}</p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {trees.map((tree) => (
            <div 
              key={tree._id} 
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-green-300 transform hover:-translate-y-2"
            >
              {/* Tree Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <Image
                  src={tree.imageUrl}
                  alt={tree.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  quality={85}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Product Information */}
              <div className="p-4 sm:p-5">
                {/* Tree Name */}
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-green-700 transition-colors">
                  {tree.name}
                </h3>

                {/* Price and Oxygen Contribution */}
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Price</p>
                    <span className="text-xl sm:text-2xl font-bold text-green-600">₹{tree.price}</span>
                  </div>
                  <div className="text-right bg-green-50 rounded-lg px-2.5 py-1.5">
                    <p className="text-xs text-gray-600 mb-1">Oxygen Production</p>
                    <p className="text-xs sm:text-sm font-bold text-green-700">{tree.oxygenKgs} kg/year</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {session && session.user.userType !== 'individual' ? (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-not-allowed flex items-center justify-center"
                    >
                      Individual Only
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(tree)}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105"
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
