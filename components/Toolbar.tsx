import React from 'react';
import { ActiveTool } from './ImageStudio';
import { AdjustmentsIcon, CropIcon, DrawIcon, HarmonizeIcon, LightningBoltIcon, RemoveToolIcon, SelectIcon, SelectSubjectIcon, ShapeIcon, TextIcon, TransformIcon, UpscaleIcon } from './icons';

interface ToolbarProps {
    activeTool: ActiveTool;
    setActiveTool: (tool: ActiveTool) => void;
    toggleTextPlayground: () => void;
    isTextPlaygroundOpen: boolean;
    onUpscale: () => void;
    onSelectSubject: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, toggleTextPlayground, isTextPlaygroundOpen, onUpscale, onSelectSubject }) => {
    const ToolButton: React.FC<{ children: React.ReactNode, onClick: () => void, isActive?: boolean, title: string }> = ({ children, onClick, isActive, title }) => (
        <button onClick={onClick} title={title} className={`flex items-center justify-center w-12 h-12 rounded-lg transition-colors ${isActive ? 'bg-brand-primary text-white' : 'bg-gray-700/50 hover:bg-gray-600 text-dark-text-secondary hover:text-white'}`}>
            {children}
        </button>
    );
    
    const AIToolButton: React.FC<{ children: React.ReactNode, onClick: () => void, isActive?: boolean, title: string }> = (props) => (
        <div className="relative">
            <ToolButton {...props} />
            <span className="absolute top-0 right-0 bg-brand-accent text-black text-[8px] font-bold px-1 rounded-full">BETA</span>
        </div>
    );

    return (
        <nav className="bg-dark-surface p-2 flex flex-col items-center gap-2 border-r border-gray-700">
            <ToolButton onClick={() => setActiveTool(activeTool === 'select' ? null : 'select')} isActive={activeTool === 'select'} title="Select & Move"><SelectIcon className="w-6 h-6"/></ToolButton>
            <ToolButton onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')} isActive={activeTool === 'crop'} title="Crop"><CropIcon className="w-6 h-6"/></ToolButton>
            <ToolButton onClick={() => setActiveTool(activeTool === 'transform' ? null : 'transform')} isActive={activeTool === 'transform'} title="Transform"><TransformIcon className="w-6 h-6"/></ToolButton>
            <ToolButton onClick={() => setActiveTool(activeTool === 'adjust' ? null : 'adjust')} isActive={activeTool === 'adjust'} title="Adjustments"><AdjustmentsIcon className="w-6 h-6"/></ToolButton>
            
            <div className="w-full h-[1px] bg-gray-700 my-2" />

            <ToolButton onClick={() => setActiveTool(activeTool === 'draw' ? null : 'draw')} isActive={activeTool === 'draw'} title="Draw"><DrawIcon className="w-6 h-6"/></ToolButton>
            <ToolButton onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')} isActive={activeTool === 'text'} title="Text"><TextIcon className="w-6 h-6"/></ToolButton>
            <ToolButton onClick={() => setActiveTool(activeTool === 'shape' ? null : 'shape')} isActive={activeTool === 'shape'} title="Shape"><ShapeIcon className="w-6 h-6"/></ToolButton>

            <div className="w-full h-[1px] bg-gray-700 my-2" />

            <AIToolButton onClick={() => setActiveTool(activeTool === 'harmonize' ? null : 'harmonize')} isActive={activeTool === 'harmonize'} title="Harmonize"><HarmonizeIcon className="w-6 h-6" /></AIToolButton>
            <AIToolButton onClick={onUpscale} title="Generative Upscale"><UpscaleIcon className="w-6 h-6" /></AIToolButton>
            <AIToolButton onClick={() => setActiveTool(activeTool === 'remove' ? null : 'remove')} isActive={activeTool === 'remove'} title="Remove Tool"><RemoveToolIcon className="w-6 h-6" /></AIToolButton>
            <AIToolButton onClick={onSelectSubject} title="Select Subject"><SelectSubjectIcon className="w-6 h-6" /></AIToolButton>
            
            <div className="flex-grow" />

            <ToolButton onClick={toggleTextPlayground} isActive={isTextPlaygroundOpen} title="AI Assistant"><LightningBoltIcon className="w-6 h-6" /></ToolButton>
        </nav>
    );
};
