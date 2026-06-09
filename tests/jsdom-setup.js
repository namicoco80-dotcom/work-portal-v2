// tests/jsdom-setup.js
// 업무Portal v2 — jsdom 환경 초기화
//
// 원칙:
//   DOM state only — layout 계산 금지 (offsetWidth 등)
//   animation / timing dependency 금지 (real setTimeout 사용 최소화)
//   real event loop dependency 금지
//   pure DOM state transition 검증만

import { JSDOM } from 'jsdom';

/**
 * 깨끗한 jsdom 환경 생성
 * 각 테스트 파일 최상단에서 호출
 */
export function createDOM() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: false,  // layout engine 비활성화
  });

  const { window } = dom;
  const { document } = window;

  // Electron API mock — 테스트 환경에서 focusWebContents 즉시 resolve
  window.electronAPI = {
    focusWebContents: () => Promise.resolve(),
  };

  return { dom, window, document };
}

/**
 * 테스트 assert 헬퍼
 */
export function makeAssert() {
  let passed = 0, failed = 0;

  function assert(condition, msg) {
    if (condition) { console.log('  ✅', msg); passed++; }
    else           { console.error('  ❌', msg); failed++; }
  }

  function summary(suiteName) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`[${suiteName}] ${passed} PASS / ${failed} FAIL`);
    if (failed > 0) process.exitCode = 1;
    return { passed, failed };
  }

  return { assert, summary };
}
