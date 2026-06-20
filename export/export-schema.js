// export/export-schema.js
// 업무Portal v2 — Export Schema
//
// 규칙:
//   Export가 생성하는 모든 JSON 구조는 이 파일에서 정의
//   계산/판단 금지 — 구조 선언만
//   v2.0 Workspace import 호환성 유지

/* --- SECTION: VERSION --- */
export const EXPORT_VERSION = '1.1';

/* --- SECTION: SCHEMA FACTORIES --- */

/**
 * DailyReport — 사람이 읽는 하루 요약
 */
export function createDailyReportSchema(date, snapshot) {
  const cal   = snapshot.data?.calendar ?? {};
  const todos = snapshot.data?.todos ?? {};
  const memo  = snapshot.data?.memo ?? {};

  const events = (cal.events ?? [])
    .filter(e => e.date === date)
    .map(e => ({ id: e.id, title: e.title, time: e.time ?? null }));

  const completedTodos = (todos.items ?? [])
    .filter(t => t.done && t.dueDate === date)
    .map(t => ({ id: t.id, text: t.text }));

  const pendingTodos = (todos.items ?? [])
    .filter(t => !t.done && t.dueDate === date)
    .map(t => ({ id: t.id, text: t.text }));

  const memoContent = memo.byDate?.[date]?.content ?? '';

  return Object.freeze({
    type:           'daily_report',
    export_version: EXPORT_VERSION,
    date,
    exportedAt:     new Date().toISOString(),
    events,
    completedTodos,
    pendingTodos,
    memo:           memoContent,
  });
}

/**
 * AuditExport — Audit Timeline JSON (v2.0 import 대비)
 */
export function createAuditExportSchema(snapshot, timeline) {
  // snapshot 간단 hash (무결성 힌트용 — 암호학적 보장 아님)
  const snapshotStr  = JSON.stringify(snapshot?.data ?? {});
  const snapshot_hash = snapshotStr.length.toString(16) +
                        '-' + (snapshotStr.split('').reduce((a, c) => (a + c.charCodeAt(0)) & 0xFFFFFF, 0)).toString(16);

  return Object.freeze({
    type:           'audit_export',
    export_version: EXPORT_VERSION,
    exportedAt:     new Date().toISOString(),
    snapshot_hash,
    snapshotAt:     snapshot?.metadata?.updatedAt ?? null,
    timeline: (timeline ?? []).map(node => Object.freeze({
      id:             node.id,
      timestamp:      node.timestamp,
      action:         node.action.type,
      payload:        node.action.payload,
      prevSnapshotAt: node.prevSnapshotAt,
      nextSnapshotAt: node.nextSnapshotAt,
      diff:           node.diffSummary,
    })),
  });
}
