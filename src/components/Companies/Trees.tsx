"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


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
  const [trees, setTrees] = useState<Tree[]>(initialTrees);
  
  // Fetch trees dynamically to get latest data
  useEffect(() => {
    const fetchTrees = async () => {
      try {
        const response = await fetch('/api/trees?type=company', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        if (data.success && data.data) {
          setTrees(data.data.filter((tree: Tree) => tree.isActive));
        }
      } catch (error) {
        console.error('Error fetching trees:', error);
        // Keep current trees on error
      }
    };
    
    // Fetch on mount and set up periodic refresh for instant updates
    fetchTrees();
    const interval = setInterval(fetchTrees, 2000); // Refresh every 2 seconds for instant updates
    return () => clearInterval(interval);
  }, []);
  
  const error = trees.length === 0 ? 'No trees available' : null;
  const { addToCart } = useCart();
  const { data: session } = useSession();

  const [addingTreeId, setAddingTreeId] = useState<string | null>(null);
  const [flyingTree, setFlyingTree] = useState<{ id: string; imageUrl: string; startPos: { x: number; y: number }; endPos: { x: number; y: number } } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());


  const getCartIconPosition = useCallback(() => {
    // Check if mobile or desktop
    const isMobile = window.innerWidth < 768;
    
    // Try to find the cart icon in the navbar - prioritize mobile/desktop specific selectors
    const cartButtonId = isMobile ? 'mobile-cart-button' : 'desktop-cart-button';
    const cartMarker = document.getElementById(cartButtonId);
    
    // If marker found, get its parent Link element
    let cartLink: HTMLElement | null = null;
    if (cartMarker) {
      cartLink = cartMarker.closest('a[href="/cart"]') as HTMLElement;
    }
    
    // Fallback to any cart link if specific ID not found
    if (!cartLink) {
      cartLink = document.querySelector('a[href="/cart"]') as HTMLElement;
    }
    
    if (cartLink) {
      const rect = cartLink.getBoundingClientRect();
      // Account for scroll position and get center of button
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    
    // Fallback based on screen size
    if (isMobile) {
      // Mobile: cart is typically in top right, accounting for navbar height
      return {
        x: window.innerWidth - 40, // Right edge minus half button width
        y: 40 // Approximate center of mobile navbar
      };
    } else {
      // Desktop: cart is in top right
    return {
        x: window.innerWidth - 100,
        y: 50
    };
    }
  }, []);

  const handleAddToCart = (tree: Tree, event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    const endPos = getCartIconPosition();

    setAddingTreeId(tree._id);
    setFlyingTree({
      id: tree._id,
      imageUrl: tree.imageUrl,
      startPos,
      endPos
    });


    // Add to cart after animation starts
    setTimeout(() => {
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
      
      // Complete animation and show toast
      setTimeout(() => {
        setFlyingTree(null);
        setAddingTreeId(null);
        const displayPrice = tree.packagePrice || tree.price;
        toast.success(`Corporate Program: ${tree.name} (₹${displayPrice}) added to cart!`);
      }, 800);
    }, 50);

    
    // Trigger animation
    setAddedItems(prev => new Set(prev).add(tree._id));
    setTimeout(() => {
      setAddedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(tree._id);
        return newSet;
      });
    }, 2000);
    
    const displayPrice = tree.packagePrice || tree.price;
    toast.success(`Corporate Program: ${tree.name} (₹${displayPrice}) added to cart!`);

  };

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-b from-white via-gray-50 to-green-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wider bg-green-50 px-4 py-2 rounded-full">
              Corporate Programs
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Choose Your Corporate Program
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Select from our curated corporate tree adoption programs and enhance your sustainability initiatives
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
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-green-400"
            >
              {/* Tree Image */}
              <div className="relative aspect-[4/4] overflow-hidden bg-white">
                <Image
                  src={tree.imageUrl}
                  alt={tree.name}
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  quality={85}
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                />
              </div>

              {/* Product Information */}
              <div className="p-3 sm:p-4 bg-gradient-to-b from-green-50 to-green-100">
                {/* Tree Name */}
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3rem]">
                  {tree.name}
                </h3>

                {/* Price and Package Information */}
                <div className="mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1 font-medium">Price</p>
                      <span className="text-xl sm:text-2xl font-bold text-gray-900">
                        {tree.packagePrice ? `₹${tree.packagePrice}` : `₹${tree.price}`}
                      </span>
                    </div>
                    <div className="text-right bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm border border-green-200/50">
                      <p className="text-xs text-gray-600 mb-0.5 font-medium">Oxygen</p>
                      <p className="text-xs font-bold text-gray-900">{tree.oxygenKgs} kg/year</p>
                    </div>
                  </div>
                  {tree.packageQuantity && tree.packageQuantity > 1 && (
                    <div className="bg-white/60 backdrop-blur-sm border border-green-200/50 rounded-lg p-2 mt-2">
                      <p className="text-xs text-gray-700 font-medium">
                        Package: {tree.packageQuantity} trees
                        {tree.packagePrice && (
                          <span className="ml-2 text-gray-600">
                            (₹{Math.round(tree.packagePrice / tree.packageQuantity)} per tree)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Info Button */}
                  <Link
                    href={`/trees/${tree._id}`}
                    className="flex-shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-3 py-2.5 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 active:scale-95 font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold">Info</span>
                  </Link>

                  {/* Add to Cart Button */}
                  {session && session.user.userType !== 'company' ? (
                    <button
                      disabled
                      className="flex-1 bg-gray-300 text-gray-500 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-not-allowed flex items-center justify-center"
                    >
                      Company Only
                    </button>
                  ) : (
                    <button
                      ref={(el) => { buttonRefs.current[tree._id] = el; }}
                      onClick={(e) => handleAddToCart(tree, e)}
                      disabled={addingTreeId === tree._id}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {addingTreeId === tree._id ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-xs">Adding...</span>
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1.5 transition-all duration-300 ${
                          addedItems.has(tree._id) ? 'text-white' : 'text-white'
                        }`}>
                          {addedItems.has(tree._id) ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-xs font-semibold">Added!</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
                              </svg>
                              <span className="text-xs font-semibold">Add</span>
                            </>
                          )}
                        </span>
                      )}
                      {addedItems.has(tree._id) && (
                        <div className="absolute inset-0 bg-green-400/30 animate-pulse rounded-lg"></div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flying Tree Animation */}
      <AnimatePresence>
        {flyingTree && (
          <motion.div
            className="fixed z-[99999] pointer-events-none"
            style={{
              left: `${flyingTree.startPos.x}px`,
              top: `${flyingTree.startPos.y}px`,
            }}
            initial={{
              x: -40,
              y: -40,
              scale: 1,
              opacity: 1,
              rotate: 0
            }}
            animate={{
              x: flyingTree.endPos.x - flyingTree.startPos.x - 40,
              y: flyingTree.endPos.y - flyingTree.startPos.y - 40,
              scale: 0.3,
              opacity: 0.9,
              rotate: 360
            }}
            exit={{
              opacity: 0,
              scale: 0
            }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.1, 0.25, 1]
            }}
          >
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-green-500 shadow-2xl bg-white">
              <Image
                src={flyingTree.imageUrl}
                alt="Flying tree"
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
