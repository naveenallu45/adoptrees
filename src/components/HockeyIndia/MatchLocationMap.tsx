'use client';

import { useEffect, useRef } from 'react';

interface MatchLocationMapProps {
  latitude: number;
  longitude: number;
  matchLabel: string;
  radiusMeters?: number;
  className?: string;
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps: {
      Map: new (element: HTMLElement, options: unknown) => GoogleMap;
      Marker: new (options: unknown) => GoogleMarker;
      Circle: new (options: unknown) => GoogleCircle;
      InfoWindow: new (options: unknown) => GoogleInfoWindow;
      Size: new (width: number, height: number) => unknown;
      Point: new (x: number, y: number) => unknown;
      MapTypeId: { SATELLITE: string };
    };
  };
}

interface GoogleMap {
  setCenter: (location: { lat: number; lng: number }) => void;
}

interface GoogleMarker {
  setPosition: (location: { lat: number; lng: number }) => void;
  setMap: (map: GoogleMap | null) => void;
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleCircle {
  setMap: (map: GoogleMap | null) => void;
}

interface GoogleInfoWindow {
  open: (options: { map: GoogleMap; anchor: GoogleMarker }) => void;
  setContent: (content: string) => void;
  close: () => void;
}

export default function MatchLocationMap({
  latitude,
  longitude,
  matchLabel,
  radiusMeters = 300,
  className = 'w-full h-56 rounded-xl',
}: MatchLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const circleRef = useRef<GoogleCircle | null>(null);
  const infoWindowRef = useRef<GoogleInfoWindow | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn(
        'Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local'
      );
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

      const maps = googleMapsWindow.google.maps;
      const center = { lat: latitude, lng: longitude };

      // Initialize map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeId: maps.MapTypeId.SATELLITE,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: false,
        } as never);
      } else {
        mapInstanceRef.current.setCenter(center);
      }

      // Create / update marker with tree icon
      if (!markerRef.current) {
        markerRef.current = new maps.Marker({
          position: center,
          map: mapInstanceRef.current,
          title: matchLabel,
          icon: {
            url:
              'data:image/svg+xml;base64,' +
              btoa(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Ground shadow -->
                  <ellipse cx="16" cy="30" rx="10" ry="2" fill="#000" fill-opacity="0.2"/>
                  
                  <!-- Trunk -->
                  <rect x="14" y="20" width="4" height="10" rx="1" fill="#78350f"/>
                  
                  <!-- Tree Layers -->
                  <path d="M16 2L4 22H28L16 2Z" fill="#15803d"/>
                  <path d="M16 5L6 20H26L16 5Z" fill="#16a34a"/>
                  <path d="M16 8L8 18H24L16 8Z" fill="#22c55e"/>
                  
                  <!-- Highlights -->
                  <circle cx="13" cy="14" r="1.5" fill="#4ade80" fill-opacity="0.4"/>
                  <circle cx="19" cy="16" r="1" fill="#4ade80" fill-opacity="0.3"/>
                </svg>
              `),
            scaledSize: new maps.Size(32, 32),
            anchor: new maps.Point(16, 30),
          },
        } as never);

        // Add info window
        infoWindowRef.current = new maps.InfoWindow({
          content: `
            <style>
              .gm-ui-hover-effect { display: none !important; }
              .gm-style-iw-c { padding: 0 !important; border-radius: 12px !important; }
              .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
              .gm-style-iw-tc::after { background: white !important; }
            </style>
            <div style="color: #064e3b; font-family: sans-serif; padding: 8px 12px; line-height: 1.2; background: white;">
              <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #059669; margin-bottom: 2px;">Trees Planted For</div>
              <div style="font-weight: 800; font-size: 10px; white-space: nowrap;">${matchLabel}</div>
            </div>`,
        } as never);

        // Open by default
        if (mapInstanceRef.current && markerRef.current) {
          infoWindowRef.current.open({
            map: mapInstanceRef.current,
            anchor: markerRef.current,
          });
        }

        markerRef.current.addListener('click', () => {
          if (mapInstanceRef.current && markerRef.current) {
            infoWindowRef.current?.open({
              map: mapInstanceRef.current,
              anchor: markerRef.current,
            });
          }
        });
      } else {
        markerRef.current.setPosition(center);
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <style>
              .gm-ui-hover-effect { display: none !important; }
              .gm-style-iw-c { padding: 0 !important; border-radius: 12px !important; }
              .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; }
              .gm-style-iw-tc::after { background: white !important; }
            </style>
            <div style="color: #064e3b; font-family: sans-serif; padding: 8px 12px; line-height: 1.2; background: white;">
              <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #059669; margin-bottom: 2px;">Trees Planted For</div>
              <div style="font-weight: 800; font-size: 10px; white-space: nowrap;">${matchLabel}</div>
            </div>`);
        }
      }

      // Draw / update boundary circle
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }

      circleRef.current = new maps.Circle({
        strokeColor: '#22c55e',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.22,
        map: mapInstanceRef.current,
        center,
        radius: radiusMeters,
      } as never);
    }

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = checkAndInit;
      document.head.appendChild(script);
    } else {
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
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [latitude, longitude, matchLabel, radiusMeters]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={className}>
        <div className="w-full h-full bg-slate-900/40 rounded-xl flex items-center justify-center border border-slate-700">
          <p className="text-xs text-slate-300 text-center px-4">
            Google Maps is not configured. Add <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
            to show match planting locations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
    </div>
  );
}

