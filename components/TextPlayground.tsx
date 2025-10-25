
import React, { useState, useRef } from 'react';
import { generateTextStream } from '../services/geminiService';
import { LightningBoltIcon, ChatIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

export const TextPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!prompt) {
      setError('Please enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      await generateTextStream(prompt, (chunk) => {
        setResult((prev) => prev + chunk);
        if (resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight;
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate text: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-dark-surface rounded-xl shadow-2xl p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
        <LightningBoltIcon className="w-6 h-6 text-brand-secondary" />
        Text Playground
      </h2>
      <p className="text-sm text-dark-text-secondary mb-4">
        Get quick, low-latency text responses from Gemini Flash Lite.
      </p>

      <div 
        ref={resultRef}
        className="flex-grow bg-gray-900/50 rounded-lg p-4 border border-gray-700 overflow-y-auto min-h-[200px] prose prose-invert prose-sm max-w-none prose-p:text-dark-text"
      >
        {result ? (
          <p>{result}</p>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-dark-text-secondary">
                <ChatIcon className="w-12 h-12" />
                <p className="mt-2">Your response will stream here...</p>
            </div>
        )}
      </div>

      {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask a question or give a command..."
          className="flex-grow bg-gray-800 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-brand-secondary focus:outline-none transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt}
          className="flex items-center justify-center bg-brand-secondary text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105 active:scale-100"
        >
          {isLoading ? <LoadingSpinner /> : <LightningBoltIcon className="w-5 h-5 mr-2" />}
          <span>Generate</span>
        </button>
      </div>
    </div>
  );
};
