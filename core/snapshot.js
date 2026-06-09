// core/snapshot.js
// 업무Portal v2 — Snapshot Source of Truth
// 규칙: 이 파일 외에서 Snapshot 구조 정의 금지

export const SNAPSHOT_VERSION = '2.0.0';
export const ENGINE_VERSION   = '2.0.0';
export const REPORT_VERSION   = '2.0.0';

export const INITIAL_SNAPSHOT = Object.freeze({
  snapshot_version: SNAPSHOT_VERSION,
  engine_version:   ENGINE_VERSION,
  report_version:   REPORT_VERSION,

  data: Object.freeze({
    settings: Object.freeze({
      language: 'ko',
      theme:    'default',
    }),
    memo: Object.freeze({
      byDate: {},
    }),
    todos: Object.freeze({
      items:   [],
      filters: {},
      stats:   {},
    }),
    calendar: Object.freeze({
      events: [],
    }),
    projects: Object.freeze({
      items: [],
    }),
    kpi: Object.freeze({
      items: [],
    }),
    handover: Object.freeze({
      reports: [],
    }),
  }),

  metadata: Object.freeze({
    createdAt: '',
    updatedAt: '',
  }),
});

/**
 * 새 Snapshot 생성 헬퍼
 * Engine에서 사용 — 직접 spread 대신 이 함수 사용 권장
 */
export function createSnapshot(partial = {}) {
  const now = new Date().toISOString();

  // Version Lock 검증
  const ev = partial.engine_version  || ENGINE_VERSION;
  const rv = partial.report_version  || REPORT_VERSION;
  if (ev !== rv) {
    throw new Error(
      `[Snapshot] INVALID STATE: engine_version(${ev}) !== report_version(${rv})`
    );
  }

  return {
    ...INITIAL_SNAPSHOT,
    ...partial,
    snapshot_version: SNAPSHOT_VERSION,
    engine_version:   ENGINE_VERSION,
    report_version:   REPORT_VERSION,
    metadata: {
      createdAt: partial.metadata?.createdAt || now,
      updatedAt: now,
    },
  };
}

/**
 * Snapshot 유효성 검사
 * Migration, 복원 시 호출
 */
export function validateSnapshot(snapshot) {
  if (!snapshot) throw new Error('Snapshot is null');
  if (snapshot.snapshot_version !== SNAPSHOT_VERSION) {
    throw new Error(`snapshot_version mismatch: ${snapshot.snapshot_version}`);
  }
  if (snapshot.engine_version !== ENGINE_VERSION) {
    throw new Error(`engine_version mismatch: ${snapshot.engine_version}`);
  }
  if (snapshot.report_version !== REPORT_VERSION) {
    throw new Error(`report_version mismatch: ${snapshot.report_version}`);
  }
  if (!snapshot.data) throw new Error('Snapshot.data is missing');
  return true;
}
