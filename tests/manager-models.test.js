// manager-models.test.js
// 업무Portal v2 — Manager Pure Logic Tests
// DOM 없음. Electron 없음.
// 실행: node manager-models.test.js

import {
  focusReduce,
  overlayReduce,
  modalReduce,
  getActiveModal,
  getTopOverlay,
} from './manager-models.js';

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  ✅', msg); passed++; }
  else           { console.error('  ❌', msg); failed++; }
}

const NOW = '2026-06-09T00:00:00.000Z';

// ══ FocusManager ══════════════════════════════════════

console.log('\n[FocusManager]');

// 초기 상태
let fs = { targetId: null, restoredAt: null };
assert(fs.targetId === null, '초기 targetId = null');

// FOCUS_EDITOR
fs = focusReduce(fs, { type: 'FOCUS_EDITOR' });
assert(fs.targetId === 'memo-editor', 'focusEditor → targetId = memo-editor');

// FOCUS_BY_ID
fs = focusReduce(fs, { type: 'FOCUS_BY_ID', id: 'todo-input' });
assert(fs.targetId === 'todo-input', 'focusById → targetId = todo-input');

// FOCUS_RESTORE
fs = focusReduce(fs, { type: 'FOCUS_RESTORE', timestamp: NOW });
assert(fs.targetId === 'todo-input',  'restore → targetId 유지');
assert(fs.restoredAt === NOW,         'restore → restoredAt 기록');

// FOCUS_CLEAR
fs = focusReduce(fs, { type: 'FOCUS_CLEAR' });
assert(fs.targetId === null,    'clear → targetId = null');
assert(fs.restoredAt === null,  'clear → restoredAt = null');

// Determinism
const fs1 = focusReduce({ targetId: null, restoredAt: null }, { type: 'FOCUS_EDITOR' });
const fs2 = focusReduce({ targetId: null, restoredAt: null }, { type: 'FOCUS_EDITOR' });
assert(JSON.stringify(fs1) === JSON.stringify(fs2), 'Focus Determinism');

// ══ OverlayManager ════════════════════════════════════

console.log('\n[OverlayManager]');

let os = { stack: [] };
assert(os.stack.length === 0, '초기 stack 비어있음');

// OVERLAY_OPEN
os = overlayReduce(os, { type: 'OVERLAY_OPEN', id: 'settings' });
assert(os.stack.length === 1,          'open settings → stack 1개');
assert(getTopOverlay(os) === 'settings','getTopOverlay = settings');

// 중복 open 무시
os = overlayReduce(os, { type: 'OVERLAY_OPEN', id: 'settings' });
assert(os.stack.length === 1, '중복 open 무시');

// 다중 open
os = overlayReduce(os, { type: 'OVERLAY_OPEN', id: 'calendar' });
assert(os.stack.length === 2,           'stack 2개');
assert(getTopOverlay(os) === 'calendar','최상위 = calendar');

// OVERLAY_CLOSE
os = overlayReduce(os, { type: 'OVERLAY_CLOSE', id: 'calendar' });
assert(os.stack.length === 1,           'calendar 닫힘');
assert(getTopOverlay(os) === 'settings','최상위 = settings');

// OVERLAY_CLOSE_ALL
os = overlayReduce(os, { type: 'OVERLAY_OPEN', id: 'modal-a' });
os = overlayReduce(os, { type: 'OVERLAY_CLOSE_ALL' });
assert(os.stack.length === 0, 'closeAll → stack 비어있음');

// Determinism
const os1 = overlayReduce({ stack: [] }, { type: 'OVERLAY_OPEN', id: 'x' });
const os2 = overlayReduce({ stack: [] }, { type: 'OVERLAY_OPEN', id: 'x' });
assert(JSON.stringify(os1) === JSON.stringify(os2), 'Overlay Determinism');

// ══ ModalManager ══════════════════════════════════════

console.log('\n[ModalManager]');

let ms = { queue: [] };
assert(ms.queue.length === 0,   '초기 queue 비어있음');
assert(getActiveModal(ms) === null, '초기 activeModal = null');

// MODAL_PUSH
ms = modalReduce(ms, { type: 'MODAL_PUSH', modal: { id: 'm1', type: 'confirm', title: '삭제' } });
assert(ms.queue.length === 1,              'push → queue 1개');
assert(getActiveModal(ms).id === 'm1',     'activeModal = m1');
assert(getActiveModal(ms).status === 'pending', 'status = pending');

// 다중 push
ms = modalReduce(ms, { type: 'MODAL_PUSH', modal: { id: 'm2', type: 'alert', title: '알림' } });
assert(ms.queue.length === 2,          'queue 2개');
assert(getActiveModal(ms).id === 'm1', '첫 번째가 active');

// MODAL_RESOLVE
ms = modalReduce(ms, { type: 'MODAL_RESOLVE', id: 'm1', result: true });
assert(ms.queue.find(m => m.id === 'm1').status === 'resolved', 'm1 resolved');
assert(ms.queue.find(m => m.id === 'm1').result === true,       'result = true');

// MODAL_REMOVE
ms = modalReduce(ms, { type: 'MODAL_REMOVE', id: 'm1' });
assert(ms.queue.length === 1,          'm1 제거됨');
assert(getActiveModal(ms).id === 'm2', '다음 active = m2');

// MODAL_REJECT
ms = modalReduce(ms, { type: 'MODAL_REJECT', id: 'm2' });
assert(ms.queue.find(m => m.id === 'm2').status === 'rejected', 'm2 rejected');

// Determinism
const ms1 = modalReduce({ queue: [] }, { type: 'MODAL_PUSH', modal: { id: 'x', type: 'confirm' } });
const ms2 = modalReduce({ queue: [] }, { type: 'MODAL_PUSH', modal: { id: 'x', type: 'confirm' } });
assert(JSON.stringify(ms1) === JSON.stringify(ms2), 'Modal Determinism');

// ══ 결과 ══════════════════════════════════════════════
console.log(`\n${'─'.repeat(40)}`);
console.log(`결과: ${passed} PASS / ${failed} FAIL`);
if (failed === 0) console.log('✅ Manager Pure Logic Tests 완료');
else              console.log('❌ 실패 항목 확인 필요');
