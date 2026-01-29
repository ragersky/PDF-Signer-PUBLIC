import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UploadZone } from '@/components/pdf/UploadZone';
import { PDFEditor } from '@/components/pdf/PDFEditor';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <UploadZone onFileSelect={setSelectedFile} />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PDFEditor 
              file={selectedFile} 
              onClose={() => setSelectedFile(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
