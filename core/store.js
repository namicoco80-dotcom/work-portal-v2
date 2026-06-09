// core/store.js
// 업무Portal v2 — 단일 상태 저장소
//
// 규칙:
//   store.dispatch(action)  — 상태 변경 유일 경로
//   store.getSnapshot()     — 읽기 전용
//   store.subscribe(cb)     — UI 구독
//
// 금지:
//   store._snapshot 직접 접근
//   snapshot.data.todos.items.push(...) 직접 변경

import { INITIAL_SNAPSHOT, createSnapshot } from './snapshot.js';
import { reduce } from '../engine/index.js';

function createStore(initialSnapshot = INITIAL_SNAPSHOT) {
  let _snapshot    = initialSnapshot;
  let _subscribers = [];

  return {
    /**
     * 상태 변경 유일 경로
     * @param {{ type: string, payload: any }} action
     */
    dispatch(action) {
      if (!action || !action.type) {
        console.warn('[Store] dispatch: invalid action', action);
        return;
      }
      const prev = _snapshot;
      const next = reduce(prev, action);
      _snapshot  = Object.freeze({
        ...next,
        metadata: {
          ...next.metadata,
          updatedAt: new Date().toISOString(),
        },
      });
      _subscribers.forEach(cb => {
        try { cb(_snapshot, prev); }
        catch (e) { console.error('[Store] subscriber error', e); }
      });
    },

    /**
     * 현재 Snapshot 반환 (읽기 전용)
     */
    getSnapshot() {
      return _snapshot;
    },

    /**
     * 상태 변경 구독
     * @param {(next, prev) => void} cb
     * @returns {() => void} unsubscribe 함수
     */
    subscribe(cb) {
      _subscribers.push(cb);
      return function unsubscribe() {
        _subscribers = _subscribers.filter(s => s !== cb);
      };
    },

    /**
     * 테스트 전용 — 초기 상태로 리셋
     * 프로덕션 코드에서 호출 금지
     */
    _reset(snapshot = INITIAL_SNAPSHOT) {
      _snapshot    = snapshot;
      _subscribers = [];
    },
  };
}

export const store = createStore();
