// engine/calendar-engine.js
// 업무Portal v2 — Calendar Engine (Pure Function)
//
// 담당: EVENT_ADD / EVENT_UPDATE / EVENT_DELETE
//
// 금지: 캘린더 월 이동, 글로우, 스크롤, 포커스, DOM, NLP 파싱
// 금지: crypto.randomUUID() / Date.now() 직접 호출
// ID/시간값은 반드시 payload로 주입 → Determinism 보장

export function reduce(snapshot, action) {
  switch (action.type) {
    case 'EVENT_ADD':    return handleAdd(snapshot, action.payload);
    case 'EVENT_UPDATE': return handleUpdate(snapshot, action.payload);
    case 'EVENT_DELETE': return handleDelete(snapshot, action.payload);
    default:             return snapshot;
  }
}

// EVENT_ADD
// payload: { id, title, date, time?, color?, createdAt }
function handleAdd(snapshot, payload) {
  const event = {
    id:        payload.id,
    title:     payload.title,
    date:      payload.date,
    time:      payload.time      || null,
    color:     payload.color     || 'default',
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

// EVENT_UPDATE
// payload: { id, changes: { title?, date?, time?, color? } }
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

// EVENT_DELETE
// payload: { id }
function handleDelete(snapshot, payload) {
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      calendar: {
        ...snapshot.data.calendar,
        events: snapshot.data.calendar.events.filter(e => e.id !== payload.id),
      },
    },
  };
}
