# 업무Portal v2 — Action Contract
# v1.0 기준선 (2026-06-13)
#
# 모든 dispatch는 이 계약을 따릅니다.
# payload 필드 중 * 표시는 필수.

---

## Todo Actions

### TODO_ADD
```js
store.dispatch({
  type: 'TODO_ADD',
  payload: {
    id:        string,   // * newId('td') — UI에서 생성
    title:     string,   // * 최대 100자
    priority:  'high' | 'normal' | 'low',  // default: 'normal'
    dueDate:   'YYYY-MM-DD' | null,
    projectId: string | null,
    eventId:   string | null,  // dueDate 있을 때 UI가 newId('evt')로 주입
    createdAt: ISO8601,  // * nowISO()
  }
})
```
결과:
- `snapshot.data.todos.items`에 추가 (newest first)
- `dueDate` + `eventId` 있으면 linked CalendarEvent 자동 생성
- `todo.linkedEventId = eventId`

---

### TODO_UPDATE
```js
store.dispatch({
  type: 'TODO_UPDATE',
  payload: {
    id:      string,  // *
    changes: {        // * 변경할 필드만
      title?:     string,
      priority?:  'high' | 'normal' | 'low',
      dueDate?:   'YYYY-MM-DD' | null,
      done?:      boolean,
    }
  }
})
```

---

### TODO_COMPLETE
```js
store.dispatch({
  type: 'TODO_COMPLETE',
  payload: { id: string }  // *
})
```
결과:
- `todo.done = true`
- linked event 있으면 `event.color = 'green'`

---

### TODO_DELETE
```js
store.dispatch({
  type: 'TODO_DELETE',
  payload: { id: string }  // *
})
```
결과:
- todo 삭제
- linked event cascade 삭제

---

### TODO_CLEAR_DONE
```js
store.dispatch({ type: 'TODO_CLEAR_DONE' })
```
결과:
- `done === true` 인 todo 전부 삭제
- 해당 todo의 linked event도 삭제

---

## Calendar Actions

### EVENT_ADD
```js
store.dispatch({
  type: 'EVENT_ADD',
  payload: {
    id:        string,   // * newId('evt')
    title:     string,   // *
    date:      'YYYY-MM-DD',  // *
    time:      'HH:MM' | null,
    color:     'default' | 'red' | 'green',  // default: 'default'
    todoId:    string | null,  // linked todo 역참조 (sync 시 자동 설정)
    createdAt: ISO8601,  // *
  }
})
```

---

### EVENT_UPDATE
```js
store.dispatch({
  type: 'EVENT_UPDATE',
  payload: {
    id:      string,  // *
    changes: {
      title?:  string,
      date?:   'YYYY-MM-DD',
      time?:   'HH:MM' | null,
      color?:  'default' | 'red' | 'green',
    }
  }
})
```

---

### EVENT_DELETE
```js
store.dispatch({
  type: 'EVENT_DELETE',
  payload: { id: string }  // *
})
```
결과:
- event 삭제
- linked todo의 `linkedEventId = null` (todo 자체는 유지)

---

## Memo Actions

### MEMO_SET
```js
store.dispatch({
  type: 'MEMO_SET',
  payload: {
    date:      'YYYY-MM-DD',  // *
    content:   string,        // *
    updatedAt: ISO8601,       // *
  }
})
```
결과:
- `snapshot.data.memo.byDate[date] = { content, updatedAt }`
- 같은 날짜 재호출 시 덮어씀

---

## System Actions

### SNAPSHOT_RESTORE
```js
store.dispatch({
  type: 'SNAPSHOT_RESTORE',
  payload: snapshotObject  // * 완전한 snapshot 객체
})
```
결과:
- store의 current snapshot을 payload로 교체
- HistoryManager의 `_paused` 플래그로 history append 차단

---

### SNAPSHOT_RESET
```js
store.dispatch({ type: 'SNAPSHOT_RESET' })
```
결과:
- `INITIAL_SNAPSHOT`으로 초기화

---

## Payload 공통 규칙

```
id        → UI에서 생성 (engine 내부 생성 금지)
createdAt → nowISO() — ISO8601 문자열
timestamp → 항상 payload로 주입 (Date.now() engine 내부 호출 금지)
```

---

## 금지 패턴

```js
// ❌ engine 직접 호출
import { reduce } from '../../engine/index.js';
reduce(snapshot, action);

// ❌ snapshot 직접 mutation
snapshot.data.todos.items.push(newTodo);

// ❌ store._snapshot 직접 접근
store._snapshot.data.todos.items;

// ⭕ 올바른 방식
store.dispatch({ type: 'TODO_ADD', payload });
const snap = store.getSnapshot();
```
