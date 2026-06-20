// export/timeline-export.js
// 업무Portal v2 — Timeline Export
//
// 역할:
//   AuditExport → JSON 파일 저장
//   Electron IPC(dialog:save) 또는 브라우저 download 방식 지원

import { buildAuditExport } from './export-builder.js';
import { getTimeline }      from '../audit/audit-store.js';
import { store }            from '../core/store.js';

/* --- SECTION: EXPORT TO FILE --- */

/**
 * Audit Timeline을 JSON 파일로 저장
 * @param {string} [filename]
 */
export async function exportTimelineJSON(filename) {
  const snapshot = store.getSnapshot();   // Export Layer 내부에서 직접 조회
  const timeline = getTimeline();
  const exportData = buildAuditExport({ snapshot, timeline });
  const json       = JSON.stringify(exportData, null, 2);
  const name       = filename ?? `audit-${exportData.exportedAt.slice(0, 10)}.json`;

  // Electron: IPC 경유 파일 저장
  if (window.electronAPI?.saveFile) {
    await window.electronAPI.saveFile({ name, content: json, type: 'application/json' });
    return;
  }

  // fallback: 브라우저 download
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
