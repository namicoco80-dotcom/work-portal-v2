// scripts/version-check.js
// 업무Portal v2 — Version Lock Gate

import { readFileSync } from 'fs';

function parseVersion(filePath) {
  const result = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    result[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return result;
}

function isSemver(v) { return /^\d+\.\d+\.\d+$/.test(v); }

let passed = 0, failed = 0;
function check(condition, msg) {
  if (condition) { console.log('  ✅', msg); passed++; }
  else           { console.error('  ❌', msg); failed++; }
}

console.log('\n[Version Lock Gate]');

const v = parseVersion('VERSION');

check(!!v.engine_version,   'engine_version 존재');
check(!!v.report_version,   'report_version 존재');
check(!!v.snapshot_version, 'snapshot_version 존재');
check(!!v.git_tag,          `git_tag 존재: ${v.git_tag}`);
check(v.engine_version === v.report_version,
  `engine_version(${v.engine_version}) == report_version(${v.report_version})`);
check(isSemver(v.engine_version),   `engine_version semver: ${v.engine_version}`);
check(isSemver(v.report_version),   `report_version semver: ${v.report_version}`);
check(isSemver(v.snapshot_version), `snapshot_version semver: ${v.snapshot_version}`);

try {
  const bl = JSON.parse(readFileSync('baseline/baseline.v0.1.json', 'utf8'));
  if (bl?._meta) {
    check(bl._meta.engine_version <= v.engine_version,
      `baseline engine_version(${bl._meta.engine_version}) ≤ current(${v.engine_version})`);
  }
} catch { console.log('  ⚠️  baseline 읽기 실패 — skip'); }

console.log('\n' + '─'.repeat(50));
if (failed === 0) { console.log(`✅ Version Lock Gate PASS (${passed} checks)`); process.exit(0); }
else              { console.error(`❌ Version Lock Gate FAIL — ${failed}개 위반`); process.exit(1); }
