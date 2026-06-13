// src/main/repository.js
// 업무Portal v2 — Repository (Storage Adapter)
//
// Interface (변경 불가):
//   saveSnapshot(snapshot) → void
//   loadSnapshot()         → snapshot | null
//   loadHistory(limit)     → [{id, saved_at}]
//   closeDb()              → void
//
// Adapter:
//   SQLiteRepository  — 정식 (Node v20 LTS 환경)
//   MemoryRepository  — fallback (Node v24 / 네이티브 빌드 불가 환경)
//
// 현재: MemoryRepository 활성화
// TODO: Node v20 LTS 설치 후 SQLiteRepository로 교체

/* --- MemoryRepository --------------------------------
   앱 종료 시 데이터 초기화됨 (persistence 없음)
   Interface는 SQLiteRepository와 동일하게 유지
----------------------------------------------------- */
class MemoryRepository {
  constructor() {
    this._current = null;
    this._history = [];
  }

  saveSnapshot(snapshot) {
    this._current = JSON.parse(JSON.stringify(snapshot));  // deep clone
    this._history.push({
      id:       this._history.length + 1,
      saved_at: new Date().toISOString(),
      engine_version:   snapshot.engine_version,
      snapshot_version: snapshot.snapshot_version,
    });
  }

  loadSnapshot() {
    return this._current ? JSON.parse(JSON.stringify(this._current)) : null;
  }

  loadHistory(limit = 20) {
    return [...this._history].reverse().slice(0, limit);
  }

  closeDb() { /* no-op */ }
}

/* --- SQLiteRepository (비활성화) ----------------------
   Node v20 LTS + better-sqlite3 환경에서 활성화
   import { createRequire } from 'module';
   import { app } from 'electron';
   import { join } from 'path';
   const require = createRequire(import.meta.url);
   const Database = require('better-sqlite3');
   ...
----------------------------------------------------- */

// ── Active Adapter ────────────────────────────────
// SQLite 준비되면 여기만 교체:
// const repo = new SQLiteRepository();
const repo = new MemoryRepository();

export const saveSnapshot  = (s)      => repo.saveSnapshot(s);
export const loadSnapshot  = ()       => repo.loadSnapshot();
export const loadHistory   = (n = 20) => repo.loadHistory(n);
export const closeDb       = ()       => repo.closeDb();
