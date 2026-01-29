export type Tool = 'select' | 'sign' | 'text' | 'highlight';

export interface SignatureData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  page: number;
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  page: number;
}

export interface HighlightAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface Annotation {
  signatures: SignatureData[];
  texts: TextAnnotation[];
  highlights: HighlightAnnotation[];
}

export interface PDFEditorState {
  file: File | null;
  numPages: number;
  currentPage: number;
  scale: number;
  activeTool: Tool;
  annotations: Annotation;
}
