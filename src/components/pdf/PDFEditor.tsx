import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PDFDocument, rgb } from 'pdf-lib';
import { Tool, SignatureData, TextAnnotation, HighlightAnnotation, Annotation } from '@/types/pdf-editor';
import { Toolbar } from './Toolbar';
import { PDFViewer } from './PDFViewer';
import { SignatureCanvas } from './SignatureCanvas';
import { useToast } from '@/hooks/use-toast';

interface PDFEditorProps {
  file: File;
  onClose: () => void;
}

export function PDFEditor({ file, onClose }: PDFEditorProps) {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureToPlace, setSignatureToPlace] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [annotations, setAnnotations] = useState<Annotation>({
    signatures: [],
    texts: [],
    highlights: [],
  });

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleToolChange = useCallback((tool: Tool) => {
    setActiveTool(tool);
    // Only open signature modal if we don't already have a signature to place
    if (tool === 'sign' && !signatureToPlace) {
      setShowSignatureModal(true);
    }
  }, [signatureToPlace]);

  const handleSignatureSave = useCallback((dataUrl: string) => {
    setSignatureToPlace(dataUrl);
    setShowSignatureModal(false);
    toast({
      title: "Signature created",
      description: "Click on the document to place your signature",
    });
  }, [toast]);

  const handleAddSignature = useCallback((signature: Omit<SignatureData, 'id'>) => {
    setAnnotations(prev => ({
      ...prev,
      signatures: [...prev.signatures, { ...signature, id: generateId() }],
    }));
  }, []);

  const handleAddText = useCallback((text: Omit<TextAnnotation, 'id'>) => {
    const newText = { ...text, id: generateId() };
    setAnnotations(prev => ({
      ...prev,
      texts: [...prev.texts, newText],
    }));
  }, []);

  const handleAddHighlight = useCallback((highlight: Omit<HighlightAnnotation, 'id'>) => {
    setAnnotations(prev => ({
      ...prev,
      highlights: [...prev.highlights, { ...highlight, id: generateId() }],
    }));
  }, []);

  const handleUpdateSignature = useCallback((id: string, updates: Partial<SignatureData>) => {
    setAnnotations(prev => ({
      ...prev,
      signatures: prev.signatures.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, []);

  const handleUpdateText = useCallback((id: string, updates: Partial<TextAnnotation>) => {
    setAnnotations(prev => ({
      ...prev,
      texts: prev.texts.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  }, []);

  const handleDeleteSignature = useCallback((id: string) => {
    setAnnotations(prev => ({
      ...prev,
      signatures: prev.signatures.filter(s => s.id !== id),
    }));
  }, []);

  const handleDeleteText = useCallback((id: string) => {
    setAnnotations(prev => ({
      ...prev,
      texts: prev.texts.filter(t => t.id !== id),
    }));
  }, []);

  const handleDeleteHighlight = useCallback((id: string) => {
    setAnnotations(prev => ({
      ...prev,
      highlights: prev.highlights.filter(h => h.id !== id),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setAnnotations({ signatures: [], texts: [], highlights: [] });
    toast({
      title: "Changes reset",
      description: "All annotations have been removed",
    });
  }, [toast]);

  const handleDownload = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      // Add signatures
      for (const signature of annotations.signatures) {
        const page = pages[signature.page - 1];
        if (!page) continue;

        const { height } = page.getSize();
        
        // Convert data URL to image
        const imageBytes = await fetch(signature.dataUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(imageBytes);
        
        page.drawImage(pngImage, {
          x: signature.x,
          y: height - signature.y - signature.height,
          width: signature.width,
          height: signature.height,
        });
      }

      // Add text annotations
      for (const text of annotations.texts) {
        if (!text.text.trim()) continue;
        
        const page = pages[text.page - 1];
        if (!page) continue;

        const { height } = page.getSize();
        
        page.drawText(text.text, {
          x: text.x,
          y: height - text.y - text.fontSize,
          size: text.fontSize,
          color: rgb(0.1, 0.1, 0.18),
        });
      }

      // Add highlights
      for (const highlight of annotations.highlights) {
        const page = pages[highlight.page - 1];
        if (!page) continue;

        const { height } = page.getSize();
        
        page.drawRectangle({
          x: highlight.x,
          y: height - highlight.y - highlight.height,
          width: highlight.width,
          height: highlight.height,
          color: rgb(0.98, 0.8, 0.08),
          opacity: 0.4,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF downloaded",
        description: "Your edited PDF has been saved",
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Error",
        description: "Failed to process the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [file, annotations, toast]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        onPageChange={setCurrentPage}
        onScaleChange={setScale}
        onDownload={handleDownload}
        onReset={handleReset}
        onBack={onClose}
        isProcessing={isProcessing}
      />

      <PDFViewer
        file={file}
        currentPage={currentPage}
        scale={scale}
        activeTool={activeTool}
        signatures={annotations.signatures}
        texts={annotations.texts}
        highlights={annotations.highlights}
        onAddSignature={handleAddSignature}
        onAddText={handleAddText}
        onAddHighlight={handleAddHighlight}
        onUpdateSignature={handleUpdateSignature}
        onUpdateText={handleUpdateText}
        onDeleteSignature={handleDeleteSignature}
        onDeleteText={handleDeleteText}
        onDeleteHighlight={handleDeleteHighlight}
        onDocumentLoad={setNumPages}
        signatureToPlace={signatureToPlace}
        onSignaturePlaced={() => setSignatureToPlace(null)}
      />

      <AnimatePresence>
        {showSignatureModal && (
          <SignatureCanvas
            onSave={handleSignatureSave}
            onClose={() => setShowSignatureModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
