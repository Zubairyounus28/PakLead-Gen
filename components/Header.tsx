import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-pakgreen-800 to-pakgreen-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xl shadow">
             🇵🇰
           </div>
           <h1 className="text-xl md:text-2xl font-bold tracking-tight">PakLead Gen</h1>
        </div>
        <nav className="hidden md:block">
           <span className="text-pakgreen-100 text-sm font-medium">Smart Business Search & Export</span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
