/// <reference types="vite/client" />

interface Window {
  api: {
    db: {
      run: (query: string, params?: any[]) => Promise<any>;
      all: (query: string, params?: any[]) => Promise<any[]>;
      get: (query: string, params?: any[]) => Promise<any>;
      getSearchOptions?: (selectedCaste?: string) => Promise<any>;
    };
    saveImage: (data: string, fileName: string) => Promise<string>;
    getLocalImage: (filePath: string) => string;
    getSearchFilterOptions?: (selectedCaste?: string) => Promise<any>;
    pickAndSaveImage: (fileName: string) => Promise<string | null>;
    deleteCandidate: (id: number) => Promise<{ success: boolean; changes?: number; error?: string }>;
    vacuumDb?: () => Promise<{ success: boolean; error?: string }>;
  };
}
