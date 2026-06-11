// src/main/main.js
// 업무Portal v2 — Electron Main Process
//
// 규칙:
//   IPC만 담당 — 비즈니스 로직 금지
//   store.dispatch() 결과를 renderer로 전달
//   focus 복구는 focus-webcontents IPC로만

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1024,
    height: 700,
    minWidth: 760,
    minHeight: 500,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload:         join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'));

  // dev tools (개발 중)
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: focus restore (v1 교훈 — overlay close 후 포커스 복구) ──
ipcMain.handle('focus-webcontents', () => {
  mainWindow?.webContents.focus();
});
