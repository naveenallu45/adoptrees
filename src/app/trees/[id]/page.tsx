'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
  treeType: 'individual' | 'company';
  packageQuantity?: number;
  packagePrice?: number;
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

  const handleAddToCart = () => {
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

    setAddingToCart(true);
    
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

      toast.success(`${tree.name} added to cart!`);
    } catch (_error) {
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
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

  const scientificName = getScientificName(tree.name);
  const co2Absorbed = calculateCO2(tree.oxygenKgs);
  const displayPrice = tree.packagePrice || tree.price;
  const originalPrice = tree.packagePrice ? tree.price * (tree.packageQuantity || 1) : null;
  const discount = originalPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : null;

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
                <span className="text-green-600 font-semibold">-{co2Absorbed}kg</span>
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
                  <span className="text-lg text-gray-500 line-through">₹{originalPrice}</span>
                )}
                <span className="text-3xl font-bold text-green-600">₹{displayPrice}</span>
              </div>
              {tree.packageQuantity && tree.packageQuantity > 1 && (
                <p className="text-sm text-gray-600 mt-2">
                  Package: {tree.packageQuantity} trees (₹{Math.round(displayPrice / tree.packageQuantity)} per tree)
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
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Local uses
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Consumption and sales</p>
                    <p className="text-gray-600 text-sm">Its fruits, seeds and/or leaves are used as food in the farmers&apos; families or are sold on local markets.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Soil</p>
                    <p className="text-gray-600 text-sm">It improves the quality of the soil thanks to the nitrogen fixation process or it reduces soil erosion, thanks to its extended root system.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CO2 Absorbed */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                CO₂ absorbed
              </h3>
              <div className="text-center">
                <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{co2Absorbed} KG</div>
                    <div className="text-sm text-gray-600">of CO₂</div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  By planting this {scientificName} tree, you will absorb
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  <strong className="text-green-600">{co2Absorbed} KG of CO₂</strong>
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>CO₂ absorption period: 0 years/10 years</p>
                  <p>Average annual absorption: {Math.round(co2Absorbed / 10)}Kg</p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Benefits
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Food Security', score: 3 },
                  { label: 'Economic development', score: 9 },
                  { label: 'CO₂ Absorption', score: 5 },
                  { label: 'Environmental protection', score: 4 },
                ].map((benefit) => (
                  <div key={benefit.label} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">{benefit.label}</span>
                        <span className="text-xs text-gray-600">{benefit.score}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(benefit.score / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

