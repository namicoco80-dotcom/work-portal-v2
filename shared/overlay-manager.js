// shared/overlay-manager.js
// 업무Portal v2 — OverlayManager
//
// 규칙: overlay.style.display = 'none' 직접 호출 금지
//       반드시 OverlayManager.close(id) 사용
//
// close() 순서:
//   1. overlay hide
//   2. FocusManager.restore()   ← 필수
//   3. cleanup

import { FocusManager } from './focus-manager.js';

const _registry = new Map(); // id → element

export const OverlayManager = {

  /**
   * Overlay 등록 (앱 초기화 시 호출)
   */
  register(id, element) {
    _registry.set(id, element);
  },

  /**
   * Overlay 열기
   */
  open(id) {
    const el = _registry.get(id);
    if (!el) {
      console.warn('[OverlayManager] open: 등록되지 않은 id:', id);
      return;
    }
    el.classList.add('overlay-visible');
    el.removeAttribute('aria-hidden');
  },

  /**
   * Overlay 닫기
   * 순서: hide → FocusManager.restore() → cleanup
   */
  close(id) {
    const el = _registry.get(id);
    if (!el) {
      console.warn('[OverlayManager] close: 등록되지 않은 id:', id);
      return;
    }

    // 1. hide
    el.classList.remove('overlay-visible');
    el.setAttribute('aria-hidden', 'true');

    // 2. 포커스 복구 — 반드시 here
    FocusManager.restore();

    // 3. cleanup
    this._cleanup(el);
  },

  /**
   * 현재 열려있는지 확인
   */
  isOpen(id) {
    const el = _registry.get(id);
    return el ? el.classList.contains('overlay-visible') : false;
  },

  /**
   * 내부 cleanup
   */
  _cleanup(el) {
    // 향후: 이벤트 detach, z-index 정리 등
    el.style.zIndex = '';
  },
};
