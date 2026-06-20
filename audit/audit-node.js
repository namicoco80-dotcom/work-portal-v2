// audit/audit-node.js
// 업무Portal v2 — Audit Node Schema
//
// 규칙:
//   Audit Node는 Snapshot 변경의 "이유"를 기록한다
//   Engine / Store / Snapshot 구조 변경 금지
//   이 파일 외에서 AuditNode 구조 정의 금지

/* --- SECTION: CONSTANTS --- */
export const AUDIT_VERSION = '1.0.0';

/* --- SECTION: FACTORY --- */

/**
 * AuditNode 생성
 * @param {object} action   - dispatch된 action { type, payload }
 * @param {object} prev     - 이전 snapshot
 * @param {object} next     - 다음 snapshot
 * @param {object} diff     - diff-engine이 생성한 diffSummary
 * @returns {object}        - 불변 AuditNode
 */
export function createAuditNode(action, prev, next, diff) {
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return Object.freeze({
    audit_version:  AUDIT_VERSION,
    id,
    timestamp:      new Date().toISOString(),
    action: Object.freeze({
      type:    action?.type    ?? 'UNKNOWN',
      payload: action?.payload ?? null,
    }),
    prevSnapshotAt: prev?.metadata?.updatedAt ?? null,
    nextSnapshotAt: next?.metadata?.updatedAt ?? null,
    diffSummary:    Object.freeze(diff ?? { added: [], removed: [], changed: [] }),
  });
}
