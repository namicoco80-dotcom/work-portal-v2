// migration-engine.test.js
// 업무Portal v2 — Migration Engine 테스트

import { importBackup, detectVersion, migrateV1 } from '../backup/migration-engine.js';

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log('  ✅', msg); passed++; }
  else           { console.error('  ❌', msg); failed++; }
}

const FIXED_NOW = '2026-06-09T00:00:00.000Z';

// ── TEST 1: detectVersion v1 ─────────────────────────
console.log('\n[TEST 1] detectVersion v1');
const v1raw = { todos: [], calendar: [] };
assert(detectVersion(v1raw) === 'v1', 'todos[] 있으면 v1');

// ── TEST 2: detectVersion v2 ─────────────────────────
console.log('\n[TEST 2] detectVersion v2');
const v2raw = { snapshot_version: '2.0.0', engine_version: '2.0.0', report_version: '2.0.0', data: {} };
assert(detectVersion(v2raw) === 'v2', 'snapshot_version 2.x 이면 v2');

// ── TEST 3: Unknown format ───────────────────────────
console.log('\n[TEST 3] Unknown format');
let threw = false;
try { detectVersion({ something: 'unknown' }); } catch { threw = true; }
assert(threw, '알 수 없는 형식 → Error');

// ── TEST 4: v1 → v2 기본 변환 ───────────────────────
console.log('\n[TEST 4] v1 → v2 기본 변환');
const result = migrateV1({
  todos:    [{ id: 't1', title: '할일A', done: false }],
  calendar: [{ id: 'e1', title: '회의', date: '2026-06-10' }],
  memosByDate: { '2026-06-09': { content: '메모내용', pinned: false } },
}, FIXED_NOW);

assert(result.snapshot_version === '2.0.0',         'snapshot_version 2.0.0');
assert(result.data.todos.items.length === 1,         'todos 1개');
assert(result.data.todos.items[0].title === '할일A', 'todo title 유지');
assert(result.data.calendar.events.length === 1,     'events 1개');
assert(result.data.memo.byDate['2026-06-09'].content === '메모내용', 'memo 유지');

// ── TEST 5: v1 단일 memo 문자열 처리 ────────────────
console.log('\n[TEST 5] v1 단일 memo');
const r2 = migrateV1({ todos: [], memo: '단일 메모입니다' }, FIXED_NOW);
const keys = Object.keys(r2.data.memo.byDate);
assert(keys.length === 1,                              '단일 메모 → byDate 1개');
assert(r2.data.memo.byDate[keys[0]].content === '단일 메모입니다', '내용 보존');

// ── TEST 6: 빈 v1 백업 ──────────────────────────────
console.log('\n[TEST 6] 빈 v1 백업');
const r3 = migrateV1({ todos: [] }, FIXED_NOW);
assert(r3.data.todos.items.length === 0,    'todos 빈 배열');
assert(r3.data.calendar.events.length === 0,'events 빈 배열');
assert(r3.data.kpi.items.length === 0,      'kpi 빈 배열');

// ── TEST 7: Determinism ──────────────────────────────
console.log('\n[TEST 7] Migration Determinism');
const raw = { todos: [{ id: 'x1', title: 'X' }], calendar: [] };
const m1 = migrateV1(raw, FIXED_NOW);
const m2 = migrateV1(raw, FIXED_NOW);
assert(JSON.stringify(m1.data) === JSON.stringify(m2.data), '같은 입력 → 같은 결과');

// ── 결과 ─────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`결과: ${passed} PASS / ${failed} FAIL`);
if (failed === 0) console.log('✅ Migration Engine STEP 완료');
else              console.log('❌ 실패 항목 확인 필요');
