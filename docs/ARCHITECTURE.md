# 업무Portal v2 — Architecture Document
# v1.0 기준선 (2026-06-13)

이 문서는 v1.0-rc1 시점의 아키텍처를 고정합니다.
이후 모든 확장은 이 문서를 기준으로 판단합니다.

---

## 1. Core Flow

```
User Input
    ↓
Command (Action)
    ↓
store.dispatch({ type, payload })
    ↓
Engine (pure function)
    ↓
Snapshot (immutable)
    ↓
Store (pointer 교체)
    ↓
Derived Layer
  ├─ HistoryManager  (snapshot timeline)
  ├─ SearchManager   (index rebuild)
  └─ Repository      (SQLite persist)
    ↓
UI (subscribe → render)
```

단방향. 역방향 없음.

---

## 2. Layer 정의

### Engine
- 역할: `(snapshot, action) → newSnapshot`
- 순수 함수. 부작용 없음
- DB 접근 금지 / DOM 접근 금지 / IPC 호출 금지
- `Date.now()` / `Math.random()` 직접 호출 금지 (payload로 주입)
- 파일: `engine/index.js`, `engine/todo-engine.js`, `engine/calendar-engine.js`, `engine/memo-engine.js`

### Snapshot
- 역할: 앱 전체 상태의 단일 진실 (Single Source of Truth)
- `Object.freeze()` 적용 (shallow — 중첩 mutation은 engine 규칙으로 방지)
- 버전 필드: `engine_version`, `snapshot_version`, `report_version`
- 파일: `core/snapshot.js`

### Store
- 역할: 현재 snapshot pointer 관리 + subscriber 호출
- `dispatch(action)` → engine → snapshot 교체
- 저장 책임 없음 / UI 직접 접근 금지
- 파일: `core/store.js`

### HistoryManager
- 역할: snapshot timeline (Undo/Redo)
- Engine 밖, Store 밖, UI 밖
- 각 entry = deep clone (reference 오염 방지)
- `_paused` 플래그로 SNAPSHOT_RESTORE 중 append 차단
- MAX 50개 유지
- 파일: `shared/history-manager.js`

### SearchManager
- 역할: Snapshot → flat index → query result
- Derived data — source of truth 아님
- `Snapshot 변경 → build()` 방향만 허용 (역방향 금지)
- 결과는 projection (원본 오염 불가)
- 파일: `shared/search-manager.js`

### Repository
- 역할: snapshot ↔ SQLite 유일한 persistence 담당
- Engine / Store / UI는 DB 접근 금지
- SOFT READ: version mismatch 시 throw 금지, 경고 후 로드
- WAL 모드 적용
- 파일: `app/src/main/repository.js`

### UI (Renderer)
- 역할: snapshot을 read-only로 표시, dispatch만 호출
- `store.dispatch()` / `store.getSnapshot()` 만 허용
- `engine` 직접 import 금지
- `localStorage` 직접 접근 금지
- `element.focus()` 직접 호출 금지 → FocusManager 사용
- `window.confirm/alert/prompt` 금지 → ModalManager 사용
- 파일: `app/src/renderer/app.js`

---

## 3. Domain Sync 규칙 (Calendar ↔ Todo)

```
Todo (parent entity)
  └─ linkedEventId → CalendarEvent.id

CalendarEvent
  └─ todoId → Todo.id (역참조)
```

| Action | 결과 |
|---|---|
| `TODO_ADD` + dueDate + eventId | linked CalendarEvent 자동 생성 |
| `TODO_COMPLETE` | linked event color → `'green'` |
| `TODO_DELETE` | linked event cascade 삭제 |
| `TODO_CLEAR_DONE` | 완료 todo + linked event 동시 삭제 |
| `EVENT_DELETE` | todo 유지, `linkedEventId = null` |

**Calendar는 Todo의 view 계층.** Calendar 조작이 Todo를 삭제하지 않음.

---

## 4. Immutable Rules

이 규칙들은 변경 불가. 위반 시 CI 빌드 차단.

```
# 엔진 순수성
engine/내부 → DOM 접근 금지
engine/내부 → Date.now() 직접 금지
engine/내부 → require() 금지 (ESM only)

# UI 어댑터 계약
UI → engine 직접 import 금지
UI → snapshot 직접 mutation 금지
UI → localStorage 직접 접근 금지
UI → element.focus() 직접 호출 금지 (FocusManager 경유)
UI → window.confirm/alert/prompt 금지 (ModalManager 경유)
UI → overlay.style.display 직접 조작 금지 (OverlayManager 경유)

# History 불변성
HistoryManager entries → deep clone 필수
undo/redo restore → deep clone 후 SNAPSHOT_RESTORE
```

---

## 5. Extension Rules

새 기능 추가 시 지켜야 할 규칙.

### 새 Engine Action 추가
1. `engine/` 파일에 pure function으로 추가
2. `engine/index.js` 라우팅 테이블에 등록
3. 테스트 작성 (determinism 포함)
4. `VERSION` engine_version 증가
5. 새 git tag

### 새 Derived Layer 추가
- Engine 밖에 독립 모듈로 작성
- `store.subscribe()` 또는 직접 `build(snapshot)` 호출
- Snapshot → Layer 방향만 허용

### 새 IPC 채널 추가
- `app/src/main/main.js`에 `ipcMain.handle()` 추가
- `app/src/renderer/preload.cjs`에 `contextBridge` 노출
- UI에서 `window.electronAPI.xxx()` 형태로만 사용

---

## 6. Forbidden Coupling

절대 금지 패턴.

```
❌ Engine → DB
❌ Engine → UI (DOM)
❌ Store → DB
❌ UI → Engine 직접 import
❌ SearchManager → Snapshot 수정
❌ HistoryManager → Engine 호출
❌ Repository → UI 이벤트 발생
❌ Renderer → require('fs') / require('path')
```

---

## 7. Version 정책

```
VERSION 파일:
  engine_version    = x.y.z  (engine 로직 변경 시 증가)
  snapshot_version  = x.y.z  (snapshot 구조 변경 시 증가)
  report_version    = x.y.z  (engine_version과 항상 동기)

불변 규칙:
  engine_version == report_version
  git tag는 재사용/재지정 금지
  VERSION 변경 없이 engine/ 수정 금지
```

---

## 8. Test Gate 현황 (v1.0-rc1)

| Gate | 내용 | PASS |
|---|---|---|
| 1 | store / migration / manager-models | 60 |
| 2 | jsdom DOM (focus / overlay / modal) | 42 |
| 3 | Contract Gate (금지 패턴) | — |
| 4 | Determinism Gate | 8 |
| 5 | Version Lock Gate | 9 |
| 6 | Calendar↔Todo Sync | 20 |
| 7 | Persistence Layer | 13 |
| 8 | Recovery Test | 17 |
| 9 | HistoryManager | 37 |
| 10 | SearchManager | 27 |
| **합계** | **14 gates** | **233** |

---

## 9. File Map

```
work-portal-v2/
├─ contracts/          규칙 문서 (00~08)
├─ core/
│   ├─ snapshot.js     Snapshot 정의 + INITIAL_SNAPSHOT
│   └─ store.js        Store (dispatch + subscribe)
├─ engine/
│   ├─ index.js        라우팅 테이블
│   ├─ todo-engine.js  Todo + Calendar sync
│   ├─ calendar-engine.js
│   └─ memo-engine.js
├─ shared/
│   ├─ focus-manager.js
│   ├─ overlay-manager.js
│   ├─ modal-manager.js
│   ├─ manager-models.js
│   ├─ history-manager.js
│   └─ search-manager.js
├─ tests/              14 gate 테스트
├─ baseline/           baseline.v0.1.json
├─ deploy/             Cloudflare Pages UI
├─ app/
│   ├─ src/main/
│   │   ├─ main.js     Electron main
│   │   └─ repository.js  SQLite persistence
│   ├─ src/renderer/
│   │   ├─ preload.cjs  Context Bridge (CJS)
│   │   ├─ index.html
│   │   └─ app.js      UI (4 views)
│   ├─ package.json
│   └─ RUNBOOK.md
└─ VERSION
```
