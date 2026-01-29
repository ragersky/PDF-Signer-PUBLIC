import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Trash2, Type, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

const COLORS = [
  { name: 'Black', value: '#1a1a2e' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Green', value: '#16a34a' },
];

export function SignatureCanvas({ onSave, onClose }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [signatureText, setSignatureText] = useState('');
  const [activeTab, setActiveTab] = useState('draw');
  
  // For smooth drawing
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const points = useRef<{ x: number; y: number }[]>([]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio for sharper lines
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Set drawing style for smooth lines
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    setCanvasReady(true);
  }, [selectedColor]);

  useEffect(() => {
    const timer = setTimeout(setupCanvas, 50);
    window.addEventListener('resize', setupCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', setupCanvas);
    };
  }, [setupCanvas]);

  // Update stroke color when color changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = selectedColor;
    }
  }, [selectedColor]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!canvasReady) return;
    
    const { x, y } = getCoordinates(e);
    lastPoint.current = { x, y };
    points.current = [{ x, y }];
    setIsDrawing(true);
  }, [getCoordinates, canvasReady]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasReady) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPoint.current) return;

    const { x, y } = getCoordinates(e);
    points.current.push({ x, y });

    // Use quadratic bezier curves for smoother lines
    if (points.current.length >= 3) {
      const len = points.current.length;
      const p0 = points.current[len - 3];
      const p1 = points.current[len - 2];
      const p2 = points.current[len - 1];
      
      // Calculate control point
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      ctx.stroke();
    } else {
      // For the first few points, just draw a line
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPoint.current = { x, y };
    setHasContent(true);
  }, [isDrawing, getCoordinates, canvasReady]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && points.current.length > 0) {
      // Draw the final segment
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && points.current.length >= 2) {
        const len = points.current.length;
        const p1 = points.current[len - 2];
        const p2 = points.current[len - 1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    setIsDrawing(false);
    lastPoint.current = null;
    points.current = [];
  }, [isDrawing]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !container) return;

    const rect = container.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
  }, []);

  const generateCursiveSignature = useCallback(() => {
    if (!signatureText.trim()) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !container) return;

    const rect = container.getBoundingClientRect();
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Calculate optimal font size
    const fontSize = Math.min(rect.width / (signatureText.length * 0.5), 56);
    
    // Create a more realistic handwritten effect by drawing multiple layers
    const drawHandwrittenText = () => {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // First, draw a slightly offset shadow for depth
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.font = `italic 600 ${fontSize}px "Segoe Script", "Lucida Handwriting", "Brush Script MT", cursive`;
      ctx.fillStyle = selectedColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(signatureText, centerX + 1, centerY + 1);
      ctx.restore();
      
      // Main text with slight slant transform for authenticity
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.transform(1, -0.02, 0.08, 1, 0, 0); // Subtle italic slant
      
      // Draw each character with slight variations for realism
      ctx.font = `italic 600 ${fontSize}px "Segoe Script", "Lucida Handwriting", "Brush Script MT", cursive`;
      ctx.fillStyle = selectedColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw main text
      ctx.fillText(signatureText, 0, 0);
      
      // Add a subtle stroke for pen-like effect
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      ctx.strokeText(signatureText, 0, 0);
      
      ctx.restore();
      
      // Measure text for underline
      ctx.font = `italic 600 ${fontSize}px "Segoe Script", "Lucida Handwriting", "Brush Script MT", cursive`;
      const textMetrics = ctx.measureText(signatureText);
      const textWidth = textMetrics.width * 1.1; // Account for slant
      
      // Draw a natural flowing underline with pen pressure variation
      const startX = centerX - textWidth / 2 - 10;
      const endX = centerX + textWidth / 2 + 20;
      const underlineY = centerY + fontSize * 0.35;
      
      ctx.beginPath();
      ctx.strokeStyle = selectedColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Create a natural flowing line with variable width
      const points: { x: number; y: number; pressure: number }[] = [];
      const steps = Math.floor((endX - startX) / 3);
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = startX + (endX - startX) * t;
        
        // Natural curve with slight lift at the end
        const baseY = underlineY;
        const curve = Math.sin(t * Math.PI) * 2; // Gentle arc
        const wave = Math.sin(t * 12) * 0.8; // Subtle hand tremor
        const endLift = t > 0.85 ? (t - 0.85) * 30 : 0; // Lift at end
        
        const y = baseY - curve + wave - endLift;
        
        // Pressure varies - lighter at start and end
        const pressure = Math.sin(t * Math.PI) * 0.8 + 0.4;
        
        points.push({ x, y, pressure });
      }
      
      // Draw the underline with variable width
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        ctx.beginPath();
        ctx.lineWidth = curr.pressure * 2.5;
        ctx.globalAlpha = 0.9;
        ctx.moveTo(prev.x, prev.y);
        
        // Use quadratic curve for smoothness
        if (i < points.length - 1) {
          const next = points[i + 1];
          const midX = (curr.x + next.x) / 2;
          const midY = (curr.y + next.y) / 2;
          ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
        } else {
          ctx.lineTo(curr.x, curr.y);
        }
        ctx.stroke();
      }
      
      // Add a small flourish at the end
      const lastPoint = points[points.length - 1];
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.quadraticCurveTo(
        lastPoint.x + 8, 
        lastPoint.y - 8,
        lastPoint.x + 12, 
        lastPoint.y - 3
      );
      ctx.stroke();
    };
    
    drawHandwrittenText();
    setHasContent(true);
  }, [signatureText, selectedColor]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Add padding
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const croppedWidth = maxX - minX;
    const croppedHeight = maxY - minY;
    
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;
    
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;

    croppedCtx.drawImage(
      canvas,
      minX, minY, croppedWidth, croppedHeight,
      0, 0, croppedWidth, croppedHeight
    );

    const dataUrl = croppedCanvas.toDataURL('image/png');
    onSave(dataUrl);
  }, [hasContent, onSave]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    clearCanvas();
    setHasContent(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-floating max-w-lg w-full overflow-hidden border border-border"
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Create Your Signature
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="draw" className="gap-2">
                <PenLine className="w-4 h-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="type" className="gap-2">
                <Type className="w-4 h-4" />
                Type
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="mt-0">
              <p className="text-sm text-muted-foreground mb-3">
                Draw your signature using your mouse or finger
              </p>
            </TabsContent>

            <TabsContent value="type" className="mt-0">
              <div className="flex gap-2 mb-3">
                <Input
                  type="text"
                  placeholder="Type your name..."
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={generateCursiveSignature}
                  disabled={!signatureText.trim()}
                  size="sm"
                >
                  Generate
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Color picker */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">Color:</span>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    selectedColor === color.value 
                      ? 'border-primary scale-110 shadow-md' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div 
            ref={containerRef}
            className="bg-white rounded-xl border-2 border-dashed border-border overflow-hidden shadow-inner h-48 relative"
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
          <Button variant="ghost" onClick={clearCanvas} className="gap-2 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasContent}
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Check className="w-4 h-4" />
              Apply Signature
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}