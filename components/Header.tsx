import React, { useState, useEffect } from 'react';

interface Props {
  onDonateClick: () => void;
}

const Header: React.FC<Props> = ({ onDonateClick }) => {
  const [liveUsers, setLiveUsers] = useState(142);

  useEffect(() => {
    // Simulate live activity
    const interval = setInterval(() => {
      setLiveUsers(prev => {
        const change = Math.floor(Math.random() * 7) - 3; // Randomly add/remove -3 to +3 users
        return Math.max(50, prev + change);
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-gradient-to-r from-pakgreen-800 to-pakgreen-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xl shadow">
             🇵🇰
           </div>
           <h1 className="text-xl md:text-2xl font-bold tracking-tight">PakLead Gen</h1>
        </div>
        
        <div className="flex items-center gap-3">
            <nav className="hidden lg:block mr-2">
               <span className="text-pakgreen-100 text-sm font-medium">Smart Business Search & Export</span>
            </nav>
            
            <button 
                onClick={onDonateClick}
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs md:text-sm font-bold px-4 py-2 rounded-full shadow-md transition-transform transform hover:scale-105 active:scale-95 flex items-center gap-1 ring-2 ring-yellow-400 ring-offset-2 ring-offset-pakgreen-700"
            >
                <span>🎁</span> Donate Now
            </button>

            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 shadow-inner" title="Live Users">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="tabular-nums text-white">{liveUsers}</span>
                <span className="hidden sm:inline text-pakgreen-100">Live</span>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;