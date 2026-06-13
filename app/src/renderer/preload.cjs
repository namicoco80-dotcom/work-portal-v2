// src/renderer/preload.cjs
// 업무Portal v2 — Preload
// CJS 필수 (Electron preload은 ESM 불가)
// contextIsolation: true 유지

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  focusWebContents: () => ipcRenderer.invoke('focus-webcontents'),
  snapshotLoad:     ()         => ipcRenderer.invoke('snapshot:load'),
  snapshotSave:     (snapshot) => ipcRenderer.invoke('snapshot:save', snapshot),
  snapshotHistory:  ()         => ipcRenderer.invoke('snapshot:history'),
});
