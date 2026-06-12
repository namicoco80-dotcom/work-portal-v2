// tests/recovery.test.js
// 업무Portal v2 — Recovery Test
//
// Repository 계약 검증 (SQLite 없이 JSON 직렬화/역직렬화로 동등 검증)
// 핵심: save = JSON.stringify → disk / load = JSON.parse
// SQLite는 이 계약의 transport일 뿐

import { createStore } from '../core/store.js';

let passed=0, failed=0;
function assert(c,m){ if(c){console.log('  ✅',m);passed++;}else{console.error('  ❌',m);failed++;} }
const SEED = '2026-06-10T00:00:00.000Z';

/* --- In-memory Repository (JSON round-trip = SQLite 동등) --- */
function makeRepo() {
  let current = null;
  const history = [];
  return {
    save(snapshot) {
      const serialized = JSON.stringify(snapshot);  // SQLite TEXT 저장 동등
      const entry = { id: history.length + 1, data: serialized, saved_at: new Date().toISOString() };
      history.push(entry);
      current = entry;
    },
    load() {
      return current ? JSON.parse(current.data) : null;  // SQLite parse 동등
    },
    history(n=10) { return [...history].reverse().slice(0, n); },
  };
}

function stableHash(snapshot) {
  const s = JSON.parse(JSON.stringify(snapshot));
  if (s.metadata) delete s.metadata.updatedAt;
  return JSON.stringify(s);
}

console.log('\n[Recovery Test]');

// ── 시나리오 1: 저장 → 복원 → hash 동일 ──────────
{
  const repo  = makeRepo();
  const store = createStore();

  store.dispatch({ type:'TODO_ADD', payload:{
    id:'rec-1', title:'복원 할 일', priority:'high',
    dueDate:'2026-06-20', eventId:'rec-evt-1', createdAt:SEED
  }});
  store.dispatch({ type:'MEMO_SET', payload:{ date:'2026-06-10', content:'복원 메모', updatedAt:SEED }});
  store.dispatch({ type:'EVENT_ADD', payload:{
    id:'rec-evt-2', title:'독립 이벤트', date:'2026-06-15', createdAt:SEED
  }});

  const beforeHash = stableHash(store.getSnapshot());
  repo.save(store.getSnapshot());

  // 재실행 시뮬레이션
  const store2 = createStore();
  assert(store2.getSnapshot().data.todos.items.length === 0, '재실행 직후: 빈 store');

  const saved = repo.load();
  assert(!!saved, 'repository에서 snapshot 로드 성공');

  store2.dispatch({ type:'SNAPSHOT_RESTORE', payload: saved });
  const afterHash = stableHash(store2.getSnapshot());

  assert(beforeHash === afterHash,                        '저장 전 hash == 복원 후 hash ✓');
  assert(store2.getSnapshot().data.todos.items.length === 1, 'Todo 복원');
  assert(store2.getSnapshot().data.todos.items[0].linkedEventId === 'rec-evt-1', 'linkedEventId 복원');
  assert(store2.getSnapshot().data.calendar.events.length === 2, 'Calendar events 복원');
  assert(store2.getSnapshot().data.memo.byDate['2026-06-10']?.content === '복원 메모', 'Memo 복원');
}

// ── 시나리오 2: 복원 후 dispatch → 재저장 → 재복원 ─
{
  const repo  = makeRepo();
  const store = createStore();
  store.dispatch({ type:'TODO_ADD', payload:{ id:'rc-2', title:'기존', createdAt:SEED }});
  repo.save(store.getSnapshot());

  const store2 = createStore();
  store2.dispatch({ type:'SNAPSHOT_RESTORE', payload: repo.load() });
  store2.dispatch({ type:'TODO_ADD',      payload:{ id:'rc-3', title:'추가', createdAt:SEED }});
  store2.dispatch({ type:'TODO_COMPLETE', payload:{ id:'rc-2' }});

  repo.save(store2.getSnapshot());
  const hash2 = stableHash(store2.getSnapshot());

  const store3 = createStore();
  store3.dispatch({ type:'SNAPSHOT_RESTORE', payload: repo.load() });
  assert(stableHash(store3.getSnapshot()) === hash2,         '2차 저장→복원 hash 동일');
  assert(store3.getSnapshot().data.todos.items.length === 2, '복원 후 추가된 todo 유지');
  assert(store3.getSnapshot().data.todos.items.find(t=>t.id==='rc-2')?.done, '완료 상태 유지');
}

// ── 시나리오 3: history 다건 저장 ─────────────────
{
  const repo  = makeRepo();
  const store = createStore();
  for (let i=1; i<=5; i++) {
    store.dispatch({ type:'TODO_ADD', payload:{ id:`h-${i}`, title:`이력${i}`, createdAt:SEED }});
    repo.save(store.getSnapshot());
  }
  const hist = repo.history(10);
  assert(hist.length === 5,                                  'history 5개 기록');
  assert(hist[0].id > hist[4].id,                           'DESC 정렬 (최신 먼저)');
  assert(repo.load()?.data.todos.items.length === 5,        'current = 최신 snapshot');
}

// ── 시나리오 4: sync 완전 복원 ────────────────────
{
  const repo  = makeRepo();
  const store = createStore();
  store.dispatch({ type:'TODO_ADD', payload:{
    id:'s-td', title:'sync', dueDate:'2026-06-25', eventId:'s-evt', createdAt:SEED
  }});
  store.dispatch({ type:'TODO_COMPLETE', payload:{ id:'s-td' }});
  repo.save(store.getSnapshot());

  const store2 = createStore();
  store2.dispatch({ type:'SNAPSHOT_RESTORE', payload: repo.load() });
  const snap = store2.getSnapshot();
  assert(snap.data.todos.items.find(t=>t.id==='s-td')?.done === true,        'sync: done 복원');
  assert(snap.data.calendar.events.find(e=>e.id==='s-evt')?.color==='green', 'sync: green 복원');
}

// ── 시나리오 5: JSON round-trip 무결성 ────────────
{
  // SQLite TEXT 저장의 핵심: JSON.stringify → JSON.parse 과정에서 데이터 손실 없음
  const store = createStore();
  store.dispatch({ type:'TODO_ADD', payload:{
    id:'rt-1', title:'round-trip "따옴표" & <특수문자>', createdAt:SEED
  }});
  store.dispatch({ type:'MEMO_SET', payload:{
    date:'2026-06-10', content:'줄바꿈\n포함\t탭', updatedAt:SEED
  }});

  const snap = store.getSnapshot();
  const roundTrip = JSON.parse(JSON.stringify(snap));

  assert(
    roundTrip.data.todos.items[0].title === snap.data.todos.items[0].title,
    'JSON round-trip: 특수문자 보존'
  );
  assert(
    roundTrip.data.memo.byDate['2026-06-10'].content === snap.data.memo.byDate['2026-06-10'].content,
    'JSON round-trip: 줄바꿈/탭 보존'
  );
}

console.log(`\n${'─'.repeat(45)}`);
console.log(`[Recovery Test] ${passed} PASS / ${failed} FAIL`);
if(failed>0) process.exitCode=1;
