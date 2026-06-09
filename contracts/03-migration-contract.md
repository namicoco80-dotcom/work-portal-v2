# 업무Portal v2 — Migration Contract

작성일: 2026-06-09
상태: 확정

---

## 버전 구조

```javascript
{
  snapshot_version: "2.0.0",
  engine_version:   "2.0.0",
  report_version:   "2.0.0",   // ← 추가
  created_at:       "ISO8601",
  updated_at:       "ISO8601",
  data: { ... }
}
```

**규칙:** `engine_version !== report_version` → `INVALID STATE` → 리포트 생성 차단.

---

| 방향 | 지원 |
|------|------|
| v1 Backup JSON → v2 Snapshot | ✅ |
| v2 Snapshot → v1 Import | ❌ |

---

## 파일 구조

```
backup/
  index.js         ← importBackup() 진입점
  migrate-v1.js    ← v1 → v2 변환
  migrate-v2.js    ← v2 버전 간 변환 (향후)
  validate.js      ← Snapshot 유효성 검사
```

---

## importBackup 인터페이스

```javascript
// backup/index.js
export function importBackup(raw) {
  const version = detectVersion(raw);
  switch (version) {
    case 'v1': return migrateV1(raw);
    case 'v2': return validateSnapshot(raw);
    default:   throw new Error('Unsupported backup version: ' + version);
  }
}

function detectVersion(raw) {
  if (raw.snapshot_version?.startsWith('2.')) return 'v2';
  if (raw.todos && Array.isArray(raw.todos))  return 'v1';
  throw new Error('Unknown backup format');
}
```

---

## v1 → v2 필드 매핑

| v1 필드 | v2 위치 | 비고 |
|---------|---------|------|
| `todos[]` | `data.todos.items[]` | |
| `calendar[]` | `data.calendar.events[]` | |
| `memosByDate{}` | `data.memo.byDate{}` | |
| `memo` (단일) | `data.memo.byDate['today']` | 구버전 단일 메모 |
| `projects[]` | `data.projects.items[]` | |
| `kpi[]` | `data.kpi.items[]` | 없으면 `[]` |
| `settings{}` | `data.settings` | 없으면 기본값 |

v1에 없는 필드 → `INITIAL_SNAPSHOT` 기본값으로 채움.

---

## migrateV1 인터페이스

```javascript
// backup/migrate-v1.js
export function migrateV1(raw) {
  return {
    snapshot_version: '2.0.0',
    engine_version:   '2.0.0',
    created_at:       raw.created_at || new Date().toISOString(),
    updated_at:       new Date().toISOString(),
    data: {
      settings:  raw.settings  || INITIAL_SNAPSHOT.data.settings,
      memo:      { byDate: raw.memosByDate || {} },
      todos:     { items: raw.todos || [], filters: {}, stats: {} },
      calendar:  { events: raw.calendar || [] },
      projects:  { items: raw.projects || [] },
      kpi:       { items: raw.kpi || [] },
      handover:  { reports: [] },
    }
  };
}
```

---

## 테스트 기준

- 실제 v1 백업 파일 10개 이상 migration 통과
- 변환 후 `validateSnapshot()` PASS
- 원본 raw 데이터 보존 (migration 실패 시 롤백 가능)

---

## 에러 처리

```javascript
try {
  const snapshot = importBackup(raw);
  store.dispatch({ type: 'SNAPSHOT_RESTORE', payload: { snapshot } });
} catch (e) {
  ModalManager.alert({
    title:   '백업 복원 실패',
    message: '지원하지 않는 백업 형식입니다.\n원본 파일을 보존합니다.'
  });
  // raw 파일 그대로 유지, 앱 상태 변경 없음
}
```
