'use client';

import { useEffect } from 'react';

export default function PWAMetaTags() {
  useEffect(() => {
    // Add manifest link
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }

    // Add theme-color meta tag
    if (!document.querySelector('meta[name="theme-color"]')) {
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#16a34a';
      document.head.appendChild(themeColor);
    }

    // Add Apple meta tags
    const appleTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Adoptrees' },
    ];

    appleTags.forEach(({ name, content }) => {
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    });

    // Add apple-touch-icon
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href =
        'https://res.cloudinary.com/dmhdhzr6y/image/upload/w_180,h_180,c_fill,r_max/v1763716774/WhatsApp_Image_2025-11-21_at_10.35.39_AM_wvwvdy_e_background_removal_f_png.jpg_szp33f.png';
      document.head.appendChild(appleIcon);
    }
  }, []);

  return null;
}

