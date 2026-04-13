/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'framer-motion', '@tanstack/react-table'],
  },
  
  // Explicitly set workspace root to avoid lockfile detection issues
  // Using process.cwd() which works reliably in both local and Vercel environments
  outputFileTracingRoot: process.cwd(),
  
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
        hostname: 'instagram.fhyd14-1.fna.fbcdn.net',
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
};

export default nextConfig;
