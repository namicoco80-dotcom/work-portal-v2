// src/main/repository.js
// 업무Portal v2 — Repository (Persistence Layer)
//
// 역할: snapshot ↔ SQLite 유일 담당
//
// 규칙:
//   Engine  → DB 접근 금지
//   Store   → 저장 금지
//   UI      → 저장 호출 금지
//   오직 Repository만 저장/로드
//
// 저장 전략:
//   snapshots 테이블에 JSON blob으로 저장
//   항상 최신 1개만 current=1로 유지 (append-only history는 선택적)
//   version mismatch → SOFT READ (기존 snapshot 유지, 덮어쓰지 않음)

import Database from 'better-sqlite3';
import { app }  from 'electron';
import { join } from 'path';

/* --- DB 경로: Electron userData 폴더 --- */
function getDbPath() {
  return join(app.getPath('userData'), 'work-portal-v2.db');
}

let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new Database(getDbPath());
  _db.pragma('journal_mode = WAL');  // 쓰기 성능 + 안정성
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

/* --- Schema ----------------------------------------- */
function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_version TEXT    NOT NULL,
      engine_version   TEXT    NOT NULL,
      data_json        TEXT    NOT NULL,
      saved_at         TEXT    NOT NULL,
      is_current       INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_current ON snapshots(is_current);
  `);
}

/* --- SAVE -------------------------------------------
   현재 snapshot을 저장 (이전 current 해제)
   metadata.updatedAt은 engine output이 아니므로 저장 시각으로 대체 가능
----------------------------------------------------- */
export function saveSnapshot(snapshot) {
  const db = getDb();

  const upsert = db.transaction(() => {
    // 기존 current 해제
    db.prepare('UPDATE snapshots SET is_current = 0 WHERE is_current = 1').run();

    // 새 snapshot 삽입
    db.prepare(`
      INSERT INTO snapshots (snapshot_version, engine_version, data_json, saved_at, is_current)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      snapshot.snapshot_version,
      snapshot.engine_version,
      JSON.stringify(snapshot),
      new Date().toISOString()
    );
  });

  upsert();
}

/* --- LOAD -------------------------------------------
   앱 시작 시 current snapshot 로드
   없으면 null 반환 → store가 INITIAL_SNAPSHOT 사용
   version mismatch → SOFT READ (로드하되 경고만)
----------------------------------------------------- */
export function loadSnapshot() {
  const db = getDb();

  const row = db.prepare(
    'SELECT data_json, snapshot_version, engine_version FROM snapshots WHERE is_current = 1 LIMIT 1'
  ).get();

  if (!row) return null;

  try {
    const snap = JSON.parse(row.data_json);

    // SOFT READ: version mismatch 경고 (throw 금지)
    if (snap.snapshot_version !== row.snapshot_version) {
      console.warn(
        `[Repo] SOFT READ — snapshot_version mismatch: stored=${row.snapshot_version} parsed=${snap.snapshot_version}`
      );
    }

    return snap;
  } catch (e) {
    console.error('[Repo] snapshot parse failed — using INITIAL_SNAPSHOT:', e.message);
    return null;
  }
}

/* --- HISTORY (optional) ----------------------------
   최근 N개 snapshot 이력 반환 (undo/audit 용도)
----------------------------------------------------- */
export function loadHistory(limit = 20) {
  const db = getDb();
  return db.prepare(
    'SELECT id, snapshot_version, engine_version, saved_at FROM snapshots ORDER BY id DESC LIMIT ?'
  ).all(limit);
}

/* --- CLOSE ----------------------------------------- */
export function closeDb() {
  if (_db) { _db.close(); _db = null; }
}
