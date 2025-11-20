'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPinIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (latitude: number, longitude: number) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps: {
      Map: new (element: HTMLElement, options: unknown) => GoogleMap;
      Marker: new (options: unknown) => GoogleMarker;
      Size: new (width: number, height: number) => unknown;
      Point: new (x: number, y: number) => unknown;
      LatLng: new (lat: number, lng: number) => unknown;
    };
  };
}

interface GoogleMap {
  setCenter: (location: { lat: number; lng: number }) => void;
  addListener: (event: string, callback: (e: { latLng: { lat: () => number; lng: () => number } }) => void) => void;
}

interface GoogleMarker {
  setPosition: (location: { lat: number; lng: number }) => void;
  setMap: (map: GoogleMap | null) => void;
  addListener: (event: string, callback: (e: { latLng: { lat: () => number; lng: () => number } }) => void) => void;
}

export default function LocationPicker({
  isOpen,
  onClose,
  onSelect,
  initialLatitude,
  initialLongitude
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset selected location when modal opens
    if (initialLatitude && initialLongitude) {
      setSelectedLocation({ lat: initialLatitude, lng: initialLongitude });
    } else {
      setSelectedLocation(null);
    }

    // Load Google Maps script if not already loaded
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found');
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
      
      // Use initial location or default to a center point (India)
      const defaultCenter = initialLatitude && initialLongitude
        ? { lat: initialLatitude, lng: initialLongitude }
        : { lat: 20.5937, lng: 78.9629 }; // Center of India

      // Initialize map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: initialLatitude && initialLongitude ? 15 : 5,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        } as never);

        // Add click listener to select location
        mapInstanceRef.current.addListener('click', (e: { latLng: { lat: () => number; lng: () => number } }) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setSelectedLocation({ lat, lng });

          // Update or create marker
          if (!markerRef.current) {
            markerRef.current = new maps.Marker({
              position: { lat, lng },
              map: mapInstanceRef.current,
              draggable: true,
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

            // Update marker position when dragged
            markerRef.current.addListener('dragend', (e: { latLng: { lat: () => number; lng: () => number } }) => {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              setSelectedLocation({ lat, lng });
            });
          } else {
            markerRef.current.setPosition({ lat, lng });
          }
        });

        // If initial location provided, add marker
        if (initialLatitude && initialLongitude) {
          markerRef.current = new maps.Marker({
            position: { lat: initialLatitude, lng: initialLongitude },
            map: mapInstanceRef.current,
            draggable: true,
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

          markerRef.current.addListener('dragend', (e: { latLng: { lat: () => number; lng: () => number } }) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setSelectedLocation({ lat, lng });
          });
        }

        setMapLoaded(true);
      } else {
        // Update center if initial location provided
        if (initialLatitude && initialLongitude) {
          mapInstanceRef.current.setCenter({ lat: initialLatitude, lng: initialLongitude });
        }
      }
    }

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
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
    };
  }, [isOpen, initialLatitude, initialLongitude]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setSelectedLocation({ lat, lng });
          
          // Update map center and marker
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            
            const googleMapsWindow = window as unknown as GoogleMapsWindow;
            const maps = googleMapsWindow.google?.maps;
            if (maps && markerRef.current) {
              markerRef.current.setPosition({ lat, lng });
            } else if (maps) {
              markerRef.current = new maps.Marker({
                position: { lat, lng },
                map: mapInstanceRef.current,
                draggable: true,
                icon: {
                  url: 'data:image/svg+xml;base64,' + btoa(`
                    <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="20" cy="44" rx="6" ry="2" fill="#000" opacity="0.2"/>
                      <path d="M20 0C12.268 0 6 6.268 6 14C6 24.5 20 48 20 48C20 48 34 24.5 34 14C34 6.268 27.732 0 20 0Z" fill="#22c55e"/>
                      <rect x="18" y="28" width="4" height="8" fill="#8b4513"/>
                      <path d="M20 12C16 12 12 16 12 20C12 24 16 28 20 28C24 28 28 24 28 20C28 16 24 12 20 12Z" fill="#16a34a"/>
                      <path d="M20 8C18 8 16 10 16 12C16 14 18 16 20 16C22 16 24 14 24 12C24 10 22 8 20 8Z" fill="#15803d"/>
                      <circle cx="16" cy="18" r="2" fill="#22c55e"/>
                      <circle cx="24" cy="18" r="2" fill="#22c55e"/>
                      <circle cx="20" cy="14" r="1.5" fill="#16a34a"/>
                    </svg>
                  `),
                  scaledSize: new maps.Size(40, 48),
                  anchor: new maps.Point(20, 48)
                }
              } as never);

              markerRef.current.addListener('dragend', (e: { latLng: { lat: () => number; lng: () => number } }) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                setSelectedLocation({ lat, lng });
              });
            }
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please select a location on the map.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser. Please select a location on the map.');
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation.lat, selectedLocation.lng);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-green-50">
          <h3 className="text-lg font-bold text-gray-900">Select Tree Planting Location</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            type="button"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Map */}
        <div className="p-4 flex-1 min-h-0 relative">
          {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
            <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-sm text-gray-600 mb-2">Google Maps API key not configured</p>
                <p className="text-xs text-gray-500">Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local</p>
              </div>
            </div>
          ) : (
            <>
              <div ref={mapRef} className="w-full h-96 rounded-lg border border-gray-200" />
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Instructions */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Click on the map to select the planting location, or use the &ldquo;Use Current Location&rdquo; button below. You can also drag the marker to adjust the position.
            </p>
          </div>

          {/* Selected coordinates */}
          {selectedLocation && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">
                Selected Location:
              </p>
              <p className="text-xs text-green-700 font-mono mt-1">
                Latitude: {selectedLocation.lat.toFixed(6)}, Longitude: {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={handleUseCurrentLocation}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
            type="button"
          >
            <MapPinIcon className="h-5 w-5" />
            <span>Use Current Location</span>
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <CheckIcon className="h-5 w-5" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

