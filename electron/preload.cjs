const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  db: {
    run: (query, params) => ipcRenderer.invoke('db:run', query, params),
    all: (query, params) => ipcRenderer.invoke('db:all', query, params),
    get: (query, params) => ipcRenderer.invoke('db:get', query, params),
    getSearchOptions: (selectedCaste) => ipcRenderer.invoke('db:getSearchOptions', selectedCaste),
  },
  getSearchFilterOptions: (selectedCaste) => ipcRenderer.invoke('get-search-filter-options', selectedCaste),
  // Legacy: kept for compatibility. Prefer pickAndSaveImage for new photo uploads.
  saveImage: (data, fileName) => ipcRenderer.invoke('save-image', { data, fileName }),
  // MEM-02 / MEM-05: Opens native OS file dialog in main process.
  // ONLY a file path string (~80 bytes) crosses the IPC bridge — zero Base64 overhead.
  pickAndSaveImage: (fileName) => ipcRenderer.invoke('pick-and-save-image', fileName),
  getLocalImage: (filePath) => `local-file://${filePath}`,
});
