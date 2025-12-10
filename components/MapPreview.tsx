import React, { useEffect, useRef } from 'react';
import { Business } from '../types';

interface Props {
  query: string;
  location: string;
  businesses: Business[];
  onMarkerClick: (id: string) => void;
  filter: string;
  onFilterChange: (text: string) => void;
}

const MapPreview: React.FC<Props> = ({ query, location, businesses, onMarkerClick, filter, onFilterChange }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Filter businesses for map based on text filter
  const visibleBusinesses = businesses.filter(b => {
      const f = filter.toLowerCase();
      return b.lat && b.lng && (b.address.toLowerCase().includes(f) || b.name.toLowerCase().includes(f));
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Initialize Map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([30.3753, 69.3451], 5); // Default Center

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (visibleBusinesses.length === 0) return;

    // Create bounds to fit markers
    const bounds = L.latLngBounds([]);
    
    // Add Markers
    visibleBusinesses.forEach(biz => {
      if (biz.lat && biz.lng) {
        // Custom color marker logic could go here, using default blue for now
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

        // Add click listener
        marker.on('click', () => {
          onMarkerClick(biz.id);
        });

        markersRef.current.push(marker);
        bounds.extend([biz.lat, biz.lng]);
      }
    });

    // Fit map to markers
    if (markersRef.current.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

  }, [visibleBusinesses, onMarkerClick]);

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white mb-6 relative group">
        <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <span>🗺️</span> Map View: {query} in {location}
            </h3>
            <span className="text-xs text-gray-500">{visibleBusinesses.length} locations visible</span>
        </div>
        
        {/* Map Container */}
        <div className="relative">
          <div ref={mapContainerRef} className="w-full h-[450px] z-0 outline-none" />

          {/* Floating Search Bar Overlay */}
          <div className="absolute top-4 left-4 right-14 md:w-80 md:right-auto z-[1000]">
            <div className="relative shadow-lg rounded-lg bg-white/90 backdrop-blur-sm border border-gray-300 transition-all focus-within:ring-2 focus-within:ring-pakgreen-500 focus-within:bg-white">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
              <input 
                type="text" 
                placeholder="Search map area..." 
                value={filter} 
                onChange={(e) => onFilterChange(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-transparent rounded-lg outline-none text-sm text-gray-700 placeholder-gray-500"
                onKeyDown={(e) => e.stopPropagation()} // Prevent map keyboard shortcuts
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