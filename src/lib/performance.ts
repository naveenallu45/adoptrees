/**
 * Performance optimization utilities
 */

// Debounce function for search inputs
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for scroll events
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Image optimization helper
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 80
): string {
  if (!url.includes('cloudinary.com')) {
    return url;
  }
  
  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push(`q_${quality}`, 'f_auto');
  
  const baseUrl = url.split('/upload/')[0];
  const publicId = url.split('/upload/')[1];
  
  return `${baseUrl}/upload/${transformations.join(',')}/${publicId}`;
}

// Lazy loading helper
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
}

// Memory usage monitoring (development only)
export function logMemoryUsage() {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    // Memory usage tracking disabled
  }
}

// Bundle size optimization helper
export function createChunkName(name: string): string {
  return `chunk-${name}`;
}

// Preload critical resources
export function preloadResource(href: string, as: string) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
}

// Critical CSS inlining helper
export function inlineCriticalCSS(css: string): string {
  return `<style>${css}</style>`;
}

// Service Worker registration helper
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((_registration) => {
          // Service worker registered
        })
        .catch((_registrationError) => {
          // Service worker registration failed
        });
    });
  }
}

// Performance metrics collection
export function collectPerformanceMetrics() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const _entry of list.getEntries()) {
        // Performance metrics collection disabled
      }
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const _entry of list.getEntries()) {
        // Performance metrics collection disabled
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      for (const _entry of list.getEntries()) {
        // Performance metrics collection disabled
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
}
