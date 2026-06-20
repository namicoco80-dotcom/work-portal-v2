// audit/audit-subscriber.js
// 업무Portal v2 — Audit Subscriber
//
// 역할:
//   store.subscribe()의 유일한 Audit 연결점
//   lastAction capture → AuditNode 생성 → auditStore push
//
// 규칙:
//   Store / Engine / Snapshot 구조 변경 금지
//   이 파일이 core를 건드리는 유일한 접점 (subscribe만 사용)

import { store }          from '../core/store.js';
import { createAuditNode } from './audit-node.js';
import { buildDiff }       from './diff-engine.js';
import { pushAuditNode }   from './audit-store.js';

/* --- SECTION: ACTION CAPTURE --- */
// dispatch wrapper를 통해 주입받는 최근 action
let _lastAction = null;

/**
 * app.js의 dispatch 호출부를 이 함수로 교체
 * Store 계약 변경 없이 action 맥락 보존
 */
export function auditDispatch(action) {
  _lastAction = action;
  store.dispatch(action);
}

/* --- SECTION: SUBSCRIBER WIRING --- */

let _wired = false;

/**
 * initAudit() — 앱 초기화 시 1회 호출
 * store.subscribe에 audit 관측자 등록
 */
export function initAudit() {
  if (_wired) {
    console.warn('[Audit] already wired — skipping');
    return;
  }
  _wired = true;

  store.subscribe((next, prev) => {
    // action이 없는 SNAPSHOT_RESTORE 등은 기록하되 별도 표기
    const action = _lastAction ?? { type: 'INTERNAL', payload: null };
    _lastAction  = null;   // 소비 후 초기화

    const diff = buildDiff(prev, next);
    const node = createAuditNode(action, prev, next, diff);
    pushAuditNode(node);
  });

  console.info('[Audit] subscriber wired');
}
