// tests/sync.test.js
// 업무Portal v2 — Calendar ↔ Todo Sync Tests (20 PASS)

import { createStore } from '../core/store.js';

let passed=0, failed=0;
function assert(c,m){ if(c){console.log('  ✅',m);passed++;}else{console.error('  ❌',m);failed++;} }
const SEED = '2026-06-10T00:00:00.000Z';

console.log('\n[Calendar ↔ Todo Sync]');

{
  const s = createStore();
  s.dispatch({ type:'TODO_ADD', payload:{
    id:'td-001', title:'보고서 작성', priority:'high',
    dueDate:'2026-06-15', eventId:'evt-001', createdAt:SEED
  }});
  const snap = s.getSnapshot();
  const todo  = snap.data.todos.items.find(t=>t.id==='td-001');
  const event = snap.data.calendar.events.find(e=>e.id==='evt-001');
  assert(!!todo,                          'TODO_ADD → todo 생성');
  assert(todo.linkedEventId==='evt-001',  'todo.linkedEventId 설정');
  assert(!!event,                         'dueDate → linked event 자동 생성');
  assert(event.title==='[할 일] 보고서 작성', 'event.title 설정');
  assert(event.date==='2026-06-15',       'event.date = dueDate');
  assert(event.todoId==='td-001',         'event.todoId 역참조');
}
{
  const s = createStore();
  s.dispatch({ type:'TODO_ADD', payload:{ id:'td-002', title:'no due', createdAt:SEED }});
  const snap = s.getSnapshot();
  assert(!snap.data.todos.items[0].linkedEventId, 'dueDate 없으면 linkedEventId null');
  assert(snap.data.calendar.events.length===0,    'dueDate 없으면 event 생성 안 됨');
}
{
  const s = createStore();
  s.dispatch({ type:'TODO_ADD', payload:{
    id:'td-003', title:'완료 테스트', dueDate:'2026-06-15', eventId:'evt-003', createdAt:SEED
  }});
  s.dispatch({ type:'TODO_COMPLETE', payload:{ id:'td-003' }});
  const snap  = s.getSnapshot();
  assert(snap.data.todos.items.find(t=>t.id==='td-003').done===true, 'TODO_COMPLETE → done');
  assert(snap.data.calendar.events.find(e=>e.id==='evt-003').color==='green', 'TODO_COMPLETE → event green');
}
{
  const s = createStore();
  s.dispatch({ type:'TODO_ADD', payload:{
    id:'td-004', title:'삭제', dueDate:'2026-06-20', eventId:'evt-004', createdAt:SEED
  }});
  s.dispatch({ type:'TODO_DELETE', payload:{ id:'td-004' }});
  const snap = s.getSnapshot();
  assert(!snap.data.todos.items.find(t=>t.id==='td-004'),      'TODO_DELETE → todo 삭제');
  assert(!snap.data.calendar.events.find(e=>e.id==='evt-004'), 'TODO_DELETE → linked event 삭제');
}
{
  const s = createStore();
  s.dispatch({ type:'TODO_ADD', payload:{
    id:'td-005', title:'역방향', dueDate:'2026-06-20', eventId:'evt-005', createdAt:SEED
  }});
  s.dispatch({ type:'EVENT_DELETE', payload:{ id:'evt-005' }});
  const snap = s.getSnapshot();
  const todo = snap.data.todos.items.find(t=>t.id==='td-005');
  assert(!snap.data.calendar.events.find(e=>e.id==='evt-005'), 'EVENT_DELETE → event 삭제');
  assert(!!todo,                                                'EVENT_DELETE → todo 유지');
  assert(todo.linkedEventId===null,                            'EVENT_DELETE → linkedEventId null');
}
{
  const s = createStore();
  s.dispatch({ type:'TODO_ADD', payload:{
    id:'td-006', title:'완료삭제', dueDate:'2026-06-25', eventId:'evt-006', createdAt:SEED
  }});
  s.dispatch({ type:'TODO_ADD', payload:{
    id:'td-007', title:'유지', dueDate:'2026-06-26', eventId:'evt-007', createdAt:SEED
  }});
  s.dispatch({ type:'TODO_COMPLETE', payload:{ id:'td-006' }});
  s.dispatch({ type:'TODO_CLEAR_DONE' });
  const snap = s.getSnapshot();
  assert(!snap.data.todos.items.find(t=>t.id==='td-006'),      'CLEAR_DONE → 완료 todo 삭제');
  assert(!snap.data.calendar.events.find(e=>e.id==='evt-006'), 'CLEAR_DONE → linked event 삭제');
  assert(!!snap.data.todos.items.find(t=>t.id==='td-007'),     'CLEAR_DONE → 미완료 todo 유지');
  assert(!!snap.data.calendar.events.find(e=>e.id==='evt-007'),'CLEAR_DONE → 미완료 event 유지');
}
{
  const run = () => {
    const s = createStore();
    s.dispatch({ type:'TODO_ADD', payload:{
      id:'det', title:'결정론', dueDate:'2026-06-10', eventId:'det-evt', createdAt:SEED
    }});
    const { data } = s.getSnapshot();
    return JSON.stringify({ todos:data.todos.items, events:data.calendar.events });
  };
  const [r1,r2,r3]=[run(),run(),run()];
  assert(r1===r2&&r2===r3,'Sync 결정론 — 3회 동일 결과');
}

console.log(`\n${'─'.repeat(45)}`);
console.log(`[Calendar ↔ Todo Sync] ${passed} PASS / ${failed} FAIL`);
if(failed>0) process.exitCode=1;
