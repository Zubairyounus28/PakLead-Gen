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
    
    // Determine the actual location string to send to Gemini
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
    setError(null);
  };

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

        {results.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
             <h2 className="text-2xl font-bold text-gray-800">
               Results <span className="text-gray-400 text-lg font-normal">({results.length})</span>
             </h2>
             
             <div className="flex gap-2">
                <button onClick={() => exportToVCF(results)} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-md hover:bg-blue-100 transition border border-blue-200">
                  📇 VCF
                </button>
                <button onClick={() => exportToCSV(results)} className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-2 rounded-md hover:bg-green-100 transition border border-green-200">
                  📊 CSV
                </button>
                <button onClick={() => exportToWord(results)} className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-md hover:bg-indigo-100 transition border border-indigo-200">
                  📝 Word
                </button>
                <button onClick={clearResults} className="text-sm text-gray-500 hover:text-red-500 px-3 py-2">
                  Clear
                </button>
             </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {results.map((biz) => (
             <BusinessCard key={biz.id} business={biz} />
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
        {!loading && results.length > 0 && (
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