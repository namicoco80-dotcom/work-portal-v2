# 업무Portal v2 — Store Contract

작성일: 2026-06-09
상태: 확정

---

## 규칙

상태 변경은 `store.dispatch(action)` 단 하나의 경로만 허용.

### 금지
```javascript
snapshot.todos.items.push(...)     // 직접 변경 금지
snapshot.data.memo = ...           // 직접 변경 금지
store._snapshot.projects.splice(…) // 내부 직접 접근 금지
```

### 허용
```javascript
store.dispatch({ type: 'TODO_ADD', payload: { ... } })
```

ESLint로 `store._snapshot` 직접 접근 감지 시 빌드 차단.

---

## Store 인터페이스

```javascript
// core/store.js
const store = {

  // 상태 변경 유일 경로
  dispatch(action) {
    const prev = this._snapshot;
    const next = engine.reduce(prev, action);
    this._snapshot = Object.freeze(next);
    this._subscribers.forEach(cb => cb(next, prev));
  },

  // 읽기 전용
  getSnapshot() {
    return this._snapshot;
  },

  // UI 구독
  subscribe(cb) {
    this._subscribers.push(cb);
    return () => {  // unsubscribe 반환
      this._subscribers = this._subscribers.filter(s => s !== cb);
    };
  },

  // 내부 — 직접 접근 금지
  _snapshot:    INITIAL_SNAPSHOT,
  _subscribers: [],
};
```

---

## 흐름

```
UI 이벤트
  ↓
store.dispatch({ type, payload })
  ↓
engine.reduce(snapshot, action)  ← Pure Function
  ↓
new Snapshot (Immutable)
  ↓
store._snapshot 교체
  ↓
subscribe() 통지
  ↓
UI render(newSnapshot)
```

이 흐름 외 상태 변경 경로 없음.

---

## Object.freeze 정책

dispatch 후 새 Snapshot은 `Object.freeze()` 적용.
직접 변경 시도 시 런타임 에러 발생 → 즉시 발견 가능.

```javascript
// 런타임에서 즉시 감지
const snap = store.getSnapshot();
snap.data.todos.items.push(...)  // TypeError: Cannot add property
```

---

## ESLint 강제

```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "MemberExpression[object.name='store'][property.name='_snapshot']",
        "message": "store._snapshot 직접 접근 금지. store.getSnapshot() 사용."
      }
    ]
  }
}
```
