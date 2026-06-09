# 업무Portal v2 — Focus Contract

작성일: 2026-06-09
상태: 확정

---

## v1 교훈

포커스 관련 코드가 수십 곳에 분산 → Overlay 닫기 후 입력 불가, Morning Brief 후 입력 불가, 복원 후 입력 불가.

---

## 규칙

### 금지
```javascript
element.focus()                         // 직접 호출 금지
document.getElementById('memo').focus() // 직접 호출 금지
ipcRenderer.invoke('focus-webcontents') // 직접 호출 금지
overlay.style.display = 'none'          // 직접 닫기 금지 → activeElement = BODY 발생
overlay.classList.remove('active')      // 직접 닫기 금지
```

### Overlay 직접 닫기 금지 이유
```
confirm-modal-ok
   ↓
style.display = 'none'  ← 여기서 문제
   ↓
activeElement = BODY
   ↓
키보드 입력 불가
```
반드시 `OverlayManager.close(id)` 사용 → 내부에서 FocusManager.restore() 자동 처리.

### 허용
```javascript
FocusManager.restore()      // 포커스 복구 (Overlay 닫힌 후 등)
FocusManager.focusEditor()  // 메모 에디터 포커스
FocusManager.focusInput(id) // 특정 input 포커스 (id 기반)
```

---

## FocusManager 인터페이스

```javascript
// shared/focus-manager.js
export const FocusManager = {

  // Overlay/Modal 닫힌 후 항상 호출
  restore() {
    // 1. ipcRenderer.invoke('focus-webcontents')
    // 2. 50ms 후 _lastFocusTarget.focus()
  },

  // 메모 에디터로 포커스
  focusEditor() {
    this._lastFocusTarget = document.getElementById('memo-editor');
    this._lastFocusTarget?.focus();
  },

  // 특정 input으로 포커스
  focusInput(id) {
    this._lastFocusTarget = document.getElementById(id);
    this._lastFocusTarget?.focus();
  },

  // 내부용 — 직접 호출 금지
  _lastFocusTarget: null,
};
```

---

## 사용 패턴

```javascript
// Overlay 닫힐 때
OverlayManager.close('settings');  // OverlayManager 내부에서 FocusManager.restore() 자동 호출

// Modal 닫힐 때
ModalManager.confirm(...).then(() => {
  // ModalManager 내부에서 FocusManager.restore() 자동 호출
});
```

OverlayManager / ModalManager가 닫힐 때 FocusManager.restore() **자동 호출**.
호출하는 쪽에서 별도로 focus 처리 불필요.
