import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Shield, Zap, Lock } from 'lucide-react';
import logo from '@/assets/logo.png';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-accent/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-12 relative z-10"
      >
        {/* Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <img src={logo} alt="Edit PDF" className="w-12 h-12 object-contain" />
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PDF Simple Signer
          </span>
        </motion.div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary text-sm font-medium mb-6 backdrop-blur-sm">
          <Zap className="w-4 h-4" />
          100% Free • No Sign-up Required
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
          Edit Your PDFs
          <span className="block text-3xl md:text-5xl mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Instantly & Securely
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Sign, annotate, and highlight your documents. 
          Everything happens in your browser. Your files never leave your device.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-2xl relative z-10"
      >
        <label
          className={`
            relative flex flex-col items-center justify-center p-12 cursor-pointer
            rounded-3xl border-2 border-dashed transition-all duration-300
            ${isDragging 
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-2xl shadow-primary/20' 
              : 'border-border hover:border-primary/50 hover:bg-card/50 hover:shadow-xl'
            }
            backdrop-blur-sm bg-card/30
          `}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <AnimatePresence mode="wait">
            {isDragging ? (
              <motion.div
                key="dragging"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                  <FileText className="w-12 h-12 text-white" />
                </div>
                <p className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Drop your PDF here!
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center mb-4 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold text-foreground mb-2">
                  Drop your PDF here
                </p>
                <p className="text-muted-foreground mb-4">
                  or click to browse your files
                </p>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
                  <Shield className="w-4 h-4" />
                  Supports files up to 50MB
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </label>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 relative z-10"
      >
        {[
          { icon: '✍️', label: 'Sign Documents', desc: 'Draw your signature' },
          { icon: '📝', label: 'Add Text', desc: 'Type anywhere' },
          { icon: '🖍️', label: 'Highlight', desc: 'Mark important parts' },
          { icon: '💾', label: 'Download', desc: 'Get your edited PDF' },
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300"
          >
            <span className="text-3xl">{feature.icon}</span>
            <span className="text-sm font-semibold text-foreground">{feature.label}</span>
            <span className="text-xs text-muted-foreground">{feature.desc}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="flex items-center gap-2 mt-8 text-muted-foreground text-sm relative z-10"
      >
        <Lock className="w-4 h-4" />
        <span>Your files are processed locally and never uploaded to any server</span>
      </motion.div>
    </div>
  );
}