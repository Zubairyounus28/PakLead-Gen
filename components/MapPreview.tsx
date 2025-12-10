import React, { useEffect, useRef, useState } from 'react';
import { Business } from '../types';

interface Props {
  query: string;
  location: string;
  businesses: Business[];
  onMarkerClick: (id: string) => void;
  filter: string;
  onFilterChange: (text: string) => void;
  onLocationSearch: (text: string) => void; 
  onSearchArea: (center: { lat: number, lng: number }) => void; // New prop for "Search this area"
  mapCenter?: { lat: number; lng: number; zoom: number } | null;
  className?: string;
  loading?: boolean;
}

const MapPreview: React.FC<Props> = ({ 
  query, 
  location, 
  businesses, 
  onMarkerClick, 
  filter, 
  onFilterChange, 
  onLocationSearch,
  onSearchArea,
  mapCenter,
  className,
  loading
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [showSearchButton, setShowSearchButton] = useState(false);

  // Filter businesses for map based on text filter
  const visibleBusinesses = businesses.filter(b => {
      const f = filter.toLowerCase();
      return b.lat && b.lng && (b.address.toLowerCase().includes(f) || b.name.toLowerCase().includes(f));
  });

  // Handle Enter key in search bar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filter.trim()) {
        onLocationSearch(filter);
        setShowSearchButton(false);
      }
    }
  };

  const handleSearchAreaClick = () => {
      if (mapInstanceRef.current) {
          const center = mapInstanceRef.current.getCenter();
          onSearchArea({ lat: center.lat, lng: center.lng });
          setShowSearchButton(false);
      }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Initialize Map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([30.3753, 69.3451], 5); // Default Center Pakistan

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      // Event Listeners for Map Movement
      mapInstanceRef.current.on('dragend', () => {
        setShowSearchButton(true);
      });
      mapInstanceRef.current.on('zoomend', () => {
        setShowSearchButton(true);
      });
    }

    const map = mapInstanceRef.current;

    // 1. Handle External Center Updates (User typed a location)
    if (mapCenter) {
      map.flyTo([mapCenter.lat, mapCenter.lng], mapCenter.zoom, {
        animate: true,
        duration: 1.5
      });
      // Don't show search button if the app programmatically moved the map
      setShowSearchButton(false);
    }

    // 2. Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // 3. Add Markers & Calculate Bounds
    const bounds = L.latLngBounds([]);
    
    if (visibleBusinesses.length > 0) {
      visibleBusinesses.forEach(biz => {
        if (biz.lat && biz.lng) {
          const marker = L.marker([biz.lat, biz.lng])
            .addTo(map)
            .bindPopup(`
              <div class="text-center">
                <strong class="text-pakgreen-700 block mb-1">${biz.name}</strong>
                <span class="text-xs text-gray-600 block mb-2">${biz.address}</span>
                <button onclick="document.getElementById('${biz.id}').scrollIntoView({behavior:'smooth', block:'center'}); document.dispatchEvent(new CustomEvent('select-biz', {detail: '${biz.id}'}))" class="text-xs bg-pakgreen-600 text-white px-2 py-1 rounded">
                  View Card
                </button>
              </div>
            `);

          marker.on('click', () => {
            onMarkerClick(biz.id);
          });

          markersRef.current.push(marker);
          bounds.extend([biz.lat, biz.lng]);
        }
      });

      // Only auto-fit if we haven't manually moved the map recently (button logic)
      // and if explicit mapCenter wasn't just set.
      if (!mapCenter && !showSearchButton && visibleBusinesses.length > 0) {
         map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }

    // Invalidate size to handle layout changes
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

  }, [visibleBusinesses, onMarkerClick, mapCenter, showSearchButton]);

  return (
    <div className={`rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white relative group flex flex-col ${className || 'mb-6 h-[450px]'}`}>
        
        {/* Map Header */}
        <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <span>🗺️</span> Map View
            </h3>
            <span className="text-xs text-gray-500">
               {visibleBusinesses.length > 0 ? `${visibleBusinesses.length} visible` : 'Navigate map to search'}
            </span>
        </div>
        
        {/* Map Container */}
        <div className="relative flex-grow h-full">
          <div ref={mapContainerRef} className="w-full h-full z-0 outline-none min-h-[300px]" />

          {/* Search This Area Button (Google Maps Style) */}
          {showSearchButton && !loading && (
             <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000]">
                <button 
                  onClick={handleSearchAreaClick}
                  className="bg-white text-gray-800 font-semibold py-2 px-4 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2 animate-bounce-short transition-all"
                >
                  Search this area ↻
                </button>
             </div>
          )}
          
          {loading && (
             <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000]">
                <div className="bg-white/90 text-pakgreen-700 font-medium py-2 px-4 rounded-full shadow-lg border border-gray-200 flex items-center gap-2">
                   <span className="animate-spin">⌛</span> Finding businesses...
                </div>
             </div>
          )}

          {/* Floating Search Bar Overlay */}
          <div className="absolute top-4 left-4 right-14 md:w-96 md:right-auto z-[1000]">
            <div className="relative shadow-lg rounded-lg bg-white/95 backdrop-blur-sm border border-gray-300 transition-all focus-within:ring-2 focus-within:ring-pakgreen-500 focus-within:bg-white group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
              <input 
                type="text" 
                placeholder="Search location (e.g. New Karachi)..." 
                value={filter} 
                onChange={(e) => onFilterChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-10 py-3 bg-transparent rounded-lg outline-none text-sm text-gray-700 placeholder-gray-500"
              />
              {filter && (
                <button 
                  onClick={() => onFilterChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default MapPreview;