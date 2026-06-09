# 업무Portal v2 — Snapshot Contract

작성일: 2026-06-09
상태: 확정

---

## 1. Snapshot 최상위 구조

```javascript
{
  snapshot_version: "2.0.0",   // Snapshot 스키마 버전
  engine_version:   "2.0.0",   // Engine 버전 (반드시 일치)
  created_at:       "ISO8601",
  updated_at:       "ISO8601",
  data: { ... }                // 실제 데이터
}
```

**규칙:**
- `snapshot_version !== engine_version` → `INVALID STATE` → 앱 시작 차단
- `updated_at`은 Store가 dispatch 후 자동 갱신

---

## 2. data 구조

```javascript
data: {
  settings:  { ... },
  memo:      { ... },
  todos:     { ... },
  calendar:  { ... },
  projects:  { ... },
  kpi:       { ... },
  handover:  { ... }
}
```

---

## 3. 각 도메인 초기값

### settings
```javascript
settings: {
  language: 'ko',
  theme:    'default'
}
```

### memo
```javascript
memo: {
  byDate: {}   // key: 'YYYY-MM-DD', value: { content, pinned }
}
```

### todos
```javascript
todos: {
  items:   [],
  filters: {},
  stats:   {}
}
```

### calendar
```javascript
calendar: {
  events: []
}
```

### projects
```javascript
projects: {
  items: []
}
```

### kpi
```javascript
kpi: {
  items: []
}
```

### handover
```javascript
handover: {
  reports: []
}
```

---

## 4. Immutable 규칙

```javascript
// ❌ 금지 — 직접 변경
snapshot.data.todos.items.push(todo);

// ✅ 허용 — 새 Snapshot 반환
return {
  ...snapshot,
  updated_at: new Date().toISOString(),
  data: {
    ...snapshot.data,
    todos: {
      ...snapshot.data.todos,
      items: [...snapshot.data.todos.items, todo]
    }
  }
};
```

Engine은 항상 **새 Snapshot 객체를 반환**. 기존 Snapshot 변경 금지.

---

## 5. 버전 호환 정책

| 방향 | 지원 여부 |
|------|-----------|
| v1 Backup → v2 Snapshot (Migration) | ✅ 지원 |
| v2 Snapshot → v1 Import | ❌ 미지원 |

---

## 6. Migration 구조

```
backup/
  migrate-v1.js    ← v1 JSON → v2 Snapshot 변환
  migrate-v2.js    ← v2 버전 간 마이그레이션 (향후)
  index.js         ← importBackup() 진입점
```

```javascript
// backup/index.js
export function importBackup(raw) {
  const version = detectVersion(raw);

  switch (version) {
    case 'v1':
      return migrateV1(raw);
    case 'v2':
      return validateSnapshot(raw);
    default:
      throw new Error('Unsupported backup version: ' + version);
  }
}
```

---

## 7. detectVersion 로직

```javascript
function detectVersion(raw) {
  if (raw.snapshot_version?.startsWith('2.')) return 'v2';
  if (raw.todos && Array.isArray(raw.todos))  return 'v1';
  throw new Error('Unknown backup format');
}
```

---

## 8. v1 → v2 Migration 매핑

| v1 필드 | v2 위치 |
|---------|---------|
| `todos[]` | `data.todos.items[]` |
| `calendar[]` | `data.calendar.events[]` |
| `memosByDate{}` | `data.memo.byDate{}` |
| `projects[]` | `data.projects.items[]` |
| `kpi[]` | `data.kpi.items[]` |

- v1에 없는 필드는 INITIAL_SNAPSHOT 기본값으로 채움
- Migration 실패 시 원본 raw 보존, 에러 리포트 출력

---

## 9. INITIAL_SNAPSHOT (전체)

```javascript
export const SNAPSHOT_VERSION = '2.0.0';
export const ENGINE_VERSION   = '2.0.0';

export const INITIAL_SNAPSHOT = {
  snapshot_version: SNAPSHOT_VERSION,
  engine_version:   ENGINE_VERSION,
  created_at:       new Date().toISOString(),
  updated_at:       new Date().toISOString(),
  data: {
    settings: {
      language: 'ko',
      theme:    'default'
    },
    memo: {
      byDate: {}
    },
    todos: {
      items:   [],
      filters: {},
      stats:   {}
    },
    calendar: {
      events: []
    },
    projects: {
      items: []
    },
    kpi: {
      items: []
    },
    handover: {
      reports: []
    }
  }
};
```

---

## 10. 다음 STEP

| Step | 파일 | 완료 조건 |
|------|------|-----------|
| STEP 1-B | `core/snapshot.js` | INITIAL_SNAPSHOT export |
| STEP 1-C | `core/store.js` | dispatch / getSnapshot / subscribe |
| STEP 1-D | `snapshot.test.js` / `store.test.js` | 전체 PASS |
| STEP 2 | `backup/migrate-v1.js` | v1 백업 10개 변환 PASS |
