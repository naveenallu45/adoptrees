'use client';

import { useEffect, useRef } from 'react';

interface PlantingLocationMapProps {
  latitude: number;
  longitude: number;
  treeName?: string;
  className?: string;
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
  className = 'w-full h-64 rounded-lg'
}: PlantingLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);

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
              <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.163 0 0 7.163 0 16C0 27.045 16 40 16 40C16 40 32 27.045 32 16C32 7.163 24.837 0 16 0Z" fill="#22c55e"/>
                <circle cx="16" cy="16" r="8" fill="white"/>
              </svg>
            `),
            scaledSize: new maps.Size(32, 40),
            anchor: new maps.Point(16, 40)
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
        <div ref={mapRef} className="w-full h-full rounded-lg" />
      )}
    </div>
  );
}


