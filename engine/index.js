// engine/index.js
// 업무Portal v2 — Engine 라우터
//
// 규칙:
//   reduce() 는 Pure Function
//   DOM / localStorage / SQLite / Electron API 접근 금지
//   같은 입력 → 반드시 같은 출력

import { reduce as todoReduce }     from './todo-engine.js';
import { reduce as memoReduce }     from './memo-engine.js';
import { reduce as calendarReduce } from './calendar-engine.js';

const TODO_ACTIONS     = ['TODO_ADD', 'TODO_UPDATE', 'TODO_DELETE', 'TODO_COMPLETE', 'TODO_CLEAR_DONE'];
const MEMO_ACTIONS     = ['MEMO_SET', 'MEMO_UPDATE', 'MEMO_PIN'];
const CALENDAR_ACTIONS = ['EVENT_ADD', 'EVENT_UPDATE', 'EVENT_DELETE'];

export function reduce(snapshot, action) {
  if (TODO_ACTIONS.includes(action.type))     return todoReduce(snapshot, action);
  if (MEMO_ACTIONS.includes(action.type))     return memoReduce(snapshot, action);
  if (CALENDAR_ACTIONS.includes(action.type)) return calendarReduce(snapshot, action);

  if (action.type === 'SNAPSHOT_RESTORE') {
    return { ...action.payload.snapshot };
  }
  if (action.type === 'SNAPSHOT_RESET') {
    const { INITIAL_SNAPSHOT } = require('./snapshot.js');
    return { ...INITIAL_SNAPSHOT };
  }

  // 모르는 Action — INVALID STATE
  const err = '[Engine] INVALID STATE: unknown action type: ' + action.type;
  console.error(err);
  throw new Error(err);
}
