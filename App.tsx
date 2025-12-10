import React, { useState, useCallback } from 'react';
import { Business, GeoLocation } from './types';
import { searchBusinessesWithGemini } from './services/gemini';
import { exportToCSV, exportToVCF, exportToWord } from './utils/exportUtils';
import { PAKISTANI_CITIES, BUSINESS_TYPES } from './constants';
import BusinessCard from './components/BusinessCard';
import Header from './components/Header';

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

  const handleSearch = useCallback(async (isLoadMore = false) => {
    if (!query) {
      setError("Please enter a business type.");
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
      
      const newBusinesses = await searchBusinessesWithGemini(
        query, 
        searchLoc, 
        geo, 
        existingNames
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
  }, [query, isCustomLoc, customLocation, location, geo, results]);

  const clearResults = () => {
    setResults([]);
    setSelectedIds(new Set());
    setAreaFilter("");
    setError(null);
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
    const allVisibleSelected = filteredResults.every(b => selectedIds.has(b.id));
    
    const newSet = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredResults.forEach(b => newSet.delete(b.id));
    } else {
      filteredResults.forEach(b => newSet.add(b.id));
    }
    setSelectedIds(newSet);
  };

  // --- Export Logic ---
  const getExportData = () => {
    // If specific items are selected, export those.
    // Otherwise, export what is currently filtered/visible.
    if (selectedIds.size > 0) {
      return results.filter(b => selectedIds.has(b.id));
    }
    return filteredResults;
  };

  const exportLabel = selectedIds.size > 0 
    ? `Export Selected (${selectedIds.size})` 
    : `Export List (${filteredResults.length})`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Search Section */}
      <section className="bg-white shadow-sm border-b border-gray-200 p-4 md:p-6 sticky top-[60px] z-40">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Business Type Input */}
            <div className="flex-1 relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Business Type</label>
              <input 
                type="text"
                list="business-types"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pakgreen-500 focus:border-pakgreen-500 outline-none transition"
                placeholder="e.g. Restaurants, Plumbers"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <datalist id="business-types">
                {BUSINESS_TYPES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>

            {/* Location Input */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Location</label>
              <div className="flex gap-2">
                {!isCustomLoc ? (
                  <select 
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pakgreen-500 outline-none bg-white"
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
                    {location === 'Near Me' && <option value="Near Me">📍 Near Me (GPS)</option>}
                    {PAKISTANI_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="custom">✍️ Manual Address / Custom Area</option>
                  </select>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pakgreen-500 outline-none"
                      placeholder="Enter specific address, street, or area..."
                      value={customLocation}
                      autoFocus
                      onChange={(e) => setCustomLocation(e.target.value)}
                    />
                    <button 
                      onClick={() => setIsCustomLoc(false)}
                      className="px-3 text-gray-500 hover:text-red-500 bg-gray-50 rounded-lg border border-gray-200"
                      title="Back to City List"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={handleGeoLocation}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-lg border border-gray-300 transition"
                  title="Use GPS Location"
                >
                  📍
                </button>
              </div>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
               <button 
                 onClick={() => handleSearch(false)}
                 disabled={loading}
                 className="w-full md:w-auto bg-pakgreen-600 hover:bg-pakgreen-700 text-white font-bold py-3 px-8 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed h-[50px]"
               >
                 {loading ? 'Searching...' : 'Search'}
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Filters and Controls Bar */}
        {results.length > 0 && (
          <div className="mb-6 space-y-4">
             {/* Toolbar */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Filter Input */}
                <div className="w-full md:w-1/2 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Filter by Town or Area..." 
                    value={areaFilter} 
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pakgreen-500 outline-none"
                  />
                </div>

                {/* Selection and Export Actions */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                   <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={filteredResults.length > 0 && filteredResults.every(b => selectedIds.has(b.id))}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-pakgreen-600 rounded border-gray-300 focus:ring-pakgreen-500"
                      />
                      Select All
                   </label>

                   <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

                   <div className="flex gap-2 w-full sm:w-auto justify-center">
                      <button onClick={() => exportToVCF(getExportData())} className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-md hover:bg-blue-100 transition border border-blue-200 whitespace-nowrap" title="Export VCard">
                        📇 VCF
                      </button>
                      <button onClick={() => exportToCSV(getExportData())} className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-2 rounded-md hover:bg-green-100 transition border border-green-200 whitespace-nowrap" title="Export CSV">
                        📊 CSV
                      </button>
                      <button onClick={() => exportToWord(getExportData())} className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-md hover:bg-indigo-100 transition border border-indigo-200 whitespace-nowrap" title="Export Word">
                        📝 Word
                      </button>
                   </div>
                   
                   <button onClick={clearResults} className="text-sm text-gray-500 hover:text-red-500 px-2">
                      Clear
                   </button>
                </div>
             </div>

             {/* Stats & Selected Indicator */}
             <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-bold text-gray-800">
                   Results <span className="text-gray-400 font-normal">({filteredResults.length})</span>
                </h2>
                {selectedIds.size > 0 && (
                  <span className="bg-pakgreen-100 text-pakgreen-800 text-xs font-bold px-3 py-1 rounded-full">
                    {selectedIds.size} Selected for Export
                  </span>
                )}
             </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredResults.map((biz) => (
             <BusinessCard 
                key={biz.id} 
                business={biz} 
                isSelected={selectedIds.has(biz.id)}
                onToggle={toggleSelection}
             />
           ))}
        </div>

        {/* Loading Skeleton / State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow p-5 h-48 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {!loading && results.length > 0 && !areaFilter && (
          <div className="mt-10 text-center">
            <button 
              onClick={() => handleSearch(true)}
              className="bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-8 rounded-full hover:bg-gray-50 hover:shadow transition hover:border-pakgreen-500 hover:text-pakgreen-700"
            >
              Load More & Expand Search ↻
            </button>
            <p className="text-xs text-gray-400 mt-2">Searches wider area excluding current results</p>
          </div>
        )}
        
        {!loading && results.length > 0 && areaFilter && filteredResults.length === 0 && (
           <div className="text-center text-gray-400 mt-10">
              <p>No results match your filter "{areaFilter}".</p>
           </div>
        )}

        {!loading && results.length === 0 && !error && (
           <div className="text-center text-gray-400 mt-20">
              <div className="text-6xl mb-4">🏙️</div>
              <p className="text-lg">Enter a business type and location to start finding leads.</p>
           </div>
        )}
      </main>

      <footer className="bg-gray-800 text-gray-400 py-6 text-center text-sm">
        <p>© {new Date().getFullYear()} PakLead Gen. Powered by Gemini & Google Maps.</p>
        <p className="mt-2 text-gray-500 text-xs">
          Contact for Website or App Development: 
          <a 
            href="https://wa.me/923212696712" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition hover:underline ml-1"
          >
            +923212696712
          </a> 
          {' '}| Zubair Younus
        </p>
      </footer>
    </div>
  );
};

export default App;