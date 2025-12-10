import React, { useState, useCallback, useRef } from 'react';
import { Business, GeoLocation } from './types';
import { searchBusinessesWithGemini } from './services/gemini';
import { exportToCSV, exportToVCF, exportToWord } from './utils/exportUtils';
import { PAKISTANI_CITIES, BUSINESS_TYPES } from './constants';
import BusinessCard from './components/BusinessCard';
import Header from './components/Header';
import MapPreview from './components/MapPreview';

const App: React.FC = () => {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("Karachi");
  const [customLocation, setCustomLocation] = useState("");
  const [isCustomLoc, setIsCustomLoc] = useState(false);
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState<GeoLocation | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // New State for Filtering and Selection
  const [areaFilter, setAreaFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Map Navigation State
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  // View Mode: 'grid' (default) or 'map' (split view)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const businessInputRef = useRef<HTMLInputElement>(null);

  const handleGeoLocation = () => {
    if ('geolocation' in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeo({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocation("Near Me");
          setIsCustomLoc(false);
          setLoading(false);
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude, zoom: 15 });
        },
        (err) => {
          setError("Could not access location. Please enable GPS.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation not supported by this browser.");
    }
  };

  // Called when user presses Enter in the Map Search Bar
  const handleMapLocationSearch = async (searchText: string) => {
     try {
        setLoading(true);
        // Use OpenStreetMap Nominatim for free geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&countrycodes=pk&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
           const lat = parseFloat(data[0].lat);
           const lon = parseFloat(data[0].lon);
           
           // 1. Move Map
           setMapCenter({ lat, lng: lon, zoom: 14 });
           
           // 2. Update Location State
           setIsCustomLoc(true);
           setCustomLocation(searchText);
           setLocation('custom'); // Ensure dropdown reflects custom
           
           // 3. Prompt user
           if (!query.trim()) {
              setError(null); // Clear previous errors
              // Focus business input
              if(businessInputRef.current) {
                  businessInputRef.current.focus();
              }
           }
           setLoading(false);
        } else {
           setError(`Could not find location "${searchText}" on map.`);
           setLoading(false);
        }
     } catch (e) {
        console.error(e);
        setError("Failed to locate area. Please check internet connection.");
        setLoading(false);
     }
  };

  // Called when user moves map and clicks "Search this area"
  const handleSearchThisArea = async (center: { lat: number; lng: number }) => {
      if (!query) {
          setError("Please enter a business type first (e.g. Schools).");
          if (businessInputRef.current) businessInputRef.current.focus();
          return;
      }
      
      setLoading(true);
      setError(null);
      // We don't change 'mapCenter' state here because the user manually moved it. 
      // We just want to search at these coordinates.

      try {
          const newBusinesses = await searchBusinessesWithGemini(
              query,
              "Map Location", // Label for API prompt
              undefined,
              [],
              { lat: center.lat, lng: center.lng } // Explicit coordinates
          );

          setResults(newBusinesses);
          setSelectedIds(new Set());
          setAreaFilter("");
          
          if (newBusinesses.length === 0) {
              setError("No businesses found in this specific area.");
          }
      } catch (e) {
          setError("Failed to fetch results from this map area.");
      } finally {
          setLoading(false);
      }
  };

  const handleSearch = useCallback(async (isLoadMore = false) => {
    if (!query) {
      setError("Please enter a business type.");
      if(businessInputRef.current) businessInputRef.current.focus();
      return;
    }

    setLoading(true);
    setError(null);
    
    const searchLoc = isCustomLoc ? customLocation : location;
    
    if (isCustomLoc && !customLocation.trim()) {
        setError("Please enter a manual address or area.");
        setLoading(false);
        return;
    }
    
    try {
      const existingNames = isLoadMore ? results.map(r => r.name) : [];
      
      // Determine search coordinates:
      let searchCoords: GeoLocation | undefined = undefined;
      if (isCustomLoc && mapCenter) {
          searchCoords = { lat: mapCenter.lat, lng: mapCenter.lng };
      }

      const newBusinesses = await searchBusinessesWithGemini(
        query, 
        searchLoc, 
        geo, 
        existingNames,
        searchCoords
      );

      if (isLoadMore) {
        setResults(prev => [...prev, ...newBusinesses]);
      } else {
        setResults(newBusinesses);
        setSelectedIds(new Set()); // Reset selection on new search
        setAreaFilter(""); // Reset filter
      }
      
      if (newBusinesses.length === 0 && !isLoadMore) {
        setError("No businesses found. Try a different query or location.");
      } else if (newBusinesses.length === 0 && isLoadMore) {
         setError("No more new businesses found in this area. Try widening your search location.");
      }

    } catch (e) {
      setError("Failed to fetch results. Gemini API usage may be limited or network issue.");
    } finally {
      setLoading(false);
    }
  }, [query, isCustomLoc, customLocation, location, geo, results, mapCenter]);

  const clearResults = () => {
    setResults([]);
    setSelectedIds(new Set());
    setAreaFilter("");
    setError(null);
    setMapCenter(null);
  };

  // --- Filtering Logic ---
  const filteredResults = results.filter(b => {
    const filterText = areaFilter.toLowerCase();
    return b.address.toLowerCase().includes(filterText) || 
           b.name.toLowerCase().includes(filterText);
  });

  // --- Selection Logic ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    // If all visible are selected, deselect all. Otherwise select all visible.
    const allVisibleSelected = filteredResults.length > 0 && filteredResults.every(b => selectedIds.has(b.id));
    
    const newSet = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredResults.forEach(b => newSet.delete(b.id));
    } else {
      filteredResults.forEach(b => newSet.add(b.id));
    }
    setSelectedIds(newSet);
  };

  // --- Map Interaction Logic ---
  const handleMarkerClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const newSet = new Set(selectedIds);
      newSet.add(id);
      setSelectedIds(newSet);
    }
  };

  // --- Export Logic ---
  const getExportData = () => {
    if (selectedIds.size > 0) {
      return results.filter(b => selectedIds.has(b.id));
    }
    return filteredResults;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />

      {/* Search Section (Sticky Top) */}
      <section className="bg-white shadow-sm border-b border-gray-200 p-4 shrink-0 z-40">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-3 items-end lg:items-center">
            
            {/* Business Type Input */}
            <div className="flex-1 w-full relative">
               <input 
                ref={businessInputRef}
                type="text"
                list="business-types"
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pakgreen-500 outline-none text-sm"
                placeholder={isCustomLoc && !query ? `What business in ${customLocation}?` : "Business Type (e.g. Restaurants)"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <datalist id="business-types">
                {BUSINESS_TYPES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>

            {/* Location Input */}
            <div className="flex-1 w-full flex gap-2">
                {!isCustomLoc ? (
                  <select 
                    className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pakgreen-500 outline-none bg-white text-sm"
                    value={location}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomLoc(true);
                        setCustomLocation("");
                      } else {
                        setLocation(e.target.value);
                      }
                    }}
                  >
                    {location === 'Near Me' && <option value="Near Me">📍 Near Me</option>}
                    {PAKISTANI_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="custom">✍️ Manual Location</option>
                  </select>
                ) : (
                  <div className="flex-1 flex gap-1">
                    <input 
                      type="text"
                      className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pakgreen-500 outline-none text-sm"
                      placeholder="Address/Area..."
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                    />
                    <button onClick={() => setIsCustomLoc(false)} className="px-2 text-gray-500 border rounded">✕</button>
                  </div>
                )}
                
                <button onClick={handleGeoLocation} className="bg-gray-100 p-2.5 rounded-lg border hover:bg-gray-200" title="GPS">📍</button>
            </div>

            {/* Search Button */}
            <button 
                onClick={() => handleSearch(false)}
                disabled={loading}
                className="w-full lg:w-auto bg-pakgreen-600 hover:bg-pakgreen-700 text-white font-bold py-2.5 px-6 rounded-lg shadow disabled:opacity-50 transition text-sm whitespace-nowrap"
            >
                {loading ? 'Searching...' : '🔍 Search'}
            </button>

            {/* View Toggles */}
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${viewMode === 'grid' ? 'bg-white shadow text-pakgreen-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <span className="text-sm">☰</span> Grid
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1 ${viewMode === 'map' ? 'bg-white shadow text-pakgreen-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <span className="text-sm">🗺️</span> Map
                </button>
            </div>
          </div>
          
          {/* Contextual Hint */}
          {isCustomLoc && !query && customLocation && (
              <div className="mt-2 text-xs text-pakgreen-700 font-medium animate-pulse">
                  📍 Map set to {customLocation}. Now enter a business type above!
              </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <div className={`flex-grow overflow-hidden ${viewMode === 'map' ? 'flex flex-col lg:flex-row' : 'overflow-y-auto'}`}>
          
          {/* Map Section */}
          <div className={`
             transition-all duration-300
             ${viewMode === 'map' 
               ? 'h-[40vh] lg:h-full lg:w-3/5 order-1 lg:order-1' 
               : 'h-auto w-full container mx-auto max-w-6xl px-4 pt-6'
             }
          `}>
             <MapPreview 
              query={query} 
              location={isCustomLoc ? customLocation : location} 
              businesses={results} 
              filter={areaFilter}
              onFilterChange={setAreaFilter}
              onLocationSearch={handleMapLocationSearch}
              onSearchArea={handleSearchThisArea}
              mapCenter={mapCenter}
              onMarkerClick={handleMarkerClick}
              className={viewMode === 'map' ? 'h-full w-full rounded-none border-0' : 'h-[350px]'}
              loading={loading}
            />
          </div>

          {/* Results/List Section */}
          <div className={`
             ${viewMode === 'map'
                ? 'h-[60vh] lg:h-full lg:w-2/5 overflow-y-auto bg-white border-l border-gray-200 order-2 lg:order-2'
                : 'container mx-auto max-w-6xl px-4 pb-12'
             }
          `}>
             <div className="p-4 space-y-4">
                
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
                    {error}
                  </div>
                )}

                {/* Toolbar */}
                {results.length > 0 && (
                  <div className="flex flex-col gap-3 pb-2 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                       <h2 className="font-bold text-gray-800">
                         {filteredResults.length} Results
                       </h2>
                       <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none bg-gray-50 px-2 py-1 rounded border">
                              <input 
                                type="checkbox" 
                                checked={filteredResults.length > 0 && filteredResults.every(b => selectedIds.has(b.id))}
                                onChange={handleSelectAll}
                                className="w-3 h-3 text-pakgreen-600 rounded"
                              />
                              Select All
                          </label>
                          <button onClick={clearResults} className="text-xs text-red-500 hover:underline px-2">Clear</button>
                       </div>
                    </div>
                    
                    {/* Export Buttons */}
                    <div className="flex gap-2">
                        <button onClick={() => exportToVCF(getExportData())} className="flex-1 text-xs bg-blue-50 text-blue-700 px-2 py-1.5 rounded border border-blue-200 hover:bg-blue-100">
                          📇 VCF ({selectedIds.size || filteredResults.length})
                        </button>
                        <button onClick={() => exportToCSV(getExportData())} className="flex-1 text-xs bg-green-50 text-green-700 px-2 py-1.5 rounded border border-green-200 hover:bg-green-100">
                          📊 CSV
                        </button>
                        <button onClick={() => exportToWord(getExportData())} className="flex-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1.5 rounded border border-indigo-200 hover:bg-indigo-100">
                          📝 Word
                        </button>
                    </div>
                  </div>
                )}

                {/* Cards Grid */}
                <div className={`grid gap-4 ${viewMode === 'map' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                  
                  {loading && [1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl shadow p-4 h-40 animate-pulse border border-gray-100">
                       <div className="h-5 bg-gray-100 rounded w-3/4 mb-3"></div>
                       <div className="h-3 bg-gray-100 rounded w-1/2 mb-2"></div>
                       <div className="h-3 bg-gray-100 rounded w-full mb-1"></div>
                    </div>
                  ))}

                  {!loading && filteredResults.map((biz) => (
                    <BusinessCard 
                        key={biz.id} 
                        business={biz} 
                        isSelected={selectedIds.has(biz.id)}
                        onToggle={toggleSelection}
                    />
                  ))}
                  
                  {!loading && results.length > 0 && (
                      <div className="col-span-full text-center py-6">
                         <button 
                            onClick={() => handleSearch(true)}
                            className="bg-gray-100 text-gray-600 text-sm font-semibold py-2 px-6 rounded-full hover:bg-pakgreen-50 hover:text-pakgreen-700 border border-gray-200"
                          >
                            Load More
                          </button>
                      </div>
                  )}

                  {!loading && results.length === 0 && !error && (
                    <div className="text-center py-10 text-gray-400">
                       <div className="text-4xl mb-2">🔎</div>
                       <p className="text-sm">
                          {isCustomLoc ? `Map centered on ${customLocation}.` : "Start your search above."} <br/>
                          Enter business type to find leads.
                       </p>
                    </div>
                  )}
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default App;