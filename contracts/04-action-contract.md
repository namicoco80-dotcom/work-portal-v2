# 업무Portal v2 — Action Contract

작성일: 2026-06-09
상태: 확정

---

## 규칙

- UI는 Action 발생만 가능. Snapshot 직접 변경 금지.
- Action은 반드시 `{ type, payload }` 형태.
- type은 이 문서에 정의된 것만 허용.

---

## Todo

| type | payload |
|------|---------|
| `TODO_ADD` | `{ id, title, priority, dueDate, projectId }` |
| `TODO_UPDATE` | `{ id, changes: {...} }` |
| `TODO_DELETE` | `{ id }` |
| `TODO_COMPLETE` | `{ id }` |
| `TODO_CLEAR_DONE` | `{}` |

## Memo

| type | payload |
|------|---------|
| `MEMO_UPDATE` | `{ date, content }` |
| `MEMO_PIN` | `{ date, pinned }` |

## Calendar

| type | payload |
|------|---------|
| `EVENT_ADD` | `{ id, title, date, time, color }` |
| `EVENT_UPDATE` | `{ id, changes: {...} }` |
| `EVENT_DELETE` | `{ id }` |

## Project

| type | payload |
|------|---------|
| `PROJECT_ADD` | `{ id, title, type }` |
| `PROJECT_UPDATE` | `{ id, changes: {...} }` |
| `PROJECT_DELETE` | `{ id }` |
| `PROJECT_LOG_ADD` | `{ projectId, log }` |

## KPI

| type | payload |
|------|---------|
| `KPI_ADD` | `{ id, title, target }` |
| `KPI_UPDATE` | `{ id, changes: {...} }` |
| `KPI_DELETE` | `{ id }` |

## Settings

| type | payload |
|------|---------|
| `SETTINGS_UPDATE` | `{ changes: {...} }` |

## System

| type | payload |
|------|---------|
| `SNAPSHOT_RESTORE` | `{ snapshot }` |
| `SNAPSHOT_RESET` | `{}` |
