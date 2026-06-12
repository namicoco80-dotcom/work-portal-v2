// engine/todo-engine.js
// 업무Portal v2 — Todo Engine (Pure Function)
//
// STEP 8: Calendar ↔ Todo Sync 추가
//
// Sync 규칙 (engine 단일 지점에서만 처리):
//   TODO_ADD + dueDate → linked calendarEvent 자동 생성
//   TODO_DELETE        → linked calendarEvent 자동 삭제
//   TODO_COMPLETE      → linked calendarEvent color = 'green' (완료 표시)
//   EVENT_DELETE       → linked todo의 linkedEventId 제거 (역방향)
//
// 금지: document / localStorage / sqlite / ipcRenderer
// 금지: Date.now() / Math.random() 직접 사용

export function reduce(snapshot, action) {
  switch (action.type) {
    case 'TODO_ADD':        return handleAdd(snapshot, action.payload);
    case 'TODO_UPDATE':     return handleUpdate(snapshot, action.payload);
    case 'TODO_DELETE':     return handleDelete(snapshot, action.payload);
    case 'TODO_COMPLETE':   return handleComplete(snapshot, action.payload);
    case 'TODO_CLEAR_DONE': return handleClearDone(snapshot);
    default:                return snapshot;
  }
}

/* --- TODO_ADD ----------------------------------------
   dueDate 있으면 linked calendarEvent 동시 생성
   payload: { id, title, priority?, dueDate?, projectId?, createdAt, eventId? }
   eventId: UI가 미리 생성해서 주입 (determinism 유지)
----------------------------------------------------- */
function handleAdd(snapshot, payload) {
  const todo = {
    id:             payload.id,
    title:          payload.title,
    priority:       payload.priority  || 'normal',
    dueDate:        payload.dueDate   || null,
    projectId:      payload.projectId || null,
    done:           false,
    createdAt:      payload.createdAt || '',
    linkedEventId:  null,   // 아래에서 채워질 수 있음
  };

  let newEvents = snapshot.data.calendar.events;

  // dueDate 있을 때만 linked event 생성
  if (payload.dueDate && payload.eventId) {
    const linkedEvent = {
      id:        payload.eventId,
      title:     `[할 일] ${payload.title}`,
      date:      payload.dueDate,
      time:      null,
      color:     'default',
      todoId:    payload.id,     // 역방향 참조
      createdAt: payload.createdAt || '',
    };
    newEvents = [...newEvents, linkedEvent];
    todo.linkedEventId = payload.eventId;
  }

  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      todos: {
        ...snapshot.data.todos,
        items: [todo, ...snapshot.data.todos.items],
      },
      calendar: {
        ...snapshot.data.calendar,
        events: newEvents,
      },
    },
  };
}

/* --- TODO_UPDATE ------------------------------------ */
function handleUpdate(snapshot, payload) {
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      todos: {
        ...snapshot.data.todos,
        items: snapshot.data.todos.items.map(t =>
          t.id === payload.id ? { ...t, ...payload.changes } : t
        ),
      },
    },
  };
}

/* --- TODO_DELETE ------------------------------------
   linked calendarEvent도 동시 삭제
----------------------------------------------------- */
function handleDelete(snapshot, payload) {
  const target = snapshot.data.todos.items.find(t => t.id === payload.id);
  const linkedEventId = target?.linkedEventId || null;

  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      todos: {
        ...snapshot.data.todos,
        items: snapshot.data.todos.items.filter(t => t.id !== payload.id),
      },
      calendar: {
        ...snapshot.data.calendar,
        events: linkedEventId
          ? snapshot.data.calendar.events.filter(e => e.id !== linkedEventId)
          : snapshot.data.calendar.events,
      },
    },
  };
}

/* --- TODO_COMPLETE ----------------------------------
   linked calendarEvent color → 'green' (완료 시각 표시)
----------------------------------------------------- */
function handleComplete(snapshot, payload) {
  const target = snapshot.data.todos.items.find(t => t.id === payload.id);
  const linkedEventId = target?.linkedEventId || null;

  const afterTodo = handleUpdate(snapshot, { id: payload.id, changes: { done: true } });

  if (!linkedEventId) return afterTodo;

  return {
    ...afterTodo,
    data: {
      ...afterTodo.data,
      calendar: {
        ...afterTodo.data.calendar,
        events: afterTodo.data.calendar.events.map(e =>
          e.id === linkedEventId ? { ...e, color: 'green' } : e
        ),
      },
    },
  };
}

/* --- TODO_CLEAR_DONE -------------------------------- */
function handleClearDone(snapshot) {
  // 완료된 todo의 linked event도 함께 제거
  const doneIds    = new Set(snapshot.data.todos.items.filter(t => t.done).map(t => t.id));
  const linkedIds  = new Set(
    snapshot.data.todos.items
      .filter(t => t.done && t.linkedEventId)
      .map(t => t.linkedEventId)
  );

  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      todos: {
        ...snapshot.data.todos,
        items: snapshot.data.todos.items.filter(t => !doneIds.has(t.id)),
      },
      calendar: {
        ...snapshot.data.calendar,
        events: snapshot.data.calendar.events.filter(e => !linkedIds.has(e.id)),
      },
    },
  };
}
