// tests/search-manager.test.js
// 업무Portal v2 — SearchManager Tests

import { createStore }         from '../core/store.js';
import { createSearchManager } from '../shared/search-manager.js';

let passed=0, failed=0;
function assert(c,m){ if(c){console.log('  ✅',m);passed++;}else{console.error('  ❌',m);failed++;} }
const SEED = '2026-06-10T00:00:00.000Z';

// 테스트용 snapshot 생성 헬퍼
function makeSnap() {
  const store = createStore();
  store.dispatch({ type:'TODO_ADD', payload:{
    id:'td-1', title:'보고서 작성', priority:'high', dueDate:'2026-06-20',
    eventId:'evt-linked', createdAt:SEED
  }});
  store.dispatch({ type:'TODO_ADD', payload:{
    id:'td-2', title:'안전점검 회의', priority:'normal', createdAt:SEED
  }});
  store.dispatch({ type:'TODO_COMPLETE', payload:{ id:'td-2' }});
  store.dispatch({ type:'EVENT_ADD', payload:{
    id:'evt-1', title:'팀 미팅', date:'2026-06-15', time:'09:00', createdAt:SEED
  }});
  store.dispatch({ type:'MEMO_SET', payload:{
    date:'2026-06-10', content:'오늘 안전점검 완료. 보고서 작성 예정.', updatedAt:SEED
  }});
  store.dispatch({ type:'MEMO_SET', payload:{
    date:'2026-06-11', content:'팀 미팅 준비 완료.', updatedAt:SEED
  }});
  return store.getSnapshot();
}

console.log('\n[SearchManager]');

// ── 1. build — index 생성 ─────────────────────────
{
  const sm   = createSearchManager();
  const snap = makeSnap();
  sm.build(snap);
  const stats = sm.getStats();

  assert(stats.total > 0,           'build → index 생성');
  assert(stats.byType.todo  === 2,  'todo 2개 인덱싱');
  assert(stats.byType.event === 2,  'event 2개 인덱싱 (linked + 독립)');
  assert(stats.byType.memo  === 2,  'memo 2개 인덱싱');
}

// ── 2. 빈 쿼리 → 전체 반환 ───────────────────────
{
  const sm = createSearchManager();
  sm.build(makeSnap());
  const results = sm.query('');
  assert(results.length === sm.getStats().total, '빈 쿼리 → 전체 반환');
}

// ── 3. 키워드 검색 ────────────────────────────────
{
  const sm = createSearchManager();
  sm.build(makeSnap());

  const r1 = sm.query('보고서');
  assert(r1.length >= 1,                              '"보고서" → 1개 이상');
  assert(r1.some(e=>e.type==='todo'),                 '"보고서" → todo 포함');
  assert(r1.some(e=>e.type==='memo'),                 '"보고서" → memo 포함 (내용 매칭)');

  const r2 = sm.query('안전점검');
  assert(r2.length >= 2,                              '"안전점검" → todo + memo');

  const r3 = sm.query('존재하지않는키워드xyz');
  assert(r3.length === 0,                             '없는 키워드 → 빈 결과');
}

// ── 4. AND 조건 (공백 분리) ───────────────────────
{
  const sm = createSearchManager();
  sm.build(makeSnap());

  const r = sm.query('안전 보고서');
  // "안전"과 "보고서" 둘 다 포함하는 항목만
  assert(r.every(e =>
    (e.title + (e.excerpt||'')).toLowerCase().includes('안전') &&
    (e.title + (e.excerpt||'')).toLowerCase().includes('보고서')
  ), 'AND 조건 — 모든 결과에 두 키워드 모두 포함');
}

// ── 5. type 필터 ──────────────────────────────────
{
  const sm = createSearchManager();
  sm.build(makeSnap());

  const todoOnly  = sm.query('', { types:['todo'] });
  const eventOnly = sm.query('', { types:['event'] });
  const memoOnly  = sm.query('', { types:['memo'] });

  assert(todoOnly.every(e=>e.type==='todo'),   'type=todo → todo만');
  assert(eventOnly.every(e=>e.type==='event'), 'type=event → event만');
  assert(memoOnly.every(e=>e.type==='memo'),   'type=memo → memo만');
}

// ── 6. done 필터 (todo) ───────────────────────────
{
  const sm = createSearchManager();
  sm.build(makeSnap());

  const active = sm.query('', { types:['todo'], doneFilter:'active' });
  const done   = sm.query('', { types:['todo'], doneFilter:'done' });
  const all    = sm.query('', { types:['todo'], doneFilter:'all' });

  assert(active.every(e=>!e.meta.done),  'doneFilter=active → 미완료만');
  assert(done.every(e=>e.meta.done),     'doneFilter=done → 완료만');
  assert(all.length === active.length + done.length, 'all = active + done');
}

// ── 7. 날짜 범위 필터 ─────────────────────────────
{
  const sm = createSearchManager();
  sm.build(makeSnap());

  const r = sm.query('', { dateFrom:'2026-06-15', dateTo:'2026-06-20' });
  assert(r.every(e => !e.date || (e.date >= '2026-06-15' && e.date <= '2026-06-20')),
    '날짜 범위 필터 정상');
}

// ── 8. Snapshot rebuild → index 갱신 ─────────────
{
  const store = createStore();
  const sm    = createSearchManager();

  sm.build(store.getSnapshot());
  assert(sm.query('새 할 일').length === 0, 'rebuild 전: 결과 없음');

  store.dispatch({ type:'TODO_ADD', payload:{ id:'new-td', title:'새 할 일', createdAt:SEED }});
  sm.build(store.getSnapshot());  // rebuild
  assert(sm.query('새 할 일').length === 1, 'rebuild 후: 결과 1개');
}

// ── 9. Index는 Snapshot을 변경하지 않음 ──────────
{
  const store = createStore();
  store.dispatch({ type:'TODO_ADD', payload:{ id:'immut', title:'불변 테스트', createdAt:SEED }});
  const snapBefore = JSON.stringify(store.getSnapshot());

  const sm = createSearchManager();
  sm.build(store.getSnapshot());
  sm.query('불변');
  sm.query('');

  assert(JSON.stringify(store.getSnapshot()) === snapBefore, 'Index 조작 → Snapshot 불변');
}

// ── 10. memo excerpt 200자 제한 ───────────────────
{
  const store = createStore();
  const long  = 'A'.repeat(300);
  store.dispatch({ type:'MEMO_SET', payload:{ date:'2026-06-10', content:long, updatedAt:SEED }});

  const sm = createSearchManager();
  sm.build(store.getSnapshot());
  const memoEntry = sm.query('')[0];
  assert(memoEntry.excerpt.length <= 200, 'memo excerpt ≤ 200자');
}

// ── 11. 빈 snapshot ───────────────────────────────
{
  const sm = createSearchManager();
  sm.build(createStore().getSnapshot());
  assert(sm.query('').length   === 0, '빈 snapshot → 결과 없음');
  assert(sm.getStats().total   === 0, '빈 snapshot → stats.total = 0');
}

// ── 12. clear → index 초기화 ──────────────────────
{
  const sm = createSearchManager();
  sm.build(makeSnap());
  assert(sm.getStats().total > 0, 'clear 전: index 있음');
  sm.clear();
  assert(sm.getStats().total === 0, 'clear → index 비워짐');
  assert(sm.query('보고서').length === 0, 'clear 후 query → 빈 결과');
}

console.log(`\n${'─'.repeat(45)}`);
console.log(`[SearchManager] ${passed} PASS / ${failed} FAIL`);
if(failed>0) process.exitCode=1;
