// shared/focus-manager.js
// 업무Portal v2 — FocusManager
//
// 규칙: 앱 전체에서 element.focus() 직접 호출 금지
//       반드시 이 모듈만 사용

export const FocusManager = {

  _lastTarget: null,

  /**
   * Overlay/Modal 닫힌 후 포커스 복구
   * Electron webContents 포커스 → 50ms 후 lastTarget 복구
   */
  restore() {
    // Electron 환경
    if (window.electronAPI?.focusWebContents) {
      window.electronAPI.focusWebContents().then(() => {
        setTimeout(() => this._refocus(), 50);
      });
    } else {
      // 브라우저/테스트 환경
      setTimeout(() => this._refocus(), 50);
    }
  },

  /**
   * 메모 에디터로 포커스
   */
  focusEditor() {
    const el = document.getElementById('memo-editor');
    if (el) {
      this._lastTarget = el;
      el.focus();
    }
  },

  /**
   * 캘린더 영역으로 포커스
   */
  focusCalendar() {
    const el = document.getElementById('calendar-panel');
    if (el) {
      this._lastTarget = el;
      el.focus();
    }
  },

  /**
   * ID 기반 포커스
   */
  focusById(id) {
    const el = document.getElementById(id);
    if (el) {
      this._lastTarget = el;
      el.focus();
    }
  },

  /**
   * 내부용 — 마지막 타겟으로 복귀
   */
  _refocus() {
    if (this._lastTarget && typeof this._lastTarget.focus === 'function') {
      this._lastTarget.focus();
    }
  },
};
