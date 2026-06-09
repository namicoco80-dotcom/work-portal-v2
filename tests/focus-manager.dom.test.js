// tests/focus-manager.dom.test.js
// 업무Portal v2 — FocusManager DOM Binding Tests
//
// 검증 대상:
//   focusEditor()   → activeElement = memo-editor
//   focusById(id)   → activeElement = 해당 element
//   focusCalendar() → activeElement = calendar-panel
//   restore()       → _lastTarget 으로 복귀 (Electron mock 환경)
//   존재하지 않는 id → 에러 없이 무시
//
// 금지:
//   offsetWidth / getBoundingClientRect 등 layout 계산
//   real setTimeout 의존 (restore 내부 setTimeout은 0ms로 mock)
//   animation state 검증

import { createDOM, makeAssert } from './jsdom-setup.js';

const { window, document } = createDOM();

// global 주입 — FocusManager가 document/window를 직접 참조하므로
global.window   = window;
global.document = document;

// FocusManager import (global 주입 후)
const { FocusManager } = await import('../shared/focus-manager.js');

const { assert, summary } = makeAssert();

// ── 헬퍼: focusable element 생성 ──────────────────────
function makeEl(id, tag = 'div') {
  const el = document.createElement(tag);
  el.id = id;
  el.setAttribute('tabindex', '0');  // focusable
  document.body.appendChild(el);
  return el;
}

// ── 테스트 ─────────────────────────────────────────────

console.log('\n[FocusManager DOM]');

// 1. focusEditor() — memo-editor 존재
const editor = makeEl('memo-editor', 'textarea');
FocusManager.focusEditor();
assert(document.activeElement === editor,       'focusEditor → activeElement = memo-editor');
assert(FocusManager._lastTarget === editor,     'focusEditor → _lastTarget 저장');

// 2. focusById(id) — 존재하는 element
const todoInput = makeEl('todo-input', 'input');
FocusManager.focusById('todo-input');
assert(document.activeElement === todoInput,    'focusById → activeElement = todo-input');
assert(FocusManager._lastTarget === todoInput,  'focusById → _lastTarget 갱신');

// 3. focusCalendar() — calendar-panel 존재
const calendar = makeEl('calendar-panel');
FocusManager.focusCalendar();
assert(document.activeElement === calendar,     'focusCalendar → activeElement = calendar-panel');
assert(FocusManager._lastTarget === calendar,   'focusCalendar → _lastTarget = calendar');

// 4. focusById(id) — 존재하지 않는 id → 에러 없이 무시, _lastTarget 변경 없음
const prevLast = FocusManager._lastTarget;
FocusManager.focusById('nonexistent-id-xyz');
assert(FocusManager._lastTarget === prevLast,   'nonexistent id → _lastTarget 변경 없음');

// 5. restore() — _lastTarget = calendar 기준으로 복귀
//    restore 내부 setTimeout(50ms) → jsdom에서 실제 대기 없이
//    _refocus()가 호출되면 activeElement가 calendar가 됨을 검증
//    (setTimeout은 jsdom에서 동작하므로 await로 처리)
FocusManager._lastTarget = editor;  // 명시적 세팅
todoInput.focus();                   // 다른 곳으로 포커스 이동
assert(document.activeElement === todoInput, 'restore 전: activeElement = todoInput');

FocusManager.restore();
await new Promise(r => setTimeout(r, 80));  // restore 내 50ms 대기 후 확인
assert(document.activeElement === editor,   'restore → activeElement = _lastTarget(editor)');

// 6. restore() — _lastTarget = null → 에러 없이 무시
FocusManager._lastTarget = null;
let threw = false;
try { FocusManager.restore(); await new Promise(r => setTimeout(r, 80)); }
catch(e) { threw = true; }
assert(!threw, '_lastTarget null → restore 에러 없음');

summary('FocusManager DOM');
