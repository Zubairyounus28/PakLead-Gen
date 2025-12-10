import React from 'react';

interface Props {
  query: string;
  location: string;
  filter?: string;
}

const MapPreview: React.FC<Props> = ({ query, location, filter }) => {
  // Default Zoom for city/town view
  let zoom = 13;
  let mapQuery = `${query} in ${location}`;
  
  // Logic to handle "within X km of Y" for radius mode
  if (location.toLowerCase().startsWith("within ")) {
      // Parse format: "within [radius]km of [center]"
      // Updated regex to handle decimals (e.g. 5.5km)
      const match = location.match(/within ([\d.]+)km of (.*)/i);
      if (match) {
          const radius = parseFloat(match[1]);
          const center = match[2];
          mapQuery = `${query} near ${center}`;
          
          // Adjust zoom based on radius (rough approximation)
          if (radius <= 1) zoom = 15;
          else if (radius <= 3) zoom = 14;
          else if (radius <= 5) zoom = 13;
          else if (radius <= 10) zoom = 12;
          else if (radius <= 20) zoom = 11;
          else zoom = 10;
      }
  }

  // If the user is filtering by a specific town/area, override and zoom in
  if (filter && filter.trim().length > 0) {
    if (location.toLowerCase().includes("between")) {
        mapQuery = `${query} near ${filter} ${location}`;
    } else {
        // Append filter to base location if it's not already a "near X" query from radius mode logic above
        if (!mapQuery.includes("near")) {
            mapQuery = `${query} in ${filter}, ${location}`;
        } else {
            // If already radius mode, just append filter to the center
            mapQuery = `${mapQuery} ${filter}`;
        }
    }
  }

  // Handle specific "Near Me"
  if (location === "Near Me") {
      mapQuery = `${query} near me`;
  }

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-500">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span className="text-pakgreen-600">🗺️</span>
            <h3 className="font-semibold text-gray-700 text-sm">Live Area Map</h3>
        </div>
        <span className="text-xs text-gray-400 truncate max-w-[250px] italic">
            Viewing: {mapQuery} (Zoom: {zoom})
        </span>
      </div>
      <div className="h-64 w-full relative bg-gray-100">
        <iframe 
          width="100%" 
          height="100%" 
          src={src}
          frameBorder="0" 
          scrolling="no" 
          marginHeight={0} 
          marginWidth={0}
          title="Map Area Preview"
          className="absolute inset-0"
        />
        {/* Overlay gradient for better integration */}
        <div className="absolute inset-0 pointer-events-none border-inner shadow-inner"></div>
      </div>
    </div>
  );
};

export default MapPreview;