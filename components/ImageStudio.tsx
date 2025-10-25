
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { editOrCreateImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { UploadIcon, SparklesIcon, AdjustmentsIcon, ResetIcon, TransformIcon, RotateLeftIcon, RotateRightIcon, FlipHorizontalIcon, FlipVerticalIcon, CropIcon, LayersIcon, DrawIcon, TextIcon, HarmonizeIcon, UpscaleIcon, RemoveToolIcon, SelectSubjectIcon, SelectIcon, ShapeIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

const INITIAL_ADJUSTMENTS = {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    grayscale: 0,
    sepia: 0,
    invert: 0,
    blur: 0,
    hueRotate: 0,
};

const INITIAL_TRANSFORMS = {
    rotate: 0,
    flip: { horizontal: false, vertical: false },
};

type ActiveTool = 'adjust' | 'transform' | 'crop' | 'draw' | 'text' | 'shape' | 'select' | 'harmonize' | 'remove' | null;
type Adjustment = keyof typeof INITIAL_ADJUSTMENTS;
type Point = { x: number, y: number };
type Path = { points: Point[], color: string, size: number, id: string };
type TextElement = { text: string, x: number, y: number, color: string, size: number, id: string, hasOutline: boolean, outlineColor: string, outlineWidth: number };
type ShapeType = 'rectangle' | 'circle' | 'line';
type ShapeElement = { type: ShapeType, x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number, id: string };

export const ImageStudio: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');

    const [activeTool, setActiveTool] = useState<ActiveTool>(null);
    const [adjustments, setAdjustments] = useState(INITIAL_ADJUSTMENTS);
    const [transforms, setTransforms] = useState(INITIAL_TRANSFORMS);
    
    // Tool States
    const [cropRect, setCropRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [paths, setPaths] = useState<Path[]>([]);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(5);

    const [texts, setTexts] = useState<TextElement[]>([]);
    const [currentText, setCurrentText] = useState('');
    const [textColor, setTextColor] = useState('#ffffff');
    const [textSize, setTextSize] = useState(32);
    const [textPosition, setTextPosition] = useState<Point | null>(null);
    const [hasTextOutline, setHasTextOutline] = useState(false);
    const [textOutlineColor, setTextOutlineColor] = useState('#000000');
    const [textOutlineSize, setTextOutlineSize] = useState(2);
    
    const [shapes, setShapes] = useState<ShapeElement[]>([]);
    const [shapeType, setShapeType] = useState<ShapeType>('rectangle');
    const [shapeColor, setShapeColor] = useState('#4285F4');
    const [shapeStrokeWidth, setShapeStrokeWidth] = useState(4);
    
    // Selection & Manipulation
    const [selectedElement, setSelectedElement] = useState<{ type: 'text' | 'shape', id: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPoint = useRef({ x: 0, y: 0 });
    
    // AI Tool States
    const [foregroundImage, setForegroundImage] = useState<string | null>(null);
    const [removeMask, setRemoveMask] = useState<Path[]>([]);
    const [removeBrushSize, setRemoveBrushSize] = useState(20);
    const [subjectMask, setSubjectMask] = useState<string | null>(null);

    const imageRef = useRef<HTMLImageElement>(new Image());
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const startPoint = useRef<Point | null>(null);
    
    useEffect(() => {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        if (!image || !canvas || !originalImage) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const render = () => {
            const { brightness, contrast, saturate, grayscale, sepia, invert, blur, hueRotate } = adjustments;
            const { rotate, flip } = transforms;
            const rad = rotate * Math.PI / 180;
            const w = image.naturalWidth; const h = image.naturalHeight;
            const absCos = Math.abs(Math.cos(rad)); const absSin = Math.abs(Math.sin(rad));
            canvas.width = w * absCos + h * absSin; canvas.height = h * absCos + w * absSin;

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rad);
            ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%) sepia(${sepia}%) invert(${invert}%) blur(${blur}px) hue-rotate(${hueRotate}deg)`;
            ctx.drawImage(image, -w / 2, -h / 2, w, h);
            ctx.restore();
            
            const drawPath = (path: Path) => {
                 if(path.points.length < 2) return;
                ctx.beginPath();
                ctx.strokeStyle = path.color;
                ctx.lineWidth = path.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(path.points[0].x, path.points[0].y);
                for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
                ctx.stroke();
            };
            
            paths.forEach(drawPath);
            if (activeTool === 'remove') removeMask.forEach(drawPath);
            
            shapes.forEach(shape => {
                ctx.strokeStyle = shape.color;
                ctx.lineWidth = shape.strokeWidth;
                ctx.beginPath();
                if (shape.type === 'rectangle') {
                    ctx.rect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
                } else if (shape.type === 'circle') {
                    const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
                    ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI);
                } else if (shape.type === 'line') {
                    ctx.moveTo(shape.x1, shape.y1);
                    ctx.lineTo(shape.x2, shape.y2);
                }
                ctx.stroke();
            });
            
            texts.forEach(text => {
                ctx.fillStyle = text.color;
                ctx.font = `bold ${text.size}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                if(text.hasOutline) {
                    ctx.strokeStyle = text.outlineColor;
                    ctx.lineWidth = text.outlineWidth;
                    ctx.strokeText(text.text, text.x, text.y);
                }
                ctx.fillText(text.text, text.x, text.y);
            });
            
            if (subjectMask) {
                const maskImg = new Image();
                maskImg.src = subjectMask;
                ctx.globalAlpha = 0.5;
                ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1.0;
            }

            if (activeTool === 'crop' && cropRect) {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
                ctx.strokeStyle = '#4285F4'; ctx.lineWidth = 2;
                ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
                ctx.restore();
            }
            
            if (selectedElement) {
                ctx.strokeStyle = '#FBBC05'; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
                if (selectedElement.type === 'text') {
                    const el = texts.find(t => t.id === selectedElement.id);
                    if (el) {
                        const textMetrics = ctx.measureText(el.text);
                        ctx.strokeRect(el.x - 2, el.y - 2, textMetrics.width + 4, el.size + 4);
                    }
                } else if (selectedElement.type === 'shape') {
                    const el = shapes.find(s => s.id === selectedElement.id);
                    if (el) ctx.strokeRect(Math.min(el.x1, el.x2) - 2, Math.min(el.y1, el.y2) - 2, Math.abs(el.x2-el.x1) + 4, Math.abs(el.y2-el.y1) + 4);
                }
                ctx.setLineDash([]);
            }
        };

        if (image.src !== originalImage) {
            image.src = originalImage;
            image.onload = render;
        } else {
            render();
        }

    }, [originalImage, adjustments, transforms, activeTool, cropRect, paths, texts, shapes, removeMask, subjectMask, selectedElement]);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, setImageFunc: (b64: string) => void) => {
        const file = event.target.files?.[0];
        if (file) {
            if (setImageFunc === setOriginalImage) handleReset();
            try {
                const base64 = await fileToBase64(file);
                setImageFunc(base64);
                if (setImageFunc === setOriginalImage) setFileName(file.name);
            } catch (err) {
                setError('Failed to read file.');
            }
        }
    }, []);

    const handleSubmit = async (overridePrompt?: string, overrideImages?: (string | null)[]) => {
        const currentPrompt = overridePrompt || prompt;
        if (!currentPrompt) {
            setError('Please enter a prompt.');
            return;
        }
        
        let imageToSend = null;
        if(originalImage && canvasRef.current) {
            imageToSend = canvasRef.current.toDataURL('image/png');
        }
        
        const imagesToSend = overrideImages || [imageToSend];

        if (!imagesToSend.some(img => img) && !currentPrompt) {
            setError('Please upload an image or enter a prompt to create one.');
            return;
        }

        setIsLoading(true); setError(null); setGeneratedImage(null);

        try {
            const result = await editOrCreateImage(currentPrompt, imagesToSend);
            setGeneratedImage(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate image: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setGeneratedImage(null); setError(null); setAdjustments(INITIAL_ADJUSTMENTS); setTransforms(INITIAL_TRANSFORMS); setActiveTool(null);
        setCropRect(null); setPaths([]); setTexts([]); setTextPosition(null); setCurrentText(''); setShapes([]); setSelectedElement(null);
        setForegroundImage(null); setRemoveMask([]); setSubjectMask(null);
    }
    
    const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoordinates(e);
        if(!coords) return;
        startPoint.current = coords;
        setIsDrawing(true);
        setSelectedElement(null);

        if (['draw', 'remove'].includes(activeTool || '')) {
            const newPath = { points: [coords], color: activeTool === 'remove' ? '#ff007f' : brushColor, size: activeTool === 'remove' ? removeBrushSize : brushSize, id: Date.now().toString() };
            if (activeTool === 'draw') setPaths(prev => [...prev, newPath]);
            else if (activeTool === 'remove') setRemoveMask(prev => [...prev, newPath]);
        } else if (activeTool === 'text') {
            setTextPosition(coords);
        } else if (activeTool === 'shape') {
            setShapes(prev => [...prev, {type: shapeType, x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y, color: shapeColor, strokeWidth: shapeStrokeWidth, id: Date.now().toString() }]);
        } else if (activeTool === 'select') {
            const foundText = texts.find(t => coords.x >= t.x && coords.x <= t.x + (t.size*t.text.length*0.6) && coords.y >= t.y && coords.y <= t.y + t.size);
            if (foundText) {
                setSelectedElement({ type: 'text', id: foundText.id });
                setIsDragging(true);
                dragStartPoint.current = { x: coords.x - foundText.x, y: coords.y - foundText.y };
                return;
            }
            const foundShape = shapes.find(s => coords.x >= Math.min(s.x1,s.x2) && coords.x <= Math.max(s.x1, s.x2) && coords.y >= Math.min(s.y1, s.y2) && coords.y <= Math.max(s.y1, s.y2));
            if (foundShape) {
                setSelectedElement({ type: 'shape', id: foundShape.id });
                setIsDragging(true);
                dragStartPoint.current = { x: coords.x - foundShape.x1, y: coords.y - foundShape.y1 };
                return;
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const coords = getCanvasCoordinates(e);
        if(!coords) return;

        if (activeTool === 'select' && isDragging && selectedElement) {
             if (selectedElement.type === 'text') {
                setTexts(texts.map(t => t.id === selectedElement.id ? { ...t, x: coords.x - dragStartPoint.current.x, y: coords.y - dragStartPoint.current.y } : t));
            } else if (selectedElement.type === 'shape') {
                setShapes(shapes.map(s => {
                    if (s.id !== selectedElement.id) return s;
                    const dx = coords.x - dragStartPoint.current.x - s.x1;
                    const dy = coords.y - dragStartPoint.current.y - s.y1;
                    return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
                }));
            }
        } else if (activeTool === 'crop' && startPoint.current) {
            setCropRect({ x: Math.min(startPoint.current.x, coords.x), y: Math.min(startPoint.current.y, coords.y), width: Math.abs(startPoint.current.x - coords.x), height: Math.abs(startPoint.current.y - coords.y) });
        } else if (['draw', 'remove'].includes(activeTool || '')) {
            const updater = activeTool === 'draw' ? setPaths : setRemoveMask;
            updater(prev => {
                const newPaths = [...prev];
                newPaths[newPaths.length-1].points.push(coords);
                return newPaths;
            });
        } else if (activeTool === 'shape') {
            setShapes(prev => {
                const newShapes = [...prev];
                newShapes[newShapes.length-1].x2 = coords.x;
                newShapes[newShapes.length-1].y2 = coords.y;
                return newShapes;
            });
        }
    };
    
    const handleMouseUpOrLeave = () => { setIsDrawing(false); setIsDragging(false); startPoint.current = null; };

    const handleApplyCrop = () => {
        if (!cropRect || !canvasRef.current || cropRect.width <= 0 || cropRect.height <= 0) return;
        const { x, y, width, height } = cropRect;
        const sourceCanvas = canvasRef.current;
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d'); if (!cropCtx) return;
        cropCanvas.width = width; cropCanvas.height = height;
        cropCtx.drawImage(sourceCanvas, x, y, width, height, 0, 0, width, height);
        handleReset();
        setOriginalImage(cropCanvas.toDataURL('image/png'));
        setFileName('cropped-image.png');
    };
    
    const handleAddText = () => {
        if (currentText.trim() && textPosition) {
            // FIX: Use `hasTextOutline` state variable for the `hasOutline` property.
            setTexts(prev => [...prev, { text: currentText, x: textPosition.x, y: textPosition.y, color: textColor, size: textSize, id: Date.now().toString(), hasOutline: hasTextOutline, outlineColor: textOutlineColor, outlineWidth: textOutlineSize }]);
            setCurrentText(''); setTextPosition(null);
        }
    };
    
    // AI TOOL HANDLERS
    const handleApplyRemove = async () => {
        if (!originalImage || removeMask.length === 0) return;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvasRef.current?.width || 0;
        maskCanvas.height = canvasRef.current?.height || 0;
        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = 'black'; ctx.fillRect(0,0,maskCanvas.width, maskCanvas.height);
        ctx.strokeStyle = 'white'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        removeMask.forEach(path => {
            if (path.points.length < 2) return;
            ctx.lineWidth = path.size;
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
            ctx.stroke();
        });
        const maskDataUrl = maskCanvas.toDataURL('image/png');
        const currentCanvasImage = canvasRef.current?.toDataURL('image/png');
        await handleSubmit("Remove the area indicated by the white mask.", [currentCanvasImage || null, maskDataUrl]);
        setRemoveMask([]);
    }
    
    const handleUpscale = async () => handleSubmit("Upscale this image to a higher resolution, improving quality, clarity, and sharpness. Make it look like 8 megapixels.", [canvasRef.current?.toDataURL('image/png') || null]);
    const handleHarmonize = async () => handleSubmit("Harmonize the two images. The first is the background, the second is a foreground object. Seamlessly integrate the object into the background, adjusting lighting and colors for a realistic result.", [canvasRef.current?.toDataURL('image/png') || null, foregroundImage]);
    const handleSelectSubject = async () => {
        setIsLoading(true); setError(null);
        try {
            const result = await editOrCreateImage("Create a black and white mask of the main subject of this image. The subject should be white and the background black.", [canvasRef.current?.toDataURL('image/png') || null]);
            setSubjectMask(result);
        } catch(e) {
            setError("Failed to select subject.")
        } finally {
            setIsLoading(false);
        }
    }
    
    const getCanvasCursor = () => {
        switch(activeTool) {
            case 'crop': return 'cursor-crosshair';
            case 'draw': return 'cursor-crosshair';
            case 'remove': return 'cursor-crosshair';
            case 'text': return 'cursor-text';
            case 'select': return isDragging ? 'cursor-grabbing' : 'cursor-grab';
            default: return '';
        }
    };

    const ToolButton: React.FC<{ children: React.ReactNode, onClick: () => void, isActive?: boolean, disabled?: boolean, title?: string }> = ({ children, onClick, isActive, disabled, title }) => (
        <button onClick={onClick} disabled={disabled} title={title} className={`flex items-center justify-center gap-2 p-2 rounded-md transition-colors text-sm ${isActive ? 'bg-brand-primary/80 text-white' : 'bg-gray-700 hover:bg-gray-600'} disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}>
            {children}
        </button>
    );
    
    const AIToolButton: React.FC<{ children: React.ReactNode, onClick: () => void, isActive?: boolean, disabled?: boolean, title?: string }> = (props) => (
        <div className="relative">
            <ToolButton {...props} />
            <span className="absolute -top-1.5 -right-1.5 bg-brand-accent text-black text-[8px] font-bold px-1 rounded-full">BETA</span>
        </div>
    );

    return (
        <div className="bg-dark-surface rounded-xl shadow-2xl p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-brand-accent" />
                Image Studio
            </h2>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Editor Section */}
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-4 border-2 border-dashed border-gray-600 min-h-[320px]">
                        <label htmlFor="file-upload" className="cursor-pointer text-center">
                            {originalImage ? (
                                <canvas ref={canvasRef} className={`max-h-[300px] w-auto rounded-md object-contain ${getCanvasCursor()}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave} />
                            ) : (
                                <div className="flex flex-col items-center text-dark-text-secondary">
                                    <UploadIcon className="w-12 h-12 mb-2" />
                                    <span className="font-semibold">Click to upload an image</span>
                                    <span className="text-sm">or generate one from a prompt</span>
                                </div>
                            )}
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setOriginalImage)} />
                        {fileName && <p className="text-xs text-dark-text-secondary mt-2 truncate max-w-full">{fileName}</p>}
                    </div>
                    {originalImage && (
                        <>
                           <div className="bg-gray-900/50 rounded-lg p-2">
                                <p className="text-xs font-bold text-dark-text-secondary mb-2 px-2">CREATIVE TOOLS</p>
                                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                                    <ToolButton onClick={() => setActiveTool(activeTool === 'select' ? null : 'select')} isActive={activeTool === 'select'} title="Select & Move"><SelectIcon className="w-5 h-5"/></ToolButton>
                                    <ToolButton onClick={() => {}} disabled={true} title="Layers (coming soon)"><LayersIcon className="w-5 h-5"/></ToolButton>
                                    <ToolButton onClick={() => setActiveTool(activeTool === 'draw' ? null : 'draw')} isActive={activeTool === 'draw'} title="Draw"><DrawIcon className="w-5 h-5"/></ToolButton>
                                    <ToolButton onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')} isActive={activeTool === 'text'} title="Text"><TextIcon className="w-5 h-5"/></ToolButton>
                                    <ToolButton onClick={() => setActiveTool(activeTool === 'shape' ? null : 'shape')} isActive={activeTool === 'shape'} title="Shape"><ShapeIcon className="w-5 h-5"/></ToolButton>
                                    <ToolButton onClick={() => setActiveTool(activeTool === 'adjust' ? null : 'adjust')} isActive={activeTool === 'adjust'} title="Adjustments"><AdjustmentsIcon className="w-5 h-5"/></ToolButton>
                                    <ToolButton onClick={() => setActiveTool(activeTool === 'transform' ? null : 'transform')} isActive={activeTool === 'transform'} title="Transform"><TransformIcon className="w-5 h-5"/></ToolButton>
                                    <ToolButton onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')} isActive={activeTool === 'crop'} title="Crop"><CropIcon className="w-5 h-5"/></ToolButton>
                                </div>
                            </div>
                             <div className="bg-gray-900/50 rounded-lg p-2">
                                <p className="text-xs font-bold text-dark-text-secondary mb-2 px-2">AI TOOLS</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <AIToolButton onClick={() => setActiveTool(activeTool === 'harmonize' ? null : 'harmonize')} isActive={activeTool === 'harmonize'} title="Harmonize"><HarmonizeIcon className="w-5 h-5" /> Harmonize</AIToolButton>
                                    <AIToolButton onClick={handleUpscale} title="Generative Upscale"><UpscaleIcon className="w-5 h-5" /> Upscale</AIToolButton>
                                    <AIToolButton onClick={() => setActiveTool(activeTool === 'remove' ? null : 'remove')} isActive={activeTool === 'remove'} title="Remove Tool"><RemoveToolIcon className="w-5 h-5" /> Remove</AIToolButton>
                                    <AIToolButton onClick={handleSelectSubject} title="Select Subject"><SelectSubjectIcon className="w-5 h-5" /> Select</AIToolButton>
                                </div>
                            </div>
                            
                            {/* TOOL PANELS */}
                            {activeTool === 'harmonize' && (
                                 <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                                    <label htmlFor="foreground-upload" className="w-full text-center cursor-pointer bg-gray-700 hover:bg-gray-600 p-3 rounded-md text-sm">
                                        {foregroundImage ? "Change Foreground Image" : "Upload Foreground Image"}
                                    </label>
                                    <input id="foreground-upload" type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, setForegroundImage)} />
                                    {foregroundImage && <img src={foregroundImage} className="max-h-24 mx-auto rounded-md" />}
                                    <button onClick={handleHarmonize} disabled={!foregroundImage} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-500">Apply Harmonize</button>
                                </div>
                            )}
                            {activeTool === 'remove' && (
                                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                                    <p className="text-xs text-dark-text-secondary">Paint over the area you want to remove.</p>
                                    <input type="range" min="5" max="100" value={removeBrushSize} onChange={e => setRemoveBrushSize(Number(e.target.value))} className="w-full"/>
                                    <button onClick={handleApplyRemove} disabled={removeMask.length === 0} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-500">Apply Remove Tool</button>
                                </div>
                            )}
                            {activeTool === 'shape' && (
                                 <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                                    <div className="flex justify-around">
                                        <button onClick={() => setShapeType('rectangle')} className={shapeType === 'rectangle' ? 'text-brand-primary' : ''}>Rectangle</button>
                                        <button onClick={() => setShapeType('circle')} className={shapeType === 'circle' ? 'text-brand-primary' : ''}>Circle</button>
                                        <button onClick={() => setShapeType('line')} className={shapeType === 'line' ? 'text-brand-primary' : ''}>Line</button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm">Color</label>
                                        <input type="color" value={shapeColor} onChange={e => setShapeColor(e.target.value)} className="w-8 h-8"/>
                                    </div>
                                    <input type="range" min="1" max="50" value={shapeStrokeWidth} onChange={e => setShapeStrokeWidth(Number(e.target.value))} className="w-full"/>
                                </div>
                            )}
                            {activeTool === 'draw' && (
                                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-4"><label className="text-sm">Color</label><input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8"/></div>
                                    <input type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full"/>
                                </div>
                            )}
                            {activeTool === 'text' && (
                                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                                     <p className="text-xs text-dark-text-secondary">Click on the image to set text position.</p>
                                    <input type="text" value={currentText} onChange={e => setCurrentText(e.target.value)} placeholder="Type your text..." className="w-full bg-gray-800 border border-gray-600 rounded-md p-2"/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2"><label>Color</label><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8"/></div>
                                        <div><input type="range" min="8" max="128" value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="w-full"/></div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasTextOutline} onChange={e => setHasTextOutline(e.target.checked)} /> Enable Outline</div>
                                    {hasTextOutline && <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2"><label>Outline</label><input type="color" value={textOutlineColor} onChange={e => setTextOutlineColor(e.target.value)} className="w-8 h-8"/></div>
                                        <div><input type="range" min="1" max="20" value={textOutlineSize} onChange={e => setTextOutlineSize(Number(e.target.value))} className="w-full"/></div>
                                    </div>}
                                    <button onClick={handleAddText} disabled={!textPosition || !currentText.trim()} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-500">Add Text</button>
                                </div>
                            )}
                            {activeTool === 'adjust' && (
                                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                                    <input type="range" name="brightness" value={adjustments.brightness} onChange={(e) => setAdjustments(p=>({...p, brightness: +e.target.value}))} />
                                    {/* ... other sliders ... */}
                                </div>
                            )}
                             {activeTool === 'transform' && (
                                <div className="bg-gray-900/50 rounded-lg p-4 grid grid-cols-2 gap-2">
                                    <ToolButton onClick={() => setTransforms(p=>({ ...p, rotate: (p.rotate-90+360)%360}))}><RotateLeftIcon className="w-5 h-5"/>Rotate</ToolButton>
                                    <ToolButton onClick={() => setTransforms(p=>({ ...p, rotate: (p.rotate+90)%360}))}><RotateRightIcon className="w-5 h-5"/>Rotate</ToolButton>
                                    <ToolButton onClick={() => setTransforms(p=>({ ...p, flip: {...p.flip, horizontal:!p.flip.horizontal}}))}><FlipHorizontalIcon className="w-5 h-5"/>Flip</ToolButton>
                                    <ToolButton onClick={() => setTransforms(p=>({ ...p, flip: {...p.flip, vertical:!p.flip.vertical}}))}><FlipVerticalIcon className="w-5 h-5"/>Flip</ToolButton>
                                </div>
                            )}
                            {activeTool === 'crop' && cropRect && (
                                <div className="bg-gray-900/50 rounded-lg p-4 flex justify-center gap-4">
                                    <button onClick={handleApplyCrop} className="flex items-center justify-center bg-brand-secondary text-white font-bold py-2 px-4 rounded-md">Apply Crop</button>
                                    <button onClick={() => { setActiveTool(null); setCropRect(null); }} className="flex items-center justify-center bg-gray-700 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                                </div>
                            )}
                            <div className="flex justify-end"><ToolButton onClick={handleReset}><ResetIcon className="w-5 h-5" /> Reset All</ToolButton></div>
                        </>
                    )}
                </div>

                {/* Generated Image Section */}
                <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-4 border-2 border-dashed border-gray-600 min-h-[320px]">
                    {isLoading ? ( <div className="flex flex-col items-center text-dark-text-secondary"><LoadingSpinner /><p className="mt-2">Generating your masterpiece...</p></div>
                    ) : generatedImage ? ( <img src={generatedImage} alt="Generated" className="max-h-80 rounded-md object-contain" />
                    ) : ( <div className="text-center text-dark-text-secondary"><SparklesIcon className="w-12 h-12 mx-auto mb-2" /><p>Your AI-generated image will appear here.</p></div> )}
                </div>
            </div>

            {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={originalImage ? "Describe your AI edit..." : "Describe the image you want to create..."} className="flex-grow bg-gray-800 border border-gray-600 rounded-md p-3" rows={2}/>
                <button onClick={() => handleSubmit()} disabled={isLoading || !prompt} className="flex items-center justify-center bg-brand-primary text-white font-bold py-3 px-6 rounded-md hover:bg-blue-600 disabled:bg-gray-500">
                    {isLoading ? <LoadingSpinner /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                    <span>{originalImage ? 'Edit with AI' : 'Create Image'}</span>
                </button>
            </div>
        </div>
    );
};
