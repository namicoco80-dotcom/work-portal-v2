// tests/overlay-manager.dom.test.js
// 업무Portal v2 — OverlayManager DOM Binding Tests
//
// 검증 대상:
//   register(id, el)    → registry 등록
//   open(id)            → overlay-visible 클래스 추가, aria-hidden 제거
//   close(id)           → overlay-visible 클래스 제거, aria-hidden=true
//   isOpen(id)          → overlay-visible 유무 반환
//   unregistered id     → 에러 없이 경고만
//   close → FocusManager.restore() 호출 확인
//
// 금지: z-index 수치 계산, layout, animation

import { createDOM, makeAssert } from './jsdom-setup.js';

const { window, document } = createDOM();
global.window   = window;
global.document = document;

const { FocusManager }   = await import('../shared/focus-manager.js');
const { OverlayManager } = await import('../shared/overlay-manager.js');

const { assert, summary } = makeAssert();

// ── 헬퍼: overlay element 생성 ────────────────────────
function makeOverlay(id) {
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

// ── 테스트 ─────────────────────────────────────────────

console.log('\n[OverlayManager DOM]');

// 준비: memo-editor (restore 복귀 대상)
const editor = document.createElement('textarea');
editor.id = 'memo-editor';
editor.setAttribute('tabindex', '0');
document.body.appendChild(editor);
FocusManager.focusEditor();

// 1. register + open
const settingsEl = makeOverlay('settings-overlay');
OverlayManager.register('settings-overlay', settingsEl);
assert(!settingsEl.classList.contains('overlay-visible'), 'register 후 closed 상태');

OverlayManager.open('settings-overlay');
assert(settingsEl.classList.contains('overlay-visible'),  'open → overlay-visible 추가');
assert(!settingsEl.hasAttribute('aria-hidden') || settingsEl.getAttribute('aria-hidden') !== 'true',
  'open → aria-hidden 제거');

// 2. isOpen
assert(OverlayManager.isOpen('settings-overlay') === true,  'isOpen → true');

// 3. close
OverlayManager.close('settings-overlay');
assert(!settingsEl.classList.contains('overlay-visible'),    'close → overlay-visible 제거');
assert(settingsEl.getAttribute('aria-hidden') === 'true',    'close → aria-hidden=true');
assert(OverlayManager.isOpen('settings-overlay') === false,  'isOpen → false');

// 4. close → FocusManager.restore() 확인
//    restore 후 50ms 뒤 _lastTarget(editor)으로 복귀
const other = document.createElement('input');
other.setAttribute('tabindex', '0');
document.body.appendChild(other);
other.focus();
assert(document.activeElement === other, 'close 전: activeElement = other');

const calEl = makeOverlay('calendar-overlay');
OverlayManager.register('calendar-overlay', calEl);
OverlayManager.open('calendar-overlay');
OverlayManager.close('calendar-overlay');
await new Promise(r => setTimeout(r, 80));
assert(document.activeElement === editor, 'close 후 restore → activeElement = editor');

// 5. 중복 open — 두 번 열어도 클래스 중복 없음
const dupEl = makeOverlay('dup-overlay');
OverlayManager.register('dup-overlay', dupEl);
OverlayManager.open('dup-overlay');
OverlayManager.open('dup-overlay');
const classes = [...dupEl.classList].filter(c => c === 'overlay-visible');
assert(classes.length === 1, '중복 open → overlay-visible 1개만');

// 6. 미등록 id → 에러 없이 경고만
let threw = false;
try { OverlayManager.open('never-registered'); }
catch(e) { threw = true; }
assert(!threw, '미등록 id open → 에러 없음');

try { OverlayManager.close('never-registered'); }
catch(e) { threw = true; }
assert(!threw, '미등록 id close → 에러 없음');

// 7. isOpen — 미등록 id → false
assert(OverlayManager.isOpen('never-registered') === false, '미등록 id isOpen → false');

summary('OverlayManager DOM');
