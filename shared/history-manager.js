// shared/history-manager.js
// 업무Portal v2 — HistoryManager
//
// 역할: snapshot pointer 이동으로 Undo/Redo 구현
//
// 규칙:
//   Engine 밖 — history는 계산 결과가 아님
//   Store 밖  — store는 저장 책임 없음
//   UI 밖     — UI는 undo()/redo() 호출만
//
// 구조:
//   snapshots[] — immutable snapshot 배열
//   index       — 현재 위치 pointer
//
//   dispatch → store subscribe → push(snapshot)
//   undo → index-- → SNAPSHOT_RESTORE
//   redo → index++ → SNAPSHOT_RESTORE
//
// 금지: snapshot 직접 수정 / engine 호출 / DOM 접근

const MAX_HISTORY = 50;

export function createHistoryManager(store) {
  let snapshots   = [JSON.parse(JSON.stringify(store.getSnapshot()))];  // S0 = deep clone
  let index       = 0;
  let _paused     = false;  // SNAPSHOT_RESTORE 중 append 방지

  /* --- Store subscribe: dispatch → append --------- */
  store.subscribe((next) => {
    if (_paused) return;

    // Redo 이력 제거 (새 action이 오면 앞 이력 무효화)
    snapshots = snapshots.slice(0, index + 1);

    // deep clone 후 보관 — reference 오염 방지
    // engine이 새 객체를 반환해도 중첩 배열은 mutable이므로 clone 필수
    snapshots.push(JSON.parse(JSON.stringify(next)));
    if (snapshots.length > MAX_HISTORY) {
      snapshots = snapshots.slice(snapshots.length - MAX_HISTORY);
      index = snapshots.length - 1;
    } else {
      index++;
    }
  });

  return {
    /* --- undo ----------------------------------------
       이전 snapshot으로 이동
       index === 0 이면 더 이상 없음
    ------------------------------------------------- */
    undo() {
      if (index <= 0) return false;
      index--;
      _paused = true;
      // deep clone — 꺼낸 snapshot reference 보호
      store.dispatch({ type: 'SNAPSHOT_RESTORE', payload: JSON.parse(JSON.stringify(snapshots[index])) });
      _paused = false;
      return true;
    },

    /* --- redo ----------------------------------------
       다음 snapshot으로 이동
       index === snapshots.length - 1 이면 끝
    ------------------------------------------------- */
    redo() {
      if (index >= snapshots.length - 1) return false;
      index++;
      _paused = true;
      // deep clone — 꺼낸 snapshot reference 보호
      store.dispatch({ type: 'SNAPSHOT_RESTORE', payload: JSON.parse(JSON.stringify(snapshots[index])) });
      _paused = false;
      return true;
    },

    /* --- canUndo / canRedo -------------------------- */
    canUndo() { return index > 0; },
    canRedo()  { return index < snapshots.length - 1; },

    /* --- info --------------------------------------- */
    getInfo() {
      return {
        index,
        total:    snapshots.length,
        canUndo:  index > 0,
        canRedo:  index < snapshots.length - 1,
      };
    },

    /* --- clear (앱 초기화 / 테스트 리셋) ------------ */
    clear() {
      snapshots = [store.getSnapshot()];
      index     = 0;
    },
  };
}
