// backup/migration-engine.js
// 업무Portal v2 — Migration Engine
//
// 지원: v1 Backup JSON → v2 Snapshot
// 미지원: v2 → v1 역방향
//
// 규칙:
//   - 변환 실패 시 원본 raw 보존, 앱 상태 변경 없음
//   - migration 중 Date.now() 직접 호출 금지 → 외부 주입

import { INITIAL_SNAPSHOT, SNAPSHOT_VERSION, ENGINE_VERSION, REPORT_VERSION } from '../core/snapshot.js';

// ── 진입점 ────────────────────────────────────────────
export function importBackup(raw, { now = new Date().toISOString() } = {}) {
  const version = detectVersion(raw);
  switch (version) {
    case 'v1': return migrateV1(raw, now);
    case 'v2': return validateV2(raw);
    default:   throw new Error('[Migration] Unsupported backup version: ' + version);
  }
}

// ── 버전 감지 ──────────────────────────────────────────
export function detectVersion(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[Migration] Invalid backup format: not an object');
  }
  if (raw.snapshot_version?.startsWith('2.')) return 'v2';
  if (Array.isArray(raw.todos))               return 'v1';
  throw new Error('[Migration] Unknown backup format');
}

// ── v1 → v2 변환 ──────────────────────────────────────
export function migrateV1(raw, now = new Date().toISOString()) {
  return {
    snapshot_version: SNAPSHOT_VERSION,
    engine_version:   ENGINE_VERSION,
    report_version:   REPORT_VERSION,
    metadata: {
      createdAt: raw.createdAt || now,
      updatedAt: now,
      migratedFrom: 'v1',
    },
    data: {
      settings: _mergeSettings(raw.settings),
      memo:     { byDate: _normalizeMemos(raw) },
      todos:    { items: _normalizeTodos(raw.todos), filters: {}, stats: {} },
      calendar: { events: _normalizeEvents(raw.calendar) },
      projects: { items: Array.isArray(raw.projects) ? raw.projects : [] },
      kpi:      { items: Array.isArray(raw.kpi) ? raw.kpi : [] },
      handover: { reports: [] },
    },
  };
}

// ── v2 검증 ───────────────────────────────────────────
export function validateV2(raw) {
  if (raw.snapshot_version !== SNAPSHOT_VERSION) {
    throw new Error(`[Migration] snapshot_version mismatch: ${raw.snapshot_version}`);
  }
  if (raw.engine_version !== ENGINE_VERSION) {
    throw new Error(`[Migration] engine_version mismatch: ${raw.engine_version}`);
  }
  if (raw.report_version !== REPORT_VERSION) {
    throw new Error(`[Migration] report_version mismatch: ${raw.report_version}`);
  }
  if (!raw.data) throw new Error('[Migration] data field missing');
  return raw;
}

// ── 내부 정규화 헬퍼 ──────────────────────────────────

function _mergeSettings(settings) {
  return {
    ...INITIAL_SNAPSHOT.data.settings,
    ...(settings || {}),
  };
}

// v1 메모 형태 통합
// v1: { memosByDate: { 'YYYY-MM-DD': { content } } }  또는  { memo: '단일문자열' }
function _normalizeMemos(raw) {
  if (raw.memosByDate && typeof raw.memosByDate === 'object') {
    return raw.memosByDate;
  }
  if (typeof raw.memo === 'string' && raw.memo.trim()) {
    const today = new Date().toISOString().slice(0, 10);
    return { [today]: { content: raw.memo, pinned: false, updatedAt: '' } };
  }
  return {};
}

// v1 todos 배열 → v2 items
function _normalizeTodos(todos) {
  if (!Array.isArray(todos)) return [];
  return todos.map(t => ({
    id:        t.id        || String(Math.random()),
    title:     t.title     || t.text || '',
    priority:  t.priority  || 'normal',
    dueDate:   t.dueDate   || t.due  || null,
    projectId: t.projectId || null,
    done:      !!t.done,
    createdAt: t.createdAt || '',
  }));
}

// v1 calendar 배열 → v2 events
function _normalizeEvents(calendar) {
  if (!Array.isArray(calendar)) return [];
  return calendar.map(e => ({
    id:        e.id        || String(Math.random()),
    title:     e.title     || e.text || '',
    date:      e.date      || '',
    time:      e.time      || null,
    color:     e.color     || 'default',
    createdAt: e.createdAt || '',
  }));
}
