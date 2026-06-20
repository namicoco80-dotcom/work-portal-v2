// audit/audit-store.js
// 업무Portal v2 — Audit Store
//
// 규칙:
//   AuditNode만 보관 — Snapshot 원본 보관 금지
//   조회 API만 외부 노출 — push는 audit-subscriber 전용
//   core/store.js 의존 금지 (단방향)

/* --- SECTION: STATE --- */
let _timeline = [];          // AuditNode[]
const MAX_NODES = 500;       // 메모리 상한

/* --- SECTION: WRITE (audit-subscriber 전용) --- */

/**
 * @param {object} node - createAuditNode()가 생성한 불변 객체
 */
export function pushAuditNode(node) {
  _timeline = [..._timeline, node];
  if (_timeline.length > MAX_NODES) {
    _timeline = _timeline.slice(_timeline.length - MAX_NODES);
  }
}

/* --- SECTION: READ --- */

/** 전체 타임라인 (시간 순, 불변 배열) */
export function getTimeline() {
  return _timeline;
}

/** 최근 N개 */
export function getRecentNodes(n = 20) {
  return _timeline.slice(-n);
}

/** action.type으로 필터 */
export function getNodesByAction(type) {
  return _timeline.filter(node => node.action.type === type);
}

/** domain으로 필터 (diffSummary 기준) */
export function getNodesByDomain(domain) {
  return _timeline.filter(node =>
    node.diffSummary.some?.(d => d.domain === domain) ?? false
  );
}

/** 타임라인 초기화 (테스트 전용) */
export function _resetAuditStore() {
  _timeline = [];
}
