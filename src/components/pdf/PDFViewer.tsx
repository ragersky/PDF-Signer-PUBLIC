import { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Tool, SignatureData, TextAnnotation, HighlightAnnotation } from '@/types/pdf-editor';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File;
  currentPage: number;
  scale: number;
  activeTool: Tool;
  signatures: SignatureData[];
  texts: TextAnnotation[];
  highlights: HighlightAnnotation[];
  onAddSignature: (signature: Omit<SignatureData, 'id'>) => void;
  onAddText: (text: Omit<TextAnnotation, 'id'>) => void;
  onAddHighlight: (highlight: Omit<HighlightAnnotation, 'id'>) => void;
  onUpdateSignature: (id: string, updates: Partial<SignatureData>) => void;
  onUpdateText: (id: string, updates: Partial<TextAnnotation>) => void;
  onDeleteSignature: (id: string) => void;
  onDeleteText: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
  onDocumentLoad: (numPages: number) => void;
  signatureToPlace: string | null;
  onSignaturePlaced: () => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export function PDFViewer({
  file,
  currentPage,
  scale,
  activeTool,
  signatures,
  texts,
  highlights,
  onAddSignature,
  onAddText,
  onAddHighlight,
  onUpdateSignature,
  onUpdateText,
  onDeleteSignature,
  onDeleteText,
  onDeleteHighlight,
  onDocumentLoad,
  signatureToPlace,
  onSignaturePlaced,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [highlightStart, setHighlightStart] = useState<{ x: number; y: number } | null>(null);
  const [tempHighlight, setTempHighlight] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<{ id: string; handle: ResizeHandle; startX: number; startY: number; startWidth: number; startHeight: number; startLeft: number; startTop: number } | null>(null);

  const getCursorClass = () => {
    switch (activeTool) {
      case 'sign': return signatureToPlace ? 'cursor-copy' : 'cursor-default';
      case 'text': return 'canvas-cursor-text';
      case 'highlight': return 'canvas-cursor-highlight';
      default: return 'cursor-default';
    }
  };

  const handlePageLoad = useCallback((page: { width: number; height: number }) => {
    setPageSize({ width: page.width, height: page.height });
  }, []);

  const getRelativePosition = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }, [scale]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (draggingId || resizing) return;
    
    const { x, y } = getRelativePosition(e);

    if (activeTool === 'sign' && signatureToPlace) {
      onAddSignature({
        x,
        y,
        width: 150,
        height: 60,
        dataUrl: signatureToPlace,
        page: currentPage,
      });
      onSignaturePlaced();
    } else if (activeTool === 'text') {
      const newText: Omit<TextAnnotation, 'id'> = {
        x,
        y,
        text: '',
        fontSize: 16,
        color: '#1a1a2e',
        page: currentPage,
      };
      onAddText(newText);
    }
  }, [activeTool, signatureToPlace, currentPage, getRelativePosition, onAddSignature, onAddText, onSignaturePlaced, draggingId, resizing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'highlight') {
      const { x, y } = getRelativePosition(e);
      setHighlightStart({ x, y });
      setTempHighlight({ x, y, width: 0, height: 0 });
    }
  }, [activeTool, getRelativePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (highlightStart && activeTool === 'highlight') {
      const { x, y } = getRelativePosition(e);
      setTempHighlight({
        x: Math.min(highlightStart.x, x),
        y: Math.min(highlightStart.y, y),
        width: Math.abs(x - highlightStart.x),
        height: Math.abs(y - highlightStart.y),
      });
    }

    if (resizing) {
      const { x, y } = getRelativePosition(e);
      const signature = signatures.find(s => s.id === resizing.id);
      if (!signature) return;

      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;
      let newX = resizing.startLeft;
      let newY = resizing.startTop;

      const deltaX = x - resizing.startX;
      const deltaY = y - resizing.startY;

      switch (resizing.handle) {
        case 'se':
          newWidth = Math.max(50, resizing.startWidth + deltaX);
          newHeight = Math.max(30, resizing.startHeight + deltaY);
          break;
        case 'sw':
          newWidth = Math.max(50, resizing.startWidth - deltaX);
          newHeight = Math.max(30, resizing.startHeight + deltaY);
          newX = resizing.startLeft + (resizing.startWidth - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(50, resizing.startWidth + deltaX);
          newHeight = Math.max(30, resizing.startHeight - deltaY);
          newY = resizing.startTop + (resizing.startHeight - newHeight);
          break;
        case 'nw':
          newWidth = Math.max(50, resizing.startWidth - deltaX);
          newHeight = Math.max(30, resizing.startHeight - deltaY);
          newX = resizing.startLeft + (resizing.startWidth - newWidth);
          newY = resizing.startTop + (resizing.startHeight - newHeight);
          break;
      }

      onUpdateSignature(resizing.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
      return;
    }

    if (draggingId) {
      const { x, y } = getRelativePosition(e);
      const signature = signatures.find(s => s.id === draggingId);
      const text = texts.find(t => t.id === draggingId);
      
      if (signature) {
        onUpdateSignature(draggingId, {
          x: x - dragOffset.x,
          y: y - dragOffset.y,
        });
      } else if (text) {
        onUpdateText(draggingId, {
          x: x - dragOffset.x,
          y: y - dragOffset.y,
        });
      }
    }
  }, [highlightStart, activeTool, getRelativePosition, draggingId, dragOffset, signatures, texts, onUpdateSignature, onUpdateText, resizing]);

  const handleMouseUp = useCallback(() => {
    if (tempHighlight && tempHighlight.width > 10 && tempHighlight.height > 5) {
      onAddHighlight({
        ...tempHighlight,
        page: currentPage,
      });
    }
    setHighlightStart(null);
    setTempHighlight(null);
    setDraggingId(null);
    setResizing(null);
  }, [tempHighlight, currentPage, onAddHighlight]);

  const startDrag = useCallback((e: React.MouseEvent, id: string, itemX: number, itemY: number) => {
    e.stopPropagation();
    if (activeTool === 'highlight') return;
    
    const { x, y } = getRelativePosition(e);
    setDraggingId(id);
    setDragOffset({ x: x - itemX, y: y - itemY });
  }, [activeTool, getRelativePosition]);

  const startResize = useCallback((e: React.MouseEvent, id: string, handle: ResizeHandle, signature: SignatureData) => {
    e.stopPropagation();
    e.preventDefault();
    const { x, y } = getRelativePosition(e);
    setResizing({
      id,
      handle,
      startX: x,
      startY: y,
      startWidth: signature.width,
      startHeight: signature.height,
      startLeft: signature.x,
      startTop: signature.y,
    });
  }, [getRelativePosition]);

  const pageSignatures = signatures.filter(s => s.page === currentPage);
  const pageTexts = texts.filter(t => t.page === currentPage);
  const pageHighlights = highlights.filter(h => h.page === currentPage);

  const resizeHandleClass = "absolute w-3 h-3 bg-primary border-2 border-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity";

  return (
    <div className="flex-1 overflow-auto bg-muted/50 p-8 flex justify-center">
      <div
        ref={containerRef}
        className={`relative pdf-page-shadow bg-card ${getCursorClass()}`}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => onDocumentLoad(numPages)}
          loading={
            <div className="flex items-center justify-center w-[600px] h-[800px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            onLoadSuccess={handlePageLoad}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>

        {/* Highlights Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {pageHighlights.map((highlight) => (
            <div
              key={highlight.id}
              className="absolute bg-tool-highlight/40 pointer-events-auto cursor-pointer hover:bg-tool-highlight/60 transition-colors"
              style={{
                left: highlight.x,
                top: highlight.y,
                width: highlight.width,
                height: highlight.height,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'select') {
                  onDeleteHighlight(highlight.id);
                }
              }}
            />
          ))}
          {tempHighlight && (
            <div
              className="absolute bg-tool-highlight/40 border-2 border-tool-highlight"
              style={{
                left: tempHighlight.x,
                top: tempHighlight.y,
                width: tempHighlight.width,
                height: tempHighlight.height,
              }}
            />
          )}
        </div>

        {/* Signatures Layer */}
        <AnimatePresence>
          {pageSignatures.map((signature) => (
            <motion.div
              key={signature.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`absolute group ${activeTool !== 'highlight' ? 'cursor-move' : 'pointer-events-none'}`}
              style={{
                left: signature.x,
                top: signature.y,
                width: signature.width,
                height: signature.height,
              }}
              onMouseDown={(e) => startDrag(e, signature.id, signature.x, signature.y)}
            >
              <img
                src={signature.dataUrl}
                alt="Signature"
                className="w-full h-full object-contain"
                draggable={false}
              />
              {/* Resize handles */}
              {activeTool !== 'highlight' && (
                <>
                  <div
                    className={`${resizeHandleClass} -top-1.5 -left-1.5 cursor-nw-resize`}
                    onMouseDown={(e) => startResize(e, signature.id, 'nw', signature)}
                  />
                  <div
                    className={`${resizeHandleClass} -top-1.5 -right-1.5 cursor-ne-resize`}
                    onMouseDown={(e) => startResize(e, signature.id, 'ne', signature)}
                  />
                  <div
                    className={`${resizeHandleClass} -bottom-1.5 -left-1.5 cursor-sw-resize`}
                    onMouseDown={(e) => startResize(e, signature.id, 'sw', signature)}
                  />
                  <div
                    className={`${resizeHandleClass} -bottom-1.5 -right-1.5 cursor-se-resize`}
                    onMouseDown={(e) => startResize(e, signature.id, 'se', signature)}
                  />
                </>
              )}
              {activeTool === 'select' && (
                <button
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSignature(signature.id);
                  }}
                >
                  ×
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Text Annotations Layer */}
        <AnimatePresence>
          {pageTexts.map((textAnnotation) => (
            <motion.div
              key={textAnnotation.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`absolute group ${activeTool !== 'highlight' ? 'cursor-move' : ''}`}
              style={{
                left: textAnnotation.x,
                top: textAnnotation.y,
              }}
              onMouseDown={(e) => startDrag(e, textAnnotation.id, textAnnotation.x, textAnnotation.y)}
            >
              {editingTextId === textAnnotation.id ? (
                <input
                  type="text"
                  autoFocus
                  value={textAnnotation.text}
                  onChange={(e) => onUpdateText(textAnnotation.id, { text: e.target.value })}
                  onBlur={() => {
                    setEditingTextId(null);
                    if (!textAnnotation.text.trim()) {
                      onDeleteText(textAnnotation.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingTextId(null);
                      if (!textAnnotation.text.trim()) {
                        onDeleteText(textAnnotation.id);
                      }
                    }
                  }}
                  className="bg-transparent border-b-2 border-primary outline-none min-w-[100px] text-foreground"
                  style={{
                    fontSize: textAnnotation.fontSize,
                    color: textAnnotation.color,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="min-w-[20px] min-h-[20px] hover:bg-primary/10 rounded px-1 transition-colors"
                  style={{
                    fontSize: textAnnotation.fontSize,
                    color: textAnnotation.color,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTextId(textAnnotation.id);
                  }}
                >
                  {textAnnotation.text || <span className="text-muted-foreground italic">Click to edit...</span>}
                </div>
              )}
              {activeTool === 'select' && !editingTextId && (
                <button
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteText(textAnnotation.id);
                  }}
                >
                  ×
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}