import React from 'react';
import { PhotoIcon } from './icons';

export const Header: React.FC<{ onExportClick: () => void, isImageLoaded: boolean }> = ({ onExportClick, isImageLoaded }) => {
  return (
    <header className="bg-dark-surface/80 backdrop-blur-sm z-10 shadow-md flex-shrink-0">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PhotoIcon className="w-8 h-8 text-brand-primary" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            Hiskon Photoshop
          </h1>
        </div>
        <button 
          onClick={onExportClick} 
          disabled={!isImageLoaded}
          className="bg-brand-secondary text-white font-bold py-2 px-4 rounded-md text-sm hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors"
        >
          Export
        </button>
      </div>
    </header>
  );
};