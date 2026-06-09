# 업무Portal v2 — Modal Contract

작성일: 2026-06-09
상태: 확정

---

## v1 교훈

`confirm()` 브라우저 기본 다이얼로그 → Electron 포커스 손실 → 메모 입력 불가.
15개 잔여 교체 작업이 RC1까지 이어짐.

---

## 규칙

### 영구 금지
```javascript
window.confirm(...)   // 금지
window.alert(...)     // 금지
window.prompt(...)    // 금지
```

### 허용
```javascript
ModalManager.confirm(options)  // 확인/취소
ModalManager.alert(options)    // 확인만
ModalManager.prompt(options)   // 입력
```

---

## ModalManager 인터페이스

```javascript
// shared/modal-manager.js
export const ModalManager = {

  // Promise 반환 — true: 확인, false: 취소
  confirm({ title, message, confirmText = '확인', cancelText = '취소' }) {
    return new Promise((resolve) => {
      // 모달 표시
      // 확인 클릭 → resolve(true) → FocusManager.restore()
      // 취소 클릭 → resolve(false) → FocusManager.restore()
    });
  },

  alert({ title, message, confirmText = '확인' }) {
    return new Promise((resolve) => {
      // 확인 클릭 → resolve() → FocusManager.restore()
    });
  },

  prompt({ title, message, placeholder = '' }) {
    return new Promise((resolve) => {
      // 확인 클릭 → resolve(inputValue) → FocusManager.restore()
      // 취소 클릭 → resolve(null) → FocusManager.restore()
    });
  },
};
```

---

## ESLint 강제 (빌드 차단)

```json
// .eslintrc
{
  "rules": {
    "no-restricted-globals": [
      "error",
      { "name": "confirm", "message": "Use ModalManager.confirm() instead." },
      { "name": "alert",   "message": "Use ModalManager.alert() instead." },
      { "name": "prompt",  "message": "Use ModalManager.prompt() instead." }
    ]
  }
}
```

`confirm()` 1개라도 발견 시 빌드 실패. v1처럼 15개 숨어있는 상황 구조적 차단.

---

```javascript
// v1 방식 (금지)
if (confirm('삭제할까요?')) { deleteTodo(id); }

// v2 방식
const ok = await ModalManager.confirm({
  title:   '할일 삭제',
  message: '정말 삭제할까요?'
});
if (ok) store.dispatch({ type: 'TODO_DELETE', payload: { id } });
```

---

## 포커스 복구

Modal 닫힐 때 ModalManager 내부에서 `FocusManager.restore()` 자동 호출.
호출하는 쪽 별도 처리 불필요.
