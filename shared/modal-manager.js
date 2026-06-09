// shared/modal-manager.js
// 업무Portal v2 — ModalManager
//
// 규칙: window.confirm / alert / prompt 사용 금지 (ESLint 빌드 차단)
//       반드시 이 모듈만 사용
//
// 닫기 후 FocusManager.restore() 자동 호출

import { FocusManager } from './focus-manager.js';

export const ModalManager = {

  /**
   * 확인/취소 모달
   * @returns {Promise<boolean>} true: 확인, false: 취소
   */
  confirm({ title = '', message = '', confirmText = '확인', cancelText = '취소' } = {}) {
    return new Promise((resolve) => {
      const modal = _buildModal({ title, message, confirmText, cancelText, type: 'confirm' });
      document.body.appendChild(modal);

      modal.querySelector('.modal-confirm').addEventListener('click', () => {
        _removeModal(modal);
        FocusManager.restore();
        resolve(true);
      });
      modal.querySelector('.modal-cancel').addEventListener('click', () => {
        _removeModal(modal);
        FocusManager.restore();
        resolve(false);
      });
    });
  },

  /**
   * 알림 모달 (확인만)
   * @returns {Promise<void>}
   */
  alert({ title = '', message = '', confirmText = '확인' } = {}) {
    return new Promise((resolve) => {
      const modal = _buildModal({ title, message, confirmText, type: 'alert' });
      document.body.appendChild(modal);

      modal.querySelector('.modal-confirm').addEventListener('click', () => {
        _removeModal(modal);
        FocusManager.restore();
        resolve();
      });
    });
  },

  /**
   * 입력 모달
   * @returns {Promise<string|null>} 입력값 또는 null(취소)
   */
  prompt({ title = '', message = '', placeholder = '', cancelText = '취소', confirmText = '확인' } = {}) {
    return new Promise((resolve) => {
      const modal = _buildModal({ title, message, confirmText, cancelText, placeholder, type: 'prompt' });
      document.body.appendChild(modal);

      modal.querySelector('.modal-confirm').addEventListener('click', () => {
        const val = modal.querySelector('.modal-input')?.value ?? '';
        _removeModal(modal);
        FocusManager.restore();
        resolve(val);
      });
      modal.querySelector('.modal-cancel').addEventListener('click', () => {
        _removeModal(modal);
        FocusManager.restore();
        resolve(null);
      });
    });
  },
};

// ── 내부 헬퍼 ─────────────────────────────────────────

function _buildModal({ title, message, confirmText, cancelText, placeholder, type }) {
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="modal-box">
      ${title   ? `<div class="modal-title">${_esc(title)}</div>` : ''}
      ${message ? `<div class="modal-message">${_esc(message)}</div>` : ''}
      ${type === 'prompt'
        ? `<input class="modal-input" type="text" placeholder="${_esc(placeholder || '')}" />`
        : ''}
      <div class="modal-actions">
        <button class="modal-confirm">${_esc(confirmText)}</button>
        ${type !== 'alert'
          ? `<button class="modal-cancel">${_esc(cancelText)}</button>`
          : ''}
      </div>
    </div>
  `;
  return el;
}

function _removeModal(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
