import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { ImageStudio, ImageStudioRef, ActiveTool } from './components/ImageStudio';
import { TextPlayground } from './components/TextPlayground';
import { Toolbar } from './components/Toolbar';


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [isTextPlaygroundOpen, setIsTextPlaygroundOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const imageStudioRef = useRef<ImageStudioRef>(null);

  const toggleTextPlayground = () => {
    setIsTextPlaygroundOpen(prev => !prev);
  };

  return (
    <div className="h-screen bg-dark-bg text-dark-text font-sans flex flex-col">
      <Header onExportClick={() => setIsExportModalOpen(true)} isImageLoaded={isImageLoaded} />
      <div className="flex flex-grow overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          toggleTextPlayground={toggleTextPlayground}
          isTextPlaygroundOpen={isTextPlaygroundOpen}
          onUpscale={() => imageStudioRef.current?.handleUpscale()}
          onSelectSubject={() => imageStudioRef.current?.handleSelectSubject()}
        />
        <main className="flex-grow bg-black/20 p-4 md:p-6 lg:p-8 flex items-center justify-center overflow-auto">
          <ImageStudio
            ref={imageStudioRef}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isExportModalOpen={isExportModalOpen}
            setIsExportModalOpen={setIsExportModalOpen}
            onImageStateChange={setIsImageLoaded}
          />
        </main>
        {isTextPlaygroundOpen && (
          <aside className="w-full md:w-[400px] lg:w-[500px] flex-shrink-0 bg-dark-surface border-l border-gray-700 overflow-y-auto">
            <TextPlayground onClose={toggleTextPlayground} />
          </aside>
        )}
      </div>
    </div>
  );
};

export default App;