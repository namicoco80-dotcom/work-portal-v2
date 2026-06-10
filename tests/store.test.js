// store.test.js
// 업무Portal v2 — STEP 1-B 테스트
// 실행: node store.test.js

import { store }                       from '../core/store.js';
import { INITIAL_SNAPSHOT, createSnapshot } from '../core/snapshot.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log('  ✅', msg);
    passed++;
  } else {
    console.error('  ❌', msg);
    failed++;
  }
}

// ── TEST 1: 초기 상태 ────────────────────────────────
console.log('\n[TEST 1] 초기 상태');
store._reset();
const s0 = store.getSnapshot();
assert(s0.snapshot_version === '2.0.0', 'snapshot_version = 2.0.0');
assert(s0.data.todos.items.length === 0, 'todos 초기 빈 배열');

// ── TEST 2: TODO_ADD ─────────────────────────────────
console.log('\n[TEST 2] TODO_ADD');
store._reset();
store.dispatch({ type: 'TODO_ADD', payload: { id: '1', title: '테스트 할일' } });
const s1 = store.getSnapshot();
assert(s1.data.todos.items.length === 1, 'todos 1개 추가됨');
assert(s1.data.todos.items[0].title === '테스트 할일', '제목 일치');
assert(s1.data.todos.items[0].done === false, 'done = false');

// ── TEST 3: 원본 불변 확인 ───────────────────────────
console.log('\n[TEST 3] Immutable');
store._reset();
const before = store.getSnapshot();
store.dispatch({ type: 'TODO_ADD', payload: { id: '2', title: '불변 테스트' } });
assert(before.data.todos.items.length === 0, '원본 Snapshot 변경 없음');

// ── TEST 4: TODO_COMPLETE ────────────────────────────
console.log('\n[TEST 4] TODO_COMPLETE');
store._reset();
store.dispatch({ type: 'TODO_ADD',      payload: { id: '3', title: '완료 테스트' } });
store.dispatch({ type: 'TODO_COMPLETE', payload: { id: '3' } });
const s2 = store.getSnapshot();
assert(s2.data.todos.items[0].done === true, 'done = true');

// ── TEST 5: TODO_DELETE ──────────────────────────────
console.log('\n[TEST 5] TODO_DELETE');
store._reset();
store.dispatch({ type: 'TODO_ADD',    payload: { id: '4', title: '삭제 테스트' } });
store.dispatch({ type: 'TODO_DELETE', payload: { id: '4' } });
const s3 = store.getSnapshot();
assert(s3.data.todos.items.length === 0, '삭제 후 빈 배열');

// ── TEST 6: subscribe ────────────────────────────────
console.log('\n[TEST 6] subscribe');
store._reset();
let callCount = 0;
const unsub = store.subscribe(() => callCount++);
store.dispatch({ type: 'TODO_ADD', payload: { id: '5', title: '구독 테스트' } });
store.dispatch({ type: 'TODO_ADD', payload: { id: '6', title: '구독 테스트2' } });
assert(callCount === 2, 'subscriber 2회 호출');
unsub();
store.dispatch({ type: 'TODO_ADD', payload: { id: '7', title: '구독 해제 테스트' } });
assert(callCount === 2, 'unsubscribe 후 호출 없음');

// ── TEST 7: Unknown Action → INVALID STATE ───────────
console.log('\n[TEST 7] Unknown Action');
store._reset();
let threw = false;
try {
  store.dispatch({ type: 'UNKNOWN_ACTION' });
} catch (e) {
  threw = true;
}
assert(threw, 'Unknown Action → Error 발생');

// ── TEST 8: Version Lock ─────────────────────────────
console.log('\n[TEST 8] Version Lock');
let versionErr = false;
try {
  createSnapshot({ engine_version: '2.0.0', report_version: '2.0.1' });
} catch (e) {
  versionErr = true;
}
assert(versionErr, 'engine_version !== report_version → Error 발생');

// ── TEST 9: Determinism ──────────────────────────────
console.log('\n[TEST 9] Determinism');

function replay(actions) {
  store._reset();
  actions.forEach(a => store.dispatch(a));
  return store.getSnapshot();
}

const deterministicActions = [
  { type: 'TODO_ADD', payload: { id: 'a1', title: 'A', createdAt: '2026-01-01T00:00:00.000Z' } },
  { type: 'TODO_ADD', payload: { id: 'a2', title: 'B', createdAt: '2026-01-01T00:00:01.000Z' } },
];
const snap1 = replay(deterministicActions);
const snap2 = replay(deterministicActions);
assert(JSON.stringify(snap1.data) === JSON.stringify(snap2.data), '같은 Action → 같은 Snapshot');

// ── TEST 10: Snapshot Hash ───────────────────────────
console.log('\n[TEST 10] Snapshot Hash');

function snapshotHash(snapshot) {
  const str = JSON.stringify(snapshot.data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

store._reset();
store.dispatch({ type: 'TODO_ADD', payload: { id: 'h1', title: 'hash test', createdAt: '2026-01-01T00:00:00.000Z' } });
const hs1 = store.getSnapshot();
assert(snapshotHash(hs1) === snapshotHash(hs1), '동일 Snapshot → 동일 Hash');

store._reset();
store.dispatch({ type: 'TODO_ADD', payload: { id: 'h2', title: 'different', createdAt: '2026-01-01T00:00:00.000Z' } });
const hs2 = store.getSnapshot();
assert(snapshotHash(hs1) !== snapshotHash(hs2), '다른 Snapshot → 다른 Hash');

// ── 결과 ─────────────────────────────────────────────
console.log(`결과: ${passed} PASS / ${failed} FAIL`);
if (failed === 0) console.log('✅ STEP 1-B 완료');
else              console.log('❌ 실패 항목 확인 필요');
