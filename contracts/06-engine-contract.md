# 업무Portal v2 — Engine Contract

작성일: 2026-06-09
상태: 확정

---

## 규칙

Engine = Pure Function. 같은 입력 → 반드시 같은 출력.

```
Input:  Snapshot + Action
Output: New Snapshot
Side Effect: 없음
```

### 금지
```javascript
document.querySelector(...)   // DOM 접근 금지
localStorage.setItem(...)      // Storage 접근 금지
sqlite.query(...)              // DB 접근 금지
ipcRenderer.invoke(...)        // Electron API 금지
Date.now()                     // 직접 호출 금지 → payload로 주입
Math.random()                  // 직접 호출 금지 → id는 payload로 주입
```

### 허용
```javascript
export function reduce(snapshot, action) {
  // snapshot 읽기 ✅
  // 새 snapshot 반환 ✅
  return { ...snapshot, ... };
}
```

---

## 파일 구조

```
engine/
  memo-engine.js
  todo-engine.js
  calendar-engine.js
  project-engine.js
  kpi-engine.js
  settings-engine.js
```

각 파일은 담당 도메인 Action만 처리.

---

## 인터페이스

```javascript
// 각 engine 파일 export 형태
export function reduce(snapshot, action) {
  switch (action.type) {
    case 'TODO_ADD':    return handleAdd(snapshot, action.payload);
    case 'TODO_UPDATE': return handleUpdate(snapshot, action.payload);
    case 'TODO_DELETE': return handleDelete(snapshot, action.payload);
    default:            return snapshot;  // 모르는 Action은 그대로 반환
  }
}
```

---

## 테스트 기준

Engine 함수는 반드시 Unit Test 통과 후 다음 Step 진행.

```javascript
// 예시
const s0 = INITIAL_SNAPSHOT;
const s1 = reduce(s0, { type: 'TODO_ADD', payload: { id: '1', title: '테스트' } });

assert(s1.data.todos.items.length === 1);
assert(s0.data.todos.items.length === 0); // 원본 불변 확인
```
