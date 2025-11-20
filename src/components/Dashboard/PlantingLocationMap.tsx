'use client';

import { useEffect, useRef } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface PlantingLocationMapProps {
  latitude: number;
  longitude: number;
  treeName?: string;
  className?: string;
  showOpenInMaps?: boolean;
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps: {
      Map: new (element: HTMLElement, options: unknown) => GoogleMap;
      Marker: new (options: unknown) => GoogleMarker;
      Animation: { DROP: unknown };
      Size: new (width: number, height: number) => unknown;
      Point: new (x: number, y: number) => unknown;
      InfoWindow: new (options: unknown) => GoogleInfoWindow;
    };
  };
}

interface GoogleMap {
  setCenter: (location: { lat: number; lng: number }) => void;
}

interface GoogleMarker {
  setPosition: (location: { lat: number; lng: number }) => void;
  setMap: (map: GoogleMap | null) => void;
  addListener: (event: string, callback: () => void) => void;
}

interface GoogleInfoWindow {
  open: (map: GoogleMap, marker: GoogleMarker) => void;
}

export default function PlantingLocationMap({ 
  latitude, 
  longitude, 
  treeName,
  className = 'w-full h-64 rounded-lg',
  showOpenInMaps = true
}: PlantingLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);

  const openInMaps = () => {
    // Detect if iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Open in Apple Maps
      window.open(`https://maps.apple.com/?q=${latitude},${longitude}&ll=${latitude},${longitude}`, '_blank');
    } else {
      // Open in Google Maps
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    }
  };

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
      const googleMapsWindow = window as unknown as GoogleMapsWindow;
      if (googleMapsWindow.google && googleMapsWindow.google.maps) {
        initializeMap();
      }
    }

    function initializeMap() {
      const googleMapsWindow = window as unknown as GoogleMapsWindow;
      if (!mapRef.current || !googleMapsWindow.google?.maps) return;

      const location = { lat: latitude, lng: longitude };
      const maps = googleMapsWindow.google.maps;

      // Initialize map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new maps.Map(mapRef.current, {
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
        } as never);
      } else {
        mapInstanceRef.current.setCenter(location);
      }

      // Add or update marker
      if (!markerRef.current) {
        markerRef.current = new maps.Marker({
          position: location,
          map: mapInstanceRef.current,
          title: treeName || 'Tree Planting Location',
          animation: maps.Animation.DROP,
          icon: {
            url: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Pin shadow -->
                <ellipse cx="20" cy="44" rx="6" ry="2" fill="#000" opacity="0.2"/>
                <!-- Pin base -->
                <path d="M20 0C12.268 0 6 6.268 6 14C6 24.5 20 48 20 48C20 48 34 24.5 34 14C34 6.268 27.732 0 20 0Z" fill="#22c55e"/>
                <!-- Tree trunk -->
                <rect x="18" y="28" width="4" height="8" fill="#8b4513"/>
                <!-- Tree leaves/crown -->
                <path d="M20 12C16 12 12 16 12 20C12 24 16 28 20 28C24 28 28 24 28 20C28 16 24 12 20 12Z" fill="#16a34a"/>
                <path d="M20 8C18 8 16 10 16 12C16 14 18 16 20 16C22 16 24 14 24 12C24 10 22 8 20 8Z" fill="#15803d"/>
                <!-- Small decorative leaves -->
                <circle cx="16" cy="18" r="2" fill="#22c55e"/>
                <circle cx="24" cy="18" r="2" fill="#22c55e"/>
                <circle cx="20" cy="14" r="1.5" fill="#16a34a"/>
              </svg>
            `),
            scaledSize: new maps.Size(40, 48),
            anchor: new maps.Point(20, 48)
          }
        } as never);

        // Add info window
        const infoWindow = new maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <strong style="color: #22c55e;">${treeName || 'Tree Planting Location'}</strong>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">
                Planted at: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
              </p>
            </div>
          `
        } as never);

        markerRef.current.addListener('click', () => {
          if (mapInstanceRef.current && markerRef.current) {
            infoWindow.open(mapInstanceRef.current, markerRef.current);
          }
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
      const googleMapsWindow = window as unknown as GoogleMapsWindow;
      if (googleMapsWindow.google?.maps) {
        checkAndInit();
      } else {
        checkInterval = setInterval(() => {
          if (googleMapsWindow.google?.maps) {
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
        <div className="relative w-full h-full rounded-lg overflow-hidden">
          <div ref={mapRef} className="w-full h-full rounded-lg" />
          {showOpenInMaps && (
            <button
              onClick={openInMaps}
              className="absolute bottom-3 right-3 bg-white hover:bg-gray-50 text-gray-800 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all hover:shadow-xl z-10 border border-gray-200"
              type="button"
            >
              <MapPinIcon className="h-4 w-4 text-green-600" />
              <span>Open in Maps</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}


