import React from 'react';
import { Business } from '../types';

interface Props {
  business: Business;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const BusinessCard: React.FC<Props> = ({ business, isSelected, onToggle }) => {
  const isWebAvailable = business.website && business.website !== 'N/A';
  const isPhoneAvailable = business.phone && business.phone !== 'N/A';

  return (
    <div 
      className={`
        relative rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full group
        ${isSelected ? 'ring-2 ring-pakgreen-500 border-pakgreen-500 bg-pakgreen-50' : 'bg-white border border-gray-100'}
      `}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 right-3 z-10">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={(e) => {
             e.stopPropagation();
             onToggle(business.id);
          }}
          className="w-5 h-5 text-pakgreen-600 rounded focus:ring-pakgreen-500 border-gray-300 cursor-pointer shadow-sm"
        />
      </div>

      <div className="p-5 flex-1 cursor-pointer" onClick={() => onToggle(business.id)}>
        <div className="flex justify-between items-start pr-8">
          <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1">{business.name}</h3>
        </div>
        
        {business.rating && business.rating !== 'N/A' && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 mb-2">
              ★ {business.rating}
            </span>
        )}
        
        <p className="text-sm text-gray-500 mb-3">{business.description}</p>
        
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start">
            <span className="mr-2 mt-0.5 text-pakgreen-600">📍</span>
            <span className={isSelected ? 'font-medium text-pakgreen-900' : ''}>
              {business.address}
            </span>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-pakgreen-600">📞</span>
            <span className={isPhoneAvailable ? "text-gray-900" : "text-gray-400 italic"}>
              {business.phone}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-white/50 px-5 py-3 border-t border-gray-100 flex justify-between items-center text-sm" onClick={(e) => e.stopPropagation()}>
        {isWebAvailable ? (
            <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">
              Visit Website
            </a>
        ) : (
            <span className="text-gray-400">No Website</span>
        )}

        <a 
          href={business.mapLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-pakgreen-700 hover:text-pakgreen-900 font-medium flex items-center"
        >
          View Map →
        </a>
      </div>
    </div>
  );
};

export default BusinessCard;