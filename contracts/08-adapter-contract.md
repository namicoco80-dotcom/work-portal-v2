# 업무Portal v2 — Adapter Contract

작성일: 2026-06-09
상태: 확정

---

## 역할

UI와 Store/Engine 사이의 접점 규칙.
UI가 Store에 접근하는 유일한 방법을 정의.

---

## 허용

```javascript
store.dispatch({ type, payload })   // 상태 변경
store.getSnapshot()                 // 상태 읽기
store.subscribe(cb)                 // 변경 구독
```

## 금지

```javascript
todoEngine(snapshot, action)        // Engine 직접 호출 금지
snapshot.data.todos.items.push(...) // Snapshot 직접 수정 금지
localStorage.setItem(...)           // Storage 직접 접근 금지
sqlite.query(...)                   // DB 직접 접근 금지
```

---

## Manager 사용 규칙

UI에서 포커스/모달/오버레이 처리는 반드시 Manager를 통해서만.

```javascript
// ✅ 허용
FocusManager.restore()
ModalManager.confirm({ title, message })
OverlayManager.close('settings')

// ❌ 금지
element.focus()
window.confirm(...)
overlay.style.display = 'none'
```

---

## Overlay 닫기 순서 (필수)

```
OverlayManager.close(id)
  ↓
overlay hide
  ↓
FocusManager.restore()   ← 반드시 호출
  ↓
cleanup (event detach, z-index 정리)
```

이 순서 어기면 activeElement = BODY → 키보드 입력 불가 재발.

---

## ESLint 강제

```json
{
  "rules": {
    "no-restricted-globals": [
      "error",
      { "name": "confirm", "message": "Use ModalManager.confirm()" },
      { "name": "alert",   "message": "Use ModalManager.alert()" },
      { "name": "prompt",  "message": "Use ModalManager.prompt()" }
    ]
  }
}
```
