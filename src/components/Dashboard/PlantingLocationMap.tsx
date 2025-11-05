'use client';

import { useEffect, useRef } from 'react';

interface PlantingLocationMapProps {
  latitude: number;
  longitude: number;
  treeName?: string;
  className?: string;
}

export default function PlantingLocationMap({ 
  latitude, 
  longitude, 
  treeName,
  className = 'w-full h-64 rounded-lg'
}: PlantingLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Only initialize if Google Maps API is loaded
    if (typeof window === 'undefined') return;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local');
      return;
    }

    let checkInterval: NodeJS.Timeout | null = null;

    function checkAndInit() {
      if ((window as any).google && (window as any).google.maps) {
        initializeMap();
      }
    }

    function initializeMap() {
      if (!mapRef.current || !(window as any).google?.maps) return;

      const location = { lat: latitude, lng: longitude };

      // Initialize map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new (window as any).google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });
      } else {
        mapInstanceRef.current.setCenter(location);
      }

      // Add or update marker
      if (!markerRef.current) {
        markerRef.current = new (window as any).google.maps.Marker({
          position: location,
          map: mapInstanceRef.current,
          title: treeName || 'Tree Planting Location',
          animation: (window as any).google.maps.Animation.DROP,
          icon: {
            url: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.163 0 0 7.163 0 16C0 27.045 16 40 16 40C16 40 32 27.045 32 16C32 7.163 24.837 0 16 0Z" fill="#22c55e"/>
                <circle cx="16" cy="16" r="8" fill="white"/>
              </svg>
            `),
            scaledSize: new (window as any).google.maps.Size(32, 40),
            anchor: new (window as any).google.maps.Point(16, 40)
          }
        });

        // Add info window
        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong style="color: #22c55e;">${treeName || 'Tree Planting Location'}</strong>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                Planted at: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
              </p>
            </div>
          `
        });

        markerRef.current.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, markerRef.current);
        });
      } else {
        markerRef.current.setPosition(location);
      }
    }

    // Load Google Maps script if not already loaded
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = checkAndInit;
      document.head.appendChild(script);
    } else {
      // Wait for script to load if not ready
      if ((window as any).google?.maps) {
        checkAndInit();
      } else {
        checkInterval = setInterval(() => {
          if ((window as any).google?.maps) {
            if (checkInterval) clearInterval(checkInterval);
            checkAndInit();
          }
        }, 100);
      }
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [latitude, longitude, treeName]);

  return (
    <div className={className}>
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-sm text-gray-600 mb-2">Google Maps API key not configured</p>
            <p className="text-xs text-gray-500">Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local</p>
          </div>
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-full rounded-lg" />
      )}
    </div>
  );
}


