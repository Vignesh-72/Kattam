/// <reference types="vite/client" />

interface Window {
  api: {
    db: {
      run: (query: string, params?: any[]) => Promise<any>;
      all: (query: string, params?: any[]) => Promise<any[]>;
      get: (query: string, params?: any[]) => Promise<any>;
    };
    saveImage: (data: string, fileName: string) => Promise<string>;
    getLocalImage: (filePath: string) => string;
  };
}
