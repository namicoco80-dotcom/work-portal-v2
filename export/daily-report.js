// export/daily-report.js
// 업무Portal v2 — Daily Report
//
// 역할:
//   DailyReport schema → HTML → window.print() (PDF 저장)
//   계산 금지 — export-builder 결과만 표현

import { buildDailyReport } from './export-builder.js';
import { store }            from '../core/store.js';

/* --- SECTION: HTML TEMPLATE --- */

function renderReportHTML(report) {
  const fmt = (arr, icon) =>
    arr.length
      ? arr.map(i => `<li>${icon} ${escHtml(i.text ?? i.title ?? '')}</li>`).join('')
      : `<li class="empty">없음</li>`;

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${report.date} 업무 기록</title>
  <style>
    /* --- VARIABLES --- */
    :root {
      --color-primary:  #2563eb;
      --color-done:     #16a34a;
      --color-pending:  #d97706;
      --color-border:   #e5e7eb;
      --color-bg:       #f9fafb;
      --font-main:      'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    }
    body   { font-family: var(--font-main); padding: 32px; color: #111; max-width: 720px; margin: auto; }
    h1     { font-size: 1.4rem; color: var(--color-primary); border-bottom: 2px solid var(--color-primary); padding-bottom: 8px; }
    h2     { font-size: 1rem; margin-top: 24px; color: #374151; }
    ul     { list-style: none; padding: 0; margin: 8px 0; }
    li     { padding: 4px 0; font-size: 0.95rem; border-bottom: 1px solid var(--color-border); }
    li.empty { color: #9ca3af; font-style: italic; }
    .done    { color: var(--color-done); }
    .pending { color: var(--color-pending); }
    .memo-box { background: var(--color-bg); border-left: 3px solid var(--color-primary);
                padding: 12px 16px; font-size: 0.95rem; white-space: pre-wrap; margin-top: 8px; }
    .meta  { font-size: 0.8rem; color: #6b7280; margin-top: 32px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>📋 ${report.date} 업무 기록</h1>

  <h2>📅 일정</h2>
  <ul>${fmt(report.events, '🕐')}</ul>

  <h2>✅ 완료 항목</h2>
  <ul class="done">${fmt(report.completedTodos, '✓')}</ul>

  <h2>⏳ 미완료 항목</h2>
  <ul class="pending">${fmt(report.pendingTodos, '○')}</ul>

  <h2>📝 메모</h2>
  <div class="memo-box">${report.memo ? escHtml(report.memo) : '<span style="color:#9ca3af">없음</span>'}</div>

  <p class="meta">생성: ${report.exportedAt} · 업무Portal v${report.export_version}</p>
</body>
</html>`;
}

/* --- SECTION: EXPORT --- */

/**
 * 오늘 날짜 Daily Report를 새 창에서 print dialog로 출력
 * @param {string} date - 'YYYY-MM-DD'
 */
export function printDailyReport(date) {
  const snapshot = store.getSnapshot();   // Export Layer 내부에서 직접 조회
  const report   = buildDailyReport({ snapshot, date });
  const html   = renderReportHTML(report);

  const win = window.open('', '_blank');
  if (!win) {
    console.error('[DailyReport] popup blocked');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

/**
 * Daily Report JSON 반환 (테스트 / Export 패키지 연동용)
 */
export function getDailyReportData(date) {
  const snapshot = store.getSnapshot();
  return buildDailyReport({ snapshot, date });
}
