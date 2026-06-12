// src/renderer/preload.js
// 업무Portal v2 — Preload (Context Bridge)
//
// 규칙:
//   renderer → main 통신은 오직 여기서만
//   노출 API는 최소한으로

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // focus
  focusWebContents: () => ipcRenderer.invoke('focus-webcontents'),

  // persistence
  snapshotLoad:    ()         => ipcRenderer.invoke('snapshot:load'),
  snapshotSave:    (snapshot) => ipcRenderer.invoke('snapshot:save', snapshot),
  snapshotHistory: ()         => ipcRenderer.invoke('snapshot:history'),
});
