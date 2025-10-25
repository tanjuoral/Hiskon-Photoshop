
import React from 'react';
import { PhotoIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-dark-surface/80 backdrop-blur-sm sticky top-0 z-10 shadow-lg">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PhotoIcon className="w-8 h-8 text-brand-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Hiskon Photoshop
          </h1>
        </div>
      </div>
    </header>
  );
};