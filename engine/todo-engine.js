// engine/todo-engine.js
// 업무Portal v2 — Todo Engine (Pure Function)
//
// 금지: document / localStorage / sqlite / ipcRenderer
// 허용: 입력 snapshot + action → 새 snapshot 반환

export function reduce(snapshot, action) {
  switch (action.type) {
    case 'TODO_ADD':       return handleAdd(snapshot, action.payload);
    case 'TODO_UPDATE':    return handleUpdate(snapshot, action.payload);
    case 'TODO_DELETE':    return handleDelete(snapshot, action.payload);
    case 'TODO_COMPLETE':  return handleComplete(snapshot, action.payload);
    case 'TODO_CLEAR_DONE':return handleClearDone(snapshot);
    default:               return snapshot;
  }
}

function handleAdd(snapshot, payload) {
  const todo = {
    id:        payload.id,
    title:     payload.title,
    priority:  payload.priority  || 'normal',
    dueDate:   payload.dueDate   || null,
    projectId: payload.projectId || null,
    done:      false,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      todos: {
        ...snapshot.data.todos,
        items: [todo, ...snapshot.data.todos.items],
      },
    },
  };
}

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

function handleDelete(snapshot, payload) {
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      todos: {
        ...snapshot.data.todos,
        items: snapshot.data.todos.items.filter(t => t.id !== payload.id),
      },
    },
  };
}

function handleComplete(snapshot, payload) {
  return handleUpdate(snapshot, { id: payload.id, changes: { done: true } });
}

function handleClearDone(snapshot) {
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      todos: {
        ...snapshot.data.todos,
        items: snapshot.data.todos.items.filter(t => !t.done),
      },
    },
  };
}
