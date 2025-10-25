
import React from 'react';
import { Header } from './components/Header';
import { ImageStudio } from './components/ImageStudio';
import { TextPlayground } from './components/TextPlayground';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <ImageStudio />
          </div>
          <div className="lg:col-span-2">
            <TextPlayground />
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-dark-text-secondary text-sm">
        <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;
