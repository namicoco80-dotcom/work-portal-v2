// src/main/repository.js
// 업무Portal v2 — Repository (Persistence Layer)
//
// better-sqlite3 = CJS only → createRequire로 로드
// type:module 환경에서 require() 사용

import { createRequire } from 'module';
import { app }           from 'electron';
import { join }          from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

function getDbPath() {
  return join(app.getPath('userData'), 'work-portal-v2.db');
}

let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new Database(getDbPath());
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_version TEXT    NOT NULL,
      engine_version   TEXT    NOT NULL,
      data_json        TEXT    NOT NULL,
      saved_at         TEXT    NOT NULL,
      is_current       INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_current ON snapshots(is_current);
  `);
}

export function saveSnapshot(snapshot) {
  const db = getDb();
  const upsert = db.transaction(() => {
    db.prepare('UPDATE snapshots SET is_current=0 WHERE is_current=1').run();
    db.prepare(
      'INSERT INTO snapshots (snapshot_version,engine_version,data_json,saved_at,is_current) VALUES(?,?,?,?,1)'
    ).run(
      snapshot.snapshot_version,
      snapshot.engine_version,
      JSON.stringify(snapshot),
      new Date().toISOString()
    );
  });
  upsert();
}

export function loadSnapshot() {
  const db = getDb();
  const row = db.prepare(
    'SELECT data_json,snapshot_version,engine_version FROM snapshots WHERE is_current=1 LIMIT 1'
  ).get();
  if (!row) return null;
  try {
    const snap = JSON.parse(row.data_json);
    if (snap.snapshot_version !== row.snapshot_version) {
      console.warn(`[Repo] SOFT READ — version mismatch`);
    }
    return snap;
  } catch(e) {
    console.error('[Repo] parse failed:', e.message);
    return null;
  }
}

export function loadHistory(limit = 20) {
  const db = getDb();
  return db.prepare(
    'SELECT id,snapshot_version,engine_version,saved_at FROM snapshots ORDER BY id DESC LIMIT ?'
  ).all(limit);
}

export function closeDb() {
  if (_db) { _db.close(); _db = null; }
}
