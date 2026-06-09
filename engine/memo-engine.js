// engine/memo-engine.js
// 업무Portal v2 — Memo Engine (Pure Function)
//
// 금지: document / localStorage / sqlite / ipcRenderer / Date.now() 직접 호출
// 시간값은 반드시 payload.updatedAt 으로 주입 → Determinism 보장

export function reduce(snapshot, action) {
  switch (action.type) {
    case 'MEMO_SET': return handleSet(snapshot, action.payload);
    case 'MEMO_PIN': return handlePin(snapshot, action.payload);
    default:         return snapshot;
  }
}

// MEMO_SET: 날짜별 메모 저장
// payload: { date: 'YYYY-MM-DD', content: string, updatedAt: ISO8601 }
function handleSet(snapshot, payload) {
  const { date, content, updatedAt } = payload;
  const prev = snapshot.data.memo.byDate[date] || {};
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      memo: {
        ...snapshot.data.memo,
        byDate: {
          ...snapshot.data.memo.byDate,
          [date]: {
            ...prev,
            content,
            updatedAt: updatedAt || prev.updatedAt || '',
          },
        },
      },
    },
  };
}

// MEMO_PIN: 날짜별 메모 고정/해제
// payload: { date: 'YYYY-MM-DD', pinned: boolean }
function handlePin(snapshot, payload) {
  const { date, pinned } = payload;
  const prev = snapshot.data.memo.byDate[date] || {};
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      memo: {
        ...snapshot.data.memo,
        byDate: {
          ...snapshot.data.memo.byDate,
          [date]: {
            ...prev,
            pinned: !!pinned,
          },
        },
      },
    },
  };
}
