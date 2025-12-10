import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DonateModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 animate-bounce-short">
        <div className="bg-gradient-to-r from-pakgreen-600 to-pakgreen-700 p-4 text-white flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2">💖 Support Developer</h3>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-pakgreen-100 text-pakgreen-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-2 shadow-inner">
                🎁
            </div>
            
            <p className="text-gray-700 font-medium text-lg leading-relaxed italic">
                "Donate your happy amount for developer he want to more efforts for your business."
            </p>
            
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-5 mt-4 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-2 text-xs font-bold text-red-500 uppercase tracking-widest border rounded">
                  Jazzcash
                </div>
                <div className="flex flex-col items-center justify-center gap-1 mt-1">
                    <span className="text-2xl font-black text-gray-800 tracking-wider font-mono select-all">0334 3018989</span>
                    <span className="text-sm text-gray-600 font-semibold bg-gray-200 px-2 py-0.5 rounded">Title: Zubair Younus</span>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="w-full bg-pakgreen-600 text-white font-bold py-3 rounded-xl hover:bg-pakgreen-700 transition shadow-lg mt-2 ring-2 ring-pakgreen-600 ring-offset-2"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default DonateModal;