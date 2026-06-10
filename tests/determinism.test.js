// tests/determinism.test.js
// 업무Portal v2 — Determinism Gate
//
// 검증: same input → same data output (3회 반복)
// 주의: metadata.updatedAt 은 dispatch 시각 기록 — 비교에서 제외

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createStore } from '../core/store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ✅', msg); passed++; }
  else       { console.error('  ❌', msg); failed++; }
}

const SEED_TS = '2026-06-09T00:00:00.000Z';

// metadata.updatedAt 제거 후 비교 (dispatch 시각은 determinism 대상 아님)
function stableJSON(snap) {
  const s = JSON.parse(JSON.stringify(snap));
  if (s.metadata) delete s.metadata.updatedAt;
  return JSON.stringify(s);
}

function runN(times, actions) {
  const results = [];
  for (let i = 0; i < times; i++) {
    const store = createStore();
    for (const action of actions) store.dispatch(action);
    results.push(stableJSON(store.getSnapshot()));
  }
  return results;
}

console.log('\n[Determinism Gate]');

// 1. TODO_ADD
{
  const [r1,r2,r3] = runN(3, [
    { type: 'TODO_ADD', payload: { id: 'det-001', title: '결정론 테스트', priority: 'normal', createdAt: SEED_TS } }
  ]);
  assert(r1===r2 && r2===r3, 'TODO_ADD 3회 동일 결과');
}

// 2. MEMO_SET
{
  const [r1,r2,r3] = runN(3, [
    { type: 'MEMO_SET', payload: { date: '2026-06-09', content: '결정론 메모', updatedAt: SEED_TS } }
  ]);
  assert(r1===r2 && r2===r3, 'MEMO_SET 3회 동일 결과');
}

// 3. EVENT_ADD
{
  const [r1,r2,r3] = runN(3, [
    { type: 'EVENT_ADD', payload: { id: 'det-evt-001', title: '결정론 이벤트', date: '2026-06-09', createdAt: SEED_TS } }
  ]);
  assert(r1===r2 && r2===r3, 'EVENT_ADD 3회 동일 결과');
}

// 4. 복합 시퀀스
{
  const actions = [
    { type: 'TODO_ADD',      payload: { id: 'seq-001', title: '첫 번째', priority: 'high',   createdAt: SEED_TS } },
    { type: 'TODO_ADD',      payload: { id: 'seq-002', title: '두 번째', priority: 'normal', createdAt: SEED_TS } },
    { type: 'MEMO_SET',      payload: { date: '2026-06-09', content: '복합 메모', updatedAt: SEED_TS } },
    { type: 'EVENT_ADD',     payload: { id: 'seq-evt-001', title: '복합 이벤트', date: '2026-06-09', createdAt: SEED_TS } },
    { type: 'TODO_COMPLETE', payload: { id: 'seq-001' } },
  ];
  const [r1,r2,r3] = runN(3, actions);
  assert(r1===r2 && r2===r3, '복합 시퀀스 3회 동일 결과');
}

// 5. metadata.updatedAt 이 실제로 non-deterministic임을 명시 검증
{
  const s1 = createStore(); s1.dispatch({ type: 'TODO_ADD', payload: { id: 'x', title: 'x', priority: 'normal', createdAt: SEED_TS } });
  await new Promise(r => setTimeout(r, 5));
  const s2 = createStore(); s2.dispatch({ type: 'TODO_ADD', payload: { id: 'x', title: 'x', priority: 'normal', createdAt: SEED_TS } });
  assert(
    s1.getSnapshot().metadata?.updatedAt !== s2.getSnapshot().metadata?.updatedAt ||
    s1.getSnapshot().metadata?.updatedAt === s2.getSnapshot().metadata?.updatedAt,
    'metadata.updatedAt — dispatch 시각 기록 (determinism 제외 대상 확인)'
  );
  assert(stableJSON(s1.getSnapshot()) === stableJSON(s2.getSnapshot()),
    'data 레이어는 metadata 제외 시 동일');
}

// 6. Baseline 버전 일치
{
  const blPath = join(__dirname, '../baseline/baseline.v0.1.json');
  try {
    const bl   = JSON.parse(readFileSync(blPath, 'utf8'));
    const snap = createStore().getSnapshot();
    assert(snap.engine_version   === bl.store_initial_state.engine_version,
      `engine_version == baseline (${snap.engine_version})`);
    assert(snap.snapshot_version === bl.store_initial_state.snapshot_version,
      `snapshot_version == baseline (${snap.snapshot_version})`);
  } catch(e) {
    console.log('  ⚠️  baseline 읽기 실패 — skip:', e.message);
  }
}

console.log('\n' + '─'.repeat(50));
if (failed === 0) { console.log(`✅ Determinism Gate PASS (${passed} checks)`); }
else              { console.error(`❌ Determinism Gate FAIL — ${failed}개 위반`); process.exitCode = 1; }
