// shared/manager-models.js
// 업무Portal v2 — Manager Pure State Models
//
// DOM 없음. Electron 없음. 순수 상태 전이 모델.
// 이 모델을 기반으로 실제 Manager가 구현됨.

// ── FocusManager State Model ──────────────────────────
//
// State:
//   { targetId: string | null, restoredAt: string | null }
//
// Transitions:
//   focusEditor()   → { targetId: 'memo-editor', restoredAt: null }
//   focusById(id)   → { targetId: id, restoredAt: null }
//   restore()       → { targetId: prev.targetId, restoredAt: timestamp }

export function focusReduce(state = { targetId: null, restoredAt: null }, action) {
  switch (action.type) {
    case 'FOCUS_EDITOR':
      return { targetId: 'memo-editor', restoredAt: null };
    case 'FOCUS_BY_ID':
      return { targetId: action.id, restoredAt: null };
    case 'FOCUS_RESTORE':
      return { ...state, restoredAt: action.timestamp };
    case 'FOCUS_CLEAR':
      return { targetId: null, restoredAt: null };
    default:
      return state;
  }
}

// ── OverlayManager State Model ────────────────────────
//
// State:
//   { stack: string[] }   // 열린 overlay id 목록, 마지막이 최상위
//
// Transitions:
//   open(id)   → stack에 push (중복 무시)
//   close(id)  → stack에서 제거
//   closeAll() → stack = []

export function overlayReduce(state = { stack: [] }, action) {
  switch (action.type) {
    case 'OVERLAY_OPEN':
      if (state.stack.includes(action.id)) return state; // 중복 무시
      return { stack: [...state.stack, action.id] };
    case 'OVERLAY_CLOSE':
      return { stack: state.stack.filter(id => id !== action.id) };
    case 'OVERLAY_CLOSE_ALL':
      return { stack: [] };
    default:
      return state;
  }
}

// ── ModalManager State Model ──────────────────────────
//
// State:
//   { queue: Modal[] }
//   Modal: { id, type, title, message, status: 'pending'|'resolved'|'rejected' }
//
// Transitions:
//   push(modal)      → queue에 추가
//   resolve(id)      → status = 'resolved'
//   reject(id)       → status = 'rejected'
//   remove(id)       → queue에서 제거
//
// 규칙:
//   queue[0]가 현재 표시 중인 모달
//   resolved/rejected 즉시 remove

export function modalReduce(state = { queue: [] }, action) {
  switch (action.type) {
    case 'MODAL_PUSH':
      return { queue: [...state.queue, { ...action.modal, status: 'pending' }] };
    case 'MODAL_RESOLVE':
      return {
        queue: state.queue.map(m =>
          m.id === action.id ? { ...m, status: 'resolved', result: action.result } : m
        ),
      };
    case 'MODAL_REJECT':
      return {
        queue: state.queue.map(m =>
          m.id === action.id ? { ...m, status: 'rejected' } : m
        ),
      };
    case 'MODAL_REMOVE':
      return { queue: state.queue.filter(m => m.id !== action.id) };
    default:
      return state;
  }
}

// ── 헬퍼: 현재 활성 모달 ─────────────────────────────
export function getActiveModal(modalState) {
  return modalState.queue.find(m => m.status === 'pending') || null;
}

// ── 헬퍼: 최상위 overlay id ──────────────────────────
export function getTopOverlay(overlayState) {
  const { stack } = overlayState;
  return stack.length > 0 ? stack[stack.length - 1] : null;
}
