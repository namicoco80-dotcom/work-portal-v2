// export/export-builder.js
// 업무Portal v2 — Export Builder
//
// 규칙:
//   조립만 — 계산/판단/상태변경 금지
//   입력: snapshot + timeline
//   출력: export-schema.js가 정의한 구조

import { createDailyReportSchema, createAuditExportSchema } from './export-schema.js';

/* --- SECTION: INPUT CONTRACT --- */

/**
 * @typedef {object} ExportInput
 * @property {object} snapshot   - store.getSnapshot()
 * @property {Array}  timeline   - auditStore.getTimeline()
 * @property {string} date       - 'YYYY-MM-DD' (daily report 대상일)
 */

/* --- SECTION: BUILDERS --- */

/**
 * Daily Report 생성
 * @param {ExportInput} input
 * @returns {object} DailyReport schema
 */
export function buildDailyReport({ snapshot, date }) {
  if (!snapshot) throw new Error('[ExportBuilder] snapshot required');
  if (!date)     throw new Error('[ExportBuilder] date required');
  return createDailyReportSchema(date, snapshot);
}

/**
 * Audit Timeline JSON 생성
 * @param {ExportInput} input
 * @returns {object} AuditExport schema
 */
export function buildAuditExport({ snapshot, timeline }) {
  if (!snapshot) throw new Error('[ExportBuilder] snapshot required');
  return createAuditExportSchema(snapshot, timeline ?? []);
}

/**
 * 전체 Export 패키지 (C안 — PDF + JSON)
 * @param {ExportInput} input
 * @returns {{ dailyReport: object, auditExport: object }}
 */
export function buildExportPackage({ snapshot, timeline, date }) {
  return Object.freeze({
    dailyReport: buildDailyReport({ snapshot, date }),
    auditExport: buildAuditExport({ snapshot, timeline }),
  });
}
