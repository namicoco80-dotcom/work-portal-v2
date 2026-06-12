// tests/history-manager.test.js
// 업무Portal v2 — HistoryManager Tests

import { createStore }          from '../core/store.js';
import { createHistoryManager } from '../shared/history-manager.js';

let passed=0, failed=0;
function assert(c,m){ if(c){console.log('  ✅',m);passed++;}else{console.error('  ❌',m);failed++;} }
const SEED = '2026-06-10T00:00:00.000Z';
function stableHash(s) {
  const c = JSON.parse(JSON.stringify(s));
  if (c.metadata) delete c.metadata.updatedAt;
  return JSON.stringify(c);
}

console.log('\n[HistoryManager]');

// ── 1. 초기 상태 ──────────────────────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);
  const info  = hm.getInfo();

  assert(info.index  === 0,     '초기 index = 0');
  assert(info.total  === 1,     '초기 total = 1 (S0)');
  assert(!hm.canUndo(),         '초기: canUndo = false');
  assert(!hm.canRedo(),         '초기: canRedo = false');
}

// ── 2. dispatch → history append ──────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);

  store.dispatch({ type:'TODO_ADD', payload:{ id:'h1', title:'A', createdAt:SEED }});
  store.dispatch({ type:'TODO_ADD', payload:{ id:'h2', title:'B', createdAt:SEED }});

  const info = hm.getInfo();
  assert(info.index === 2,      'dispatch 2회 → index = 2');
  assert(info.total === 3,      'total = 3 (S0 + S1 + S2)');
  assert(hm.canUndo(),          'canUndo = true');
  assert(!hm.canRedo(),         'canRedo = false (최신 상태)');
}

// ── 3. undo 1회 ───────────────────────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);

  store.dispatch({ type:'TODO_ADD', payload:{ id:'u1', title:'첫번째', createdAt:SEED }});
  const hashAfterFirst = stableHash(store.getSnapshot());

  store.dispatch({ type:'TODO_ADD', payload:{ id:'u2', title:'두번째', createdAt:SEED }});
  assert(store.getSnapshot().data.todos.items.length === 2, 'undo 전: 2개');

  const result = hm.undo();
  assert(result === true,                                    'undo() → true');
  assert(store.getSnapshot().data.todos.items.length === 1, 'undo → 1개로 복원');
  assert(stableHash(store.getSnapshot()) === hashAfterFirst, 'undo → hash 일치');
  assert(hm.canRedo(),                                       'undo 후 canRedo = true');
  assert(hm.getInfo().index === 1,                           'undo 후 index = 1');
}

// ── 4. redo ───────────────────────────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);

  store.dispatch({ type:'TODO_ADD', payload:{ id:'r1', title:'A', createdAt:SEED }});
  store.dispatch({ type:'TODO_ADD', payload:{ id:'r2', title:'B', createdAt:SEED }});
  const hashLatest = stableHash(store.getSnapshot());

  hm.undo();
  hm.undo();
  assert(store.getSnapshot().data.todos.items.length === 0, 'undo 2회 → 0개');

  hm.redo();
  hm.redo();
  assert(store.getSnapshot().data.todos.items.length === 2, 'redo 2회 → 2개 복원');
  assert(stableHash(store.getSnapshot()) === hashLatest,    'redo → 최신 hash 일치');
  assert(!hm.canRedo(),                                     'redo 끝 → canRedo = false');
}

// ── 5. undo 후 새 dispatch → redo 이력 무효화 ─────
{
  const store = createStore();
  const hm    = createHistoryManager(store);

  store.dispatch({ type:'TODO_ADD', payload:{ id:'n1', title:'A', createdAt:SEED }});
  store.dispatch({ type:'TODO_ADD', payload:{ id:'n2', title:'B', createdAt:SEED }});
  store.dispatch({ type:'TODO_ADD', payload:{ id:'n3', title:'C', createdAt:SEED }});

  hm.undo(); // index = 2
  hm.undo(); // index = 1
  assert(hm.canRedo(), 'undo 2회 → canRedo = true');

  // 새 dispatch
  store.dispatch({ type:'TODO_ADD', payload:{ id:'n4', title:'D (새 분기)', createdAt:SEED }});
  assert(!hm.canRedo(),                                       '새 dispatch → redo 이력 무효화');
  assert(store.getSnapshot().data.todos.items.length === 2,   '새 분기: A + D');
  assert(store.getSnapshot().data.todos.items.some(t=>t.id==='n4'), 'n4 존재');
  assert(!store.getSnapshot().data.todos.items.some(t=>t.id==='n3'), 'n3 사라짐 (무효화)');
}

// ── 6. 경계: undo 불가 (index=0) ──────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);
  const result = hm.undo();
  assert(result === false,   'index=0: undo() → false');
  assert(!hm.canUndo(),      'index=0: canUndo = false');
}

// ── 7. 경계: redo 불가 (최신) ─────────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);
  store.dispatch({ type:'TODO_ADD', payload:{ id:'e1', title:'X', createdAt:SEED }});
  const result = hm.redo();
  assert(result === false,   '최신 상태: redo() → false');
}

// ── 8. sync 데이터 undo/redo ──────────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);

  store.dispatch({ type:'TODO_ADD', payload:{
    id:'s1', title:'sync undo', dueDate:'2026-06-20', eventId:'se1', createdAt:SEED
  }});
  assert(store.getSnapshot().data.calendar.events.length === 1, 'sync: event 생성');

  store.dispatch({ type:'TODO_COMPLETE', payload:{ id:'s1' }});
  assert(store.getSnapshot().data.calendar.events[0].color === 'green', 'sync: event green');

  hm.undo(); // complete 전으로
  assert(store.getSnapshot().data.todos.items[0].done === false,        'undo → done=false 복원');
  assert(store.getSnapshot().data.calendar.events[0].color !== 'green', 'undo → event color 복원');

  hm.redo(); // complete 후로
  assert(store.getSnapshot().data.todos.items[0].done === true,         'redo → done=true');
  assert(store.getSnapshot().data.calendar.events[0].color === 'green', 'redo → green 복원');
}

// ── 9. MAX_HISTORY (50) 초과 시 오래된 이력 제거 ──
{
  const store = createStore();
  const hm    = createHistoryManager(store);
  for (let i=0; i<55; i++) {
    store.dispatch({ type:'TODO_ADD', payload:{ id:`m${i}`, title:`m${i}`, createdAt:SEED }});
  }
  const info = hm.getInfo();
  assert(info.total <= 50,   'MAX_HISTORY 초과 → 50개로 제한');
  assert(hm.canUndo(),       'MAX 도달 후도 undo 가능');
}

// ── 10. clear ─────────────────────────────────────
{
  const store = createStore();
  const hm    = createHistoryManager(store);
  store.dispatch({ type:'TODO_ADD', payload:{ id:'cl1', title:'X', createdAt:SEED }});
  store.dispatch({ type:'TODO_ADD', payload:{ id:'cl2', title:'Y', createdAt:SEED }});
  hm.clear();
  const info = hm.getInfo();
  assert(info.index === 0,   'clear → index = 0');
  assert(info.total === 1,   'clear → total = 1');
  assert(!hm.canUndo(),      'clear → canUndo = false');
}

console.log(`\n${'─'.repeat(45)}`);
console.log(`[HistoryManager] ${passed} PASS / ${failed} FAIL`);
if(failed>0) process.exitCode=1;
