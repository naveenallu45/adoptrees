'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
  treeType: 'individual' | 'company';
  packageQuantity?: number;
  packagePrice?: number;
  scientificSpecies?: string;
  speciesInfoAvailable?: boolean;
  co2?: number;
  foodSecurity?: number;
  economicDevelopment?: number;
  co2Absorption?: number;
  environmentalProtection?: number;
  localUses?: string[];
}

// Scientific names mapping (fallback)
const scientificNames: Record<string, string> = {
  'banana': 'Musa x paradisiaca',
  'mango': 'Mangifera indica',
  'neem': 'Azadirachta indica',
  'banyan': 'Ficus benghalensis',
  'peepal': 'Ficus religiosa',
  'coconut': 'Cocos nucifera',
  'sandalwood': 'Santalum album',
  'macadamia': 'Macadamia integrifolia',
  'avocado': 'Persea americana',
};

// Get scientific name from tree name
const getScientificName = (treeName: string): string => {
  const lowerName = treeName.toLowerCase();
  for (const [key, value] of Object.entries(scientificNames)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  return 'Species information available upon request';
};

// Local uses descriptions
const localUsesDescriptions: Record<string, string> = {
  'Natural pesticide': 'Its leaves and fruits naturally repel pests and diseases, offering a safe, chemical-free way to protect plants.',
  'Soil': 'With its nitrogen-fixing abilities and deep roots, it nourishes the soil, protects it from erosion, and restores fertility.',
  'Fence': 'Acting as a natural barrier, it shields crops and creates cool, shaded spaces for animals to rest.',
  'Anti-wind': 'It stands strong against harsh winds, safeguarding tender plants and helping the soil retain precious moisture.',
  'Cosmetics': 'From its blossoms to its leaves, valuable extracts are used to create gentle, earth-derived beauty products.',
  'Biodiversity': 'This tree supports the return of birds, insects, and small animals, helping restore balance to the entire ecosystem.',
  'Consumption and sales': 'Its fruits, seeds, and leaves provide nourishment for farming families and can also be sold, supporting local markets.',
  'Livestock': 'Its fresh or dried leaves serve as a nutritious feed for livestock, helping farmers care for their animals naturally.',
  'Medicine': 'Its leaves, roots, bark, and fruits have long been used in traditional remedies — offering healing straight from nature.'
};

// Calculate CO2 absorption (rough estimate: 1kg oxygen ≈ 1.4kg CO2)
const calculateCO2 = (oxygenKgs: number): number => {
  return Math.round(oxygenKgs * 1.4 * 10); // 10 years estimate
};

export default function TreeInfoPage() {
  const params = useParams();
  const _router = useRouter();
  const treeId = params.id as string;
  const { addToCart } = useCart();
  const { data: session } = useSession();

  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [flyingTree, setFlyingTree] = useState<{ id: string; imageUrl: string; startPos: { x: number; y: number }; endPos: { x: number; y: number } } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trees/${treeId}`);
        const result = await response.json();

        if (result.success) {
          setTree(result.data);
          setSelectedImage(result.data.imageUrl || '');
        } else {
          setError(result.error || 'Tree not found');
        }
      } catch (_error) {
        setError('Failed to fetch tree details');
      } finally {
        setLoading(false);
      }
    };

    if (treeId) {
      fetchTree();
    }
  }, [treeId]);

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

  const handleAddToCart = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (!tree) return;

    // Check user type only if logged in
    if (session) {
      if (tree.treeType === 'individual' && session.user.userType !== 'individual') {
        toast.error('This tree is only available for individuals');
        return;
      }

      if (tree.treeType === 'company' && session.user.userType !== 'company') {
        toast.error('This tree is only available for companies');
        return;
      }
    }

    // Get button position for animation
    const button = event?.currentTarget || buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const startPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const endPos = getCartIconPosition();

      setFlyingTree({
        id: tree._id,
        imageUrl: tree.imageUrl,
        startPos,
        endPos
      });
    }

    setAddingToCart(true);
    
    // Add to cart after animation starts
    setTimeout(() => {
    try {
      addToCart({
        id: tree._id,
        name: tree.treeType === 'company' ? `Corporate ${tree.name}` : tree.name,
        price: tree.packagePrice || tree.price,
        imageUrl: tree.imageUrl,
        info: tree.info,
        oxygenKgs: tree.oxygenKgs,
        type: tree.treeType,
        packageQuantity: tree.packageQuantity,
        packagePrice: tree.packagePrice
      });

        // Complete animation and show toast
        setTimeout(() => {
          setFlyingTree(null);
          setAddingToCart(false);
      toast.success(`${tree.name} added to cart!`);
        }, 800);
    } catch (_error) {
        setFlyingTree(null);
        setAddingToCart(false);
      toast.error('Failed to add to cart. Please try again.');
    }
    }, 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 sm:pt-24 md:pt-28">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tree information...</p>
        </div>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 sm:pt-24 md:pt-28">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Tree not found'}</p>
          <Link href="/individuals" className="text-green-600 hover:underline">
            ← Back to Trees
          </Link>
        </div>
      </div>
    );
  }

  // Use real data from database, fallback to calculated/derived values
  const scientificName = tree.scientificSpecies || (tree.speciesInfoAvailable ? 'Species information available upon request' : getScientificName(tree.name));
  const co2Absorbed = tree.co2 !== undefined ? Math.abs(tree.co2) : calculateCO2(tree.oxygenKgs);
  const displayPrice = tree.packagePrice || tree.price;
  const originalPrice = tree.packagePrice ? tree.price * (tree.packageQuantity || 1) : null;
  const discount = originalPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : null;
  
  // Benefits data from database or defaults
  const benefits = [
    { label: 'Food Security', score: tree.foodSecurity ?? 0 },
    { label: 'Economic development', score: tree.economicDevelopment ?? 0 },
    { label: 'CO₂ Absorption', score: tree.co2Absorption ?? 0 },
    { label: 'Environmental protection', score: tree.environmentalProtection ?? 0 },
  ].filter(benefit => benefit.score > 0); // Only show benefits with scores > 0

  // Generate thumbnail images (using same image for now, can be enhanced later)
  // const thumbnails = [tree.imageUrl, tree.imageUrl, tree.imageUrl, tree.imageUrl];

  return (
    <div className="min-h-screen bg-gray-50 pt-20 sm:pt-24 md:pt-28">
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link 
          href={tree.treeType === 'individual' ? '/individuals' : '/companies'}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Images */}
          <div className="flex justify-center lg:justify-start">
            <div className="w-[85%]">
              {/* Main Image */}
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-white shadow-lg">
                <Image
                  src={selectedImage}
                  alt={tree.name}
                  fill
                  className="object-cover"
                  priority
                  quality={90}
                />
              </div>
            </div>
          </div>


          {/* Right Column - Product Information */}
          <div>
            {/* Tree Icon and Title */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{tree.name}</h1>
                {discount && (
                  <span className="inline-block bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded mb-2">
                    -{discount}%
                  </span>
                )}
              </div>
            </div>

            {/* Key Details */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">Scientific species:</span>
                <span>{scientificName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">Country:</span>
                <span>🇮🇳 India</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">CO₂:</span>
                <span className="text-green-600 font-semibold">
                  {tree.co2 !== undefined ? `${tree.co2} kg/year` : `-${co2Absorbed} kg/year`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">Oxygen:</span>
                <span className="text-green-600 font-semibold">{tree.oxygenKgs} kg/year</span>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-baseline gap-3">
                {originalPrice && (
                  <span className="text-lg text-gray-500 line-through">₹{originalPrice.toLocaleString()}</span>
                )}
                <span className="text-3xl font-bold text-green-600">₹{displayPrice.toLocaleString()}</span>
              </div>
              {tree.packageQuantity && tree.packageQuantity > 1 && (
                <p className="text-sm text-gray-600 mt-2">
                  Package: {tree.packageQuantity} trees (₹{Math.round(displayPrice / tree.packageQuantity).toLocaleString()} per tree)
                </p>
              )}
            </div>

            {/* Add to Cart Button */}
            <div className="mb-6">
              {session && session.user.userType !== tree.treeType ? (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 px-6 py-4 rounded-xl text-lg font-semibold cursor-not-allowed"
                >
                  {tree.treeType === 'individual' ? 'Individual Only' : 'Company Only'}
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingToCart ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9" />
                      </svg>
                      Add to Cart
                    </>
                  )}
                </button>
              )}
            </div>

            {/* What's included link */}
            <div className="mb-6">
              <Link href="#whats-included" className="text-green-600 hover:text-green-700 text-sm font-medium">
                What&apos;s included in the price? →
              </Link>
            </div>
          </div>
        </div>

        {/* What kind of tree is it? Section */}
        <div className="mt-12 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What kind of tree is it?</h2>
          <p className="text-gray-700 leading-relaxed text-lg">{tree.info}</p>
        </div>

        {/* What's Included Section */}
        <div id="whats-included" className="mb-12 bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What&apos;s included?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Transparency and traceability</h3>
              <p className="text-gray-600 leading-relaxed">
                Every tree is geolocated and photographed when planted. Your tree will be ready for planting within a few weeks to several months.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">An enduring story</h3>
              <p className="text-gray-600 leading-relaxed">
                Access your dashboard for updates on your tree&apos;s growth, environmental projects, climate insights, and botanical information.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">An original gift</h3>
              <p className="text-gray-600 leading-relaxed">
                Send a tree as a gift during checkout or from your profile. Choose email, message, or print a card to deliver in person.
              </p>
            </div>
          </div>
        </div>

        {/* More Information Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">More information on {tree.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local Uses */}
            {tree.localUses && tree.localUses.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Local uses</h3>
                <div className="space-y-4">
                  {tree.localUses.map((use) => {
                    // Get icon based on local use type
                    const getLocalUseIcon = (useType: string) => {
                      if (useType === 'Consumption and sales') {
                        // Fruit with coins (matching the image description)
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Fruit - red pear/apple */}
                            <ellipse cx="12" cy="14" rx="4" ry="6" fill="#EF4444"/>
                            <ellipse cx="12" cy="14" rx="3" ry="5" fill="#DC2626"/>
                            {/* Stem */}
                            <line x1="12" y1="9" x2="12" y2="7" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
                            {/* Coins stacked */}
                            <circle cx="16" cy="10" r="2.5" fill="#F59E0B"/>
                            <circle cx="16" cy="10" r="2" fill="#FCD34D"/>
                            <circle cx="16" cy="8" r="2.5" fill="#F59E0B"/>
                            <circle cx="16" cy="8" r="2" fill="#FCD34D"/>
                            {/* Dollar sign on top coin */}
                            <path d="M16 6.5V8.5M15 7H17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        );
                      } else if (useType === 'Soil') {
                        // Soil cross-section with layers
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Soil layers */}
                            <rect x="6" y="18" width="12" height="4" fill="#92400E"/>
                            <rect x="6" y="14" width="12" height="4" fill="#A16207"/>
                            <rect x="6" y="10" width="12" height="4" fill="#B45309"/>
                            {/* Grass on top */}
                            <path d="M8 10L9 8L10 10M12 10L13 8L14 10M16 10L17 8L18 10" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
                            {/* Dots in soil */}
                            <circle cx="9" cy="16" r="0.5" fill="#78350F"/>
                            <circle cx="12" cy="13" r="0.5" fill="#92400E"/>
                            <circle cx="15" cy="16" r="0.5" fill="#78350F"/>
                          </svg>
                        );
                      } else if (useType === 'Natural pesticide') {
                        // Shield or spray icon
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Shield */}
                            <path d="M12 4L8 6L8 12C8 15 10 17 12 18C14 17 16 15 16 12L16 6L12 4Z" fill="#22C55E" stroke="#166534" strokeWidth="1.5"/>
                            {/* Checkmark */}
                            <path d="M10 12L12 14L14 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        );
                      } else if (useType === 'Fence') {
                        // Fence/wall icon
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Fence posts */}
                            <rect x="6" y="8" width="2" height="12" fill="#92400E"/>
                            <rect x="11" y="8" width="2" height="12" fill="#92400E"/>
                            <rect x="16" y="8" width="2" height="12" fill="#92400E"/>
                            {/* Horizontal boards */}
                            <rect x="6" y="10" width="12" height="1.5" fill="#A16207"/>
                            <rect x="6" y="14" width="12" height="1.5" fill="#A16207"/>
                            <rect x="6" y="18" width="12" height="1.5" fill="#A16207"/>
                          </svg>
                        );
                      } else if (useType === 'Anti-wind') {
                        // Wind shield or tree blocking wind
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Tree trunk */}
                            <rect x="10" y="12" width="4" height="8" fill="#92400E"/>
                            {/* Tree top */}
                            <circle cx="12" cy="10" r="6" fill="#22C55E"/>
                            {/* Wind lines */}
                            <path d="M4 8L6 6L4 4M4 12L6 10L4 8M4 16L6 14L4 12" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        );
                      } else if (useType === 'Cosmetics') {
                        // Flower or beauty product
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Flower petals */}
                            <ellipse cx="12" cy="10" rx="3" ry="4" fill="#EC4899" transform="rotate(0 12 10)"/>
                            <ellipse cx="12" cy="10" rx="3" ry="4" fill="#F472B6" transform="rotate(45 12 10)"/>
                            <ellipse cx="12" cy="10" rx="3" ry="4" fill="#F9A8D4" transform="rotate(90 12 10)"/>
                            <ellipse cx="12" cy="10" rx="3" ry="4" fill="#FBCFE8" transform="rotate(135 12 10)"/>
                            {/* Center */}
                            <circle cx="12" cy="10" r="2" fill="#FCD34D"/>
                            {/* Stem */}
                            <line x1="12" y1="14" x2="12" y2="20" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        );
                      } else if (useType === 'Biodiversity') {
                        // Multiple animals/birds
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Bird 1 */}
                            <ellipse cx="8" cy="10" rx="2" ry="1.5" fill="#3B82F6"/>
                            <path d="M10 10L12 8" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                            {/* Bird 2 */}
                            <ellipse cx="16" cy="8" rx="2" ry="1.5" fill="#10B981"/>
                            <path d="M18 8L20 6" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/>
                            {/* Tree/branch */}
                            <path d="M12 20L12 14M10 16L14 16" stroke="#166534" strokeWidth="2" strokeLinecap="round"/>
                            {/* Small animal */}
                            <ellipse cx="12" cy="18" rx="1.5" ry="1" fill="#92400E"/>
                          </svg>
                        );
                      } else if (useType === 'Livestock') {
                        // Animal/cow icon
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Animal body */}
                            <ellipse cx="12" cy="14" rx="5" ry="4" fill="#92400E"/>
                            {/* Head */}
                            <ellipse cx="7" cy="12" rx="3" ry="2.5" fill="#A16207"/>
                            {/* Legs */}
                            <rect x="9" y="18" width="1.5" height="4" fill="#78350F"/>
                            <rect x="13.5" y="18" width="1.5" height="4" fill="#78350F"/>
                            {/* Eye */}
                            <circle cx="6" cy="11" r="0.8" fill="white"/>
                            <circle cx="6" cy="11" r="0.4" fill="black"/>
                          </svg>
                        );
                      } else if (useType === 'Medicine') {
                        // Medical cross or leaf
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Leaf */}
                            <path d="M12 4C10 6 8 8 8 12C8 16 10 18 12 20C14 18 16 16 16 12C16 8 14 6 12 4Z" fill="#22C55E"/>
                            <path d="M12 4C10 6 8 8 8 12C8 16 10 18 12 20" stroke="#166534" strokeWidth="1.5"/>
                            {/* Medical cross */}
                            <line x1="12" y1="10" x2="12" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="10" y1="12" x2="14" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        );
                      }
                      // Default icon - tree log
                      return (
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="8" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="4" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="12" r="0.5" fill="currentColor" />
                        </svg>
                      );
                    };

                    return (
                      <div key={use} className="flex items-start gap-4">
                        {/* Icon container */}
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-amber-200">
                          {getLocalUseIcon(use)}
                      </div>
                        <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">{use}</p>
                          <p className="text-gray-600 text-sm leading-relaxed">{localUsesDescriptions[use] || 'Local use information.'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CO2 Absorbed */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">CO₂ absorbed</h3>
              
              {/* Introductory sentence */}
              <p className="text-gray-700 text-sm mb-5">
                By planting this <span className="font-bold">{scientificName}</span> tree, you will absorb
              </p>

              {/* Main CO₂ metric with car icon */}
              <div className="flex items-start gap-4 mb-5">
                {/* Car icon - rounded */}
                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                  <Image
                    src="https://res.cloudinary.com/dmhdhzr6y/image/upload/v1763543266/car_esrdtz.webp"
                    alt="Car"
                    width={64}
                    height={64}
                    className="object-contain rounded-full"
                  />
                </div>
                
                {/* CO₂ amount */}
                <div className="flex-1">
                  <div className="mb-1">
                    <span className="text-4xl font-bold text-gray-900">{co2Absorbed}</span>
                    <span className="text-lg text-gray-900 ml-1">KG of CO₂</span>
                  </div>
                  {/* Calculate car equivalent: ~0.165 kg CO₂ per km (average car) */}
                  <p className="text-gray-700 text-sm mt-1">
                    equal to that produced by <strong className="font-bold">{Math.round(co2Absorbed / 0.165)}km by Car</strong>*
                  </p>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Absorption period details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 text-sm">CO₂ absorption period</span>
                  <span className="text-gray-700 text-sm">0 years/10 years**</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 text-sm">Average annual absorption</span>
                  <span className="text-gray-700 text-sm">{Math.round(co2Absorbed / 10)}Kg</span>
                </div>
              </div>

              {/* Footnotes */}
              <div className="space-y-1 mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  * Data sourced from: Greenhouse gas reporting: conversion factors 2024, UK Government, Department for Energy Security and Net Zero.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  ** The tree will continue to absorb CO₂ even after the tenth year. Therefore this is a prudent estimate.
                </p>
              </div>
            </div>

            {/* Benefits */}
            {benefits.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  Benefits
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {benefits.map((benefit) => {
                    // Get icon based on benefit type - matching the image exactly
                    const getIcon = (label: string) => {
                      if (label === 'Food Security') {
                        // Red pear with green stem and two green leaves
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Pear body - reddish brown/red */}
                            <ellipse cx="12" cy="14" rx="5" ry="7" fill="#DC2626"/>
                            <ellipse cx="12" cy="14" rx="4" ry="6" fill="#EF4444"/>
                            {/* Stem - green */}
                            <line x1="12" y1="8" x2="12" y2="6" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
                            {/* Left leaf */}
                            <ellipse cx="9" cy="7" rx="2" ry="1.5" fill="#22C55E" transform="rotate(-30 9 7)"/>
                            {/* Right leaf */}
                            <ellipse cx="15" cy="7" rx="2" ry="1.5" fill="#22C55E" transform="rotate(30 15 7)"/>
                          </svg>
                        );
                      } else if (label === 'Economic development') {
                        // Golden coin with white dollar sign
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Outer coin - golden */}
                            <circle cx="12" cy="12" r="10" fill="#F59E0B"/>
                            {/* Inner coin - lighter golden */}
                            <circle cx="12" cy="12" r="8" fill="#FCD34D"/>
                            {/* Dollar sign - white */}
                            <path d="M12 6V18M9 9H15M9 15H15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                            <circle cx="12" cy="9" r="0.8" fill="white"/>
                            <circle cx="12" cy="15" r="0.8" fill="white"/>
                          </svg>
                        );
                      } else if (label === 'CO₂ Absorption') {
                        // Solid blue cloud
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            <path d="M18.5 10.5C18.2 8.2 16.3 6.5 14 6.5C12.1 6.5 10.5 7.8 9.8 9.5C8.5 9.8 7.5 11 7.5 12.5C7.5 14.4 9.1 16 11 16H18.5C20.2 16 21.5 14.7 21.5 13C21.5 11.3 20.2 10 18.5 10.5Z" fill="#3B82F6"/>
                            <path d="M18.5 10.5C18.3 9 17.2 8 15.8 8C14.7 8 13.8 8.7 13.3 9.7C12.6 9.2 11.7 8.8 10.7 8.8C9 8.8 7.5 10.1 7.2 11.8C6.6 12 6.2 12.6 6.2 13.3C6.2 14.4 7.1 15.3 8.2 15.3H18.5C19.9 15.3 21 14.2 21 12.8C21 11.4 19.9 10.3 18.5 10.5Z" fill="#2563EB"/>
                          </svg>
                        );
                      } else if (label === 'Environmental protection') {
                        // Green sprout with two leaves
                        return (
                          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                            {/* Stem - dark green */}
                            <path d="M12 20L12 10" stroke="#166534" strokeWidth="2.5" strokeLinecap="round"/>
                            {/* Left leaf - green */}
                            <ellipse cx="9" cy="12" rx="3" ry="2" fill="#22C55E" transform="rotate(-45 9 12)"/>
                            {/* Right leaf - green */}
                            <ellipse cx="15" cy="12" rx="3" ry="2" fill="#22C55E" transform="rotate(45 15 12)"/>
                            {/* Top small leaves */}
                            <ellipse cx="10" cy="9" rx="1.5" ry="1" fill="#16A34A" transform="rotate(-20 10 9)"/>
                            <ellipse cx="14" cy="9" rx="1.5" ry="1" fill="#16A34A" transform="rotate(20 14 9)"/>
                          </svg>
                        );
                      }
                      return null;
                    };

                    return (
                      <div key={benefit.label} className="flex flex-col items-center">
                        {/* Circular progress indicator */}
                        <div className="relative w-24 h-24 mb-4">
                          <svg className="transform -rotate-90 w-24 h-24">
                            {/* Background circle - light gray */}
                            <circle
                              cx="48"
                              cy="48"
                              r="42"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className="text-gray-200"
                            />
                            {/* Progress circle - dark gray */}
                            <circle
                              cx="48"
                              cy="48"
                              r="42"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 42}`}
                              strokeDashoffset={`${2 * Math.PI * 42 * (1 - benefit.score / 10)}`}
                              className="text-gray-700 transition-all duration-500"
                              strokeLinecap="round"
                            />
                        </svg>
                          {/* Icon in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getIcon(benefit.label)}
                      </div>
                        </div>
                        {/* Title */}
                        <p className="text-sm font-medium text-gray-900 text-center mb-1.5">{benefit.label}</p>
                        {/* Rating */}
                        <p className="text-xs text-gray-600">{benefit.score}/10</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
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
    </div>
  );
}

