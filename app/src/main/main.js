// src/main/main.js
// 업무Portal v2 — Electron Main Process
//
// 규칙:
//   IPC만 담당 — 비즈니스 로직 금지
//   Repository가 유일한 저장 담당
//   store.dispatch() 결과를 renderer로 전달하지 않음
//     (renderer가 직접 store를 import하므로)

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadSnapshot, saveSnapshot, closeDb } from './repository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1024,
    height: 700,
    minWidth:  760,
    minHeight: 500,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload:          join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  closeDb();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/* ── IPC: focus restore ──────────────────────────── */
ipcMain.handle('focus-webcontents', () => {
  mainWindow?.webContents.focus();
});

/* ── IPC: snapshot persistence ───────────────────── */
ipcMain.handle('snapshot:load', () => {
  return loadSnapshot();   // null or snapshot object
});

ipcMain.handle('snapshot:save', (_event, snapshot) => {
  saveSnapshot(snapshot);
  return { ok: true };
});

ipcMain.handle('snapshot:history', () => {
  const { loadHistory } = await import('./repository.js');
  return loadHistory();
});
