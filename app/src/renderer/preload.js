// src/renderer/preload.js
// 업무Portal v2 — Preload (Context Bridge)
//
// 규칙:
//   renderer → main 통신은 오직 여기서만
//   engine/store 직접 접근 금지 (renderer에서 import)

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  focusWebContents: () => ipcRenderer.invoke('focus-webcontents'),
});
