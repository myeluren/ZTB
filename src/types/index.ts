export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  children?: OutlineItem[];
}

export interface FormatSettings {
  contentStyle: 'detailed' | 'concise';
  pageCount: number;
  titleFormat: {
    fontFamily: string;
    fontSize: number;
    lineSpacing: number;
    numberingStyle: 'none' | 'decimal' | 'chinese' | 'alpha';
    beforeParagraph: number;
    afterParagraph: number;
    indentation: number;
  };
  bodyFormat: {
    fontFamily: string;
    fontSize: number;
    lineSpacing: number;
    beforeParagraph: number;
    afterParagraph: number;
    indentation: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface BidFile {
  id: string;
  name: string;
  content: string;
  uploadTime: Date;
}

export interface GenerationProgress {
  status: 'idle' | 'parsing' | 'generating' | 'building' | 'complete' | 'error';
  message: string;
  progress: number;
}

export type Step = 'upload' | 'outline' | 'format' | 'generate';
