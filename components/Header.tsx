import React from 'react';

interface Props {
  onDonateClick: () => void;
}

const Header: React.FC<Props> = ({ onDonateClick }) => {
  return (
    <header className="bg-gradient-to-r from-pakgreen-800 to-pakgreen-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xl shadow">
             🇵🇰
           </div>
           <h1 className="text-xl md:text-2xl font-bold tracking-tight">PakLead Gen</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <nav className="hidden md:block">
               <span className="text-pakgreen-100 text-sm font-medium">Smart Business Search & Export</span>
            </nav>
            <button 
                onClick={onDonateClick}
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-sm font-bold px-4 py-2 rounded-full shadow-md transition-transform transform hover:scale-105 active:scale-95 flex items-center gap-1 ring-2 ring-yellow-400 ring-offset-2 ring-offset-pakgreen-700"
            >
                <span>🎁</span> Donate Now
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;