// src/main/main.js
// 업무Portal v2 — Electron Main Process

import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadSnapshot, saveSnapshot, loadHistory, closeDb } from './repository.js';

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
      preload:          join(__dirname, '../renderer/preload.cjs'),  // CJS preload
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,  // preload에서 require 필요
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

/* ── IPC ────────────────────────────────────────── */
ipcMain.handle('focus-webcontents', () => {
  mainWindow?.webContents.focus();
});

ipcMain.handle('snapshot:load', () => {
  return loadSnapshot();
});

ipcMain.handle('snapshot:save', (_event, snapshot) => {
  saveSnapshot(snapshot);
  return { ok: true };
});

ipcMain.handle('snapshot:history', () => {
  return loadHistory();
});
