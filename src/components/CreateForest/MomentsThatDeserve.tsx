'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import TreeInfoButton from '@/components/TreeInfoButton';

const occasions = [
  {
    title: 'Birthday',
    description: 'A thoughtful, sustainable gift that grows with time. Make someone\'s birthday unforgettable with a gesture that brings life to the planet.',
    icon: '🎂'
  },
  {
    title: 'Wedding',
    description: 'Transform your celebration into something beautiful for the Earth. Plant trees as wedding favors and let your "yes" bloom into a greener future.',
    icon: '💍'
  },
  {
    title: 'Birth',
    description: 'Welcome new life with a forest of hope. Celebrate this precious beginning by planting trees that nurture a fairer, greener tomorrow.',
    icon: '👶'
  },
  {
    title: 'In Memory',
    description: 'Honor a loved one with a tribute that lives on. Planting a forest in their memory lets their story, love, and legacy continue to grow.',
    icon: '🌹'
  },
  {
    title: 'Create Your Occasion',
    description: 'Start a collective green gesture. Bring your group, family, or community together to create a forest and make a meaningful impact—together.',
    icon: '🌱'
  }
];

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
  treeType?: string;
  packageQuantity?: number;
  packagePrice?: number;
}

export default function MomentsThatDeserve() {
  const [showTrees, setShowTrees] = useState(false);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [addingTreeId, setAddingTreeId] = useState<string | null>(null);
  const [flyingTree, setFlyingTree] = useState<{ id: string; imageUrl: string; startPos: { x: number; y: number }; endPos: { x: number; y: number } } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const router = useRouter();
  const { addToCart } = useCart();
  const { data: session, status } = useSession();
  const isEligibleForestUser = useMemo(() => {
    const userType = session?.user?.userType;
    return userType === 'individual' || userType === 'company';
  }, [session]);

  useEffect(() => {
    if (showTrees) {
      fetchForestTrees();
    }
  }, [showTrees]);

  const fetchForestTrees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trees?type=forest', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      console.log('Forest trees API response:', data);
      if (data.success && data.data) {
        // Filter by isActive and ensure treeType is 'forest'
        const activeTrees = data.data.filter((tree: Tree) => {
          const isActive = tree.isActive !== false;
          const isForestType = tree.treeType === 'forest';
          console.log(`Tree ${tree.name}: isActive=${isActive}, treeType=${tree.treeType}, isForestType=${isForestType}`);
          return isActive && isForestType;
        });
        console.log('Active forest trees after filter:', activeTrees.length, activeTrees);
        setTrees(activeTrees);
      } else {
        console.error('API returned error:', data.error);
        toast.error(data.error || 'Failed to load trees. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching forest trees:', error);
      toast.error('Failed to load trees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForest = (occasionTitle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    // Set occasion (for "Create your occasion", user will enter it in cart)
    setSelectedOccasion(occasionTitle);
    setShowTrees(true);
    // Scroll to trees section
    setTimeout(() => {
      const treesSection = document.getElementById('forest-trees-section');
      if (treesSection) {
        treesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

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

  const handleAddToCart = useCallback((tree: Tree, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent event from bubbling to parent card
    if (status === 'loading') {
      toast.error('Hold on while we verify your account. Please try again in a moment.');
      return;
    }

    if (!session) {
      router.push('/login?redirect=/create-forest');
      return;
    }

    if (!isEligibleForestUser) {
      toast.error('Only individual or company accounts can create a forest.');
      return;
    }

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
        name: tree.name,
        price: tree.packagePrice || tree.price,
        imageUrl: tree.imageUrl,
        info: tree.info,
        oxygenKgs: tree.oxygenKgs,
        type: 'forest',
        adoptionType: 'self',
        packageQuantity: tree.packageQuantity,
        packagePrice: tree.packagePrice,
        occasion: selectedOccasion
      });
      
      // Complete animation and show toast
      setTimeout(() => {
        setFlyingTree(null);
        setAddingTreeId(null);
        toast.success(`${tree.name} added to cart! You can set your forest name during checkout.`);
      }, 800);
    }, 50);
  }, [addToCart, getCartIconPosition, session, router, selectedOccasion, status, isEligibleForestUser]);

  return (
    <>
      <section id="moments" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-gradient-to-b from-green-700 to-green-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8">
              Moments That Deserve to Take Root
            </h2>
            <div className="text-base sm:text-lg md:text-xl text-white/95 max-w-3xl mx-auto leading-relaxed space-y-4">
              <p>
                Some memories deserve more than a celebration — they deserve to grow.
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 max-w-7xl mx-auto">
            {occasions.map((occasion, index) => (
            <div
              key={index}
              className="bg-white/95 rounded-2xl px-6 py-5 sm:px-8 sm:py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex flex-col"
            >
                <div className="text-4xl sm:text-5xl mb-4 text-center">{occasion.icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold text-green-700 mb-4 text-center">
                  {occasion.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-6 flex-grow leading-relaxed">
                  {occasion.description}
                </p>
                <button
                  onClick={handleCreateForest(occasion.title)}
                  className="bg-green-600 text-white px-4 py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-green-700 transition-all duration-300 text-center border border-green-500"
                >
                  Create your Forest
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trees Section - Shows when Create Forest is clicked */}
      {showTrees && (
        <section id="forest-trees-section" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                Choose Trees for Your Forest
              </h2>
              {selectedOccasion && (
                <div className="mb-4 inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                  Occasion: {selectedOccasion}
                </div>
              )}
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                Select trees to add to your forest. You&apos;ll be able to name your forest during checkout.
              </p>
            </div>

            {session && !isEligibleForestUser && status === 'authenticated' && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-2xl px-6 py-4 mb-8 text-sm sm:text-base max-w-3xl mx-auto">
                Forest creation is available for individual and company accounts. Switch to an eligible account to keep growing greener moments.
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="mt-4 text-gray-600">Loading trees...</p>
              </div>
            ) : trees.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No forest trees available at the moment.</p>
                <p className="text-sm text-gray-500 mb-4">
                  Please contact admin to add forest trees, or browse individual trees.
                </p>
                <Link
                  href="/individuals"
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-300"
                >
                  Browse Individual Trees
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
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
                      />
                    </div>

                    {/* Product Information */}
                    <div className="p-3 sm:p-4 bg-gradient-to-b from-green-50 to-green-100">
                      {/* Tree Name */}
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3rem]">
                        {tree.name}
                      </h3>

                      {/* Price and Oxygen Contribution */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Price</p>
                          <span className="text-xl sm:text-2xl font-bold text-gray-900">
                            ₹{(tree.packagePrice || tree.price).toLocaleString()}
                          </span>
                          {tree.packageQuantity && tree.packageQuantity > 1 && (
                            <div className="mt-2 bg-green-600 text-white rounded-lg px-2.5 py-1.5 shadow-sm border border-green-700/30 inline-block">
                              <p className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">Package: {tree.packageQuantity} trees</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right sm:bg-white/80 sm:backdrop-blur-sm sm:rounded-lg px-2.5 py-1.5 sm:shadow-sm sm:border sm:border-green-200/50">
                          <p className="text-xs text-gray-600 mb-0.5 font-medium">Oxygen</p>
                          <p className="text-xs font-bold text-gray-900">{tree.oxygenKgs} kg/year</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <TreeInfoButton
                          treeId={tree._id}
                          className="px-3 py-2.5"
                          labelClassName="text-xs font-semibold"
                        />
                      <button
                        ref={(el) => { buttonRefs.current[tree._id] = el; }}
                        onClick={(e) => handleAddToCart(tree, e)}
                          disabled={addingTreeId === tree._id || (session && !isEligibleForestUser) || status === 'loading'}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                      >
                        {addingTreeId === tree._id ? (
                          <span className="flex items-center gap-1.5">
                            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Adding...</span>
                          </span>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
                            </svg>
                              <span>{session && !isEligibleForestUser ? 'Unavailable' : 'Add'}</span>
                          </>
                        )}
                      </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

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
    </>
  );
}
