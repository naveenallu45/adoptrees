import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'framer-motion', '@tanstack/react-table'],
  },
  
  // Output configuration - removed 'standalone' as Vercel handles deployment differently
  // output: 'standalone', // Commented out for Vercel compatibility
  
  // Reduce filesystem operations during build
  generateBuildId: async () => {
    // Use a simple build ID to reduce filesystem checks
    return `build-${Date.now()}`;
  },
  
  // allowedDevOrigins removed for Vercel compatibility
  // Vercel handles CORS automatically
  
  // Turbopack configuration removed for Vercel compatibility
  // Vercel handles build optimization automatically
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'instagram.fhyd11-3.fna.fbcdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src 'self' https://checkout.razorpay.com;",
    // Configure image qualities for Next.js 16 compatibility
    qualities: [25, 50, 75, 85, 90, 95, 100],
  },
  
  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  
  // Simplified webpack config for Vercel compatibility
  webpack: (config, { dev, isServer }) => {
    // Minimal webpack configuration - Vercel handles most optimizations
    return config;
  },
  
  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        // Exclude admin routes from caching
        source: '/api/admin/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
