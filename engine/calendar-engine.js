// engine/calendar-engine.js
// 업무Portal v2 — Calendar Engine (Pure Function)
//
// STEP 8: EVENT_DELETE 시 linked todo.linkedEventId 제거 (역방향)
//
// 금지: DOM / store 직접 접근 / crypto.randomUUID() / Date.now() 직접 호출

export function reduce(snapshot, action) {
  switch (action.type) {
    case 'EVENT_ADD':    return handleAdd(snapshot, action.payload);
    case 'EVENT_UPDATE': return handleUpdate(snapshot, action.payload);
    case 'EVENT_DELETE': return handleDelete(snapshot, action.payload);
    default:             return snapshot;
  }
}

/* --- EVENT_ADD --------------------------------------- */
function handleAdd(snapshot, payload) {
  const event = {
    id:        payload.id,
    title:     payload.title,
    date:      payload.date,
    time:      payload.time      || null,
    color:     payload.color     || 'default',
    todoId:    payload.todoId    || null,   // linked todo 역참조
    createdAt: payload.createdAt || '',
  };
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      calendar: {
        ...snapshot.data.calendar,
        events: [...snapshot.data.calendar.events, event],
      },
    },
  };
}

/* --- EVENT_UPDATE ------------------------------------ */
function handleUpdate(snapshot, payload) {
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      calendar: {
        ...snapshot.data.calendar,
        events: snapshot.data.calendar.events.map(e =>
          e.id === payload.id ? { ...e, ...payload.changes } : e
        ),
      },
    },
  };
}

/* --- EVENT_DELETE ------------------------------------
   linked todo의 linkedEventId 제거 (todo 자체는 유지)
----------------------------------------------------- */
function handleDelete(snapshot, payload) {
  const target    = snapshot.data.calendar.events.find(e => e.id === payload.id);
  const linkedTodoId = target?.todoId || null;

  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      calendar: {
        ...snapshot.data.calendar,
        events: snapshot.data.calendar.events.filter(e => e.id !== payload.id),
      },
      todos: {
        ...snapshot.data.todos,
        // linked todo의 linkedEventId만 null로 — todo 자체는 유지
        items: linkedTodoId
          ? snapshot.data.todos.items.map(t =>
              t.id === linkedTodoId ? { ...t, linkedEventId: null } : t
            )
          : snapshot.data.todos.items,
      },
    },
  };
}
