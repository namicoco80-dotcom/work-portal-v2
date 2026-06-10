// scripts/contract-check.js
// 업무Portal v2 — Contract Gate

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const BANNED = [
  {
    // 주석 제외: //로 시작하는 줄, /* */ 블록 내부 제외하고 실제 코드만
    test: (line) => /(?<![\/\*\s])\bwindow\.confirm\s*\(/.test(line) && !line.trimStart().startsWith('//'),
    rule: '02-modal-contract',
    msg:  'window.confirm() 사용 금지 → ModalManager.confirm() 사용',
  },
  {
    test: (line) => /(?<![\/\*\s])\bwindow\.alert\s*\(/.test(line) && !line.trimStart().startsWith('//'),
    rule: '02-modal-contract',
    msg:  'window.alert() 사용 금지 → ModalManager.alert() 사용',
  },
  {
    test: (line) => /(?<![\/\*\s])\bwindow\.prompt\s*\(/.test(line) && !line.trimStart().startsWith('//'),
    rule: '02-modal-contract',
    msg:  'window.prompt() 사용 금지 → ModalManager.prompt() 사용',
  },
  {
    test: (line) => /\.style\.display\s*=\s*['"]none['"]/.test(line) && !line.trimStart().startsWith('//'),
    rule: '01-focus-contract',
    msg:  'overlay.style.display = none 직접 조작 금지 → OverlayManager.close() 사용',
  },
  {
    test: (line) => /\.style\.display\s*=\s*['"]block['"]/.test(line) && !line.trimStart().startsWith('//'),
    rule: '01-focus-contract',
    msg:  'overlay.style.display = block 직접 조작 금지 → OverlayManager.open() 사용',
  },
  {
    // *.focus() 직접 호출 — 단, FocusManager 내부 _refocus()는 허용
    test: (line, filePath) => {
      if (line.trimStart().startsWith('//')) return false;
      if (filePath.includes('focus-manager.js')) return false; // FocusManager 자체는 허용
      return /\w+\.focus\s*\(\s*\)/.test(line);
    },
    rule: '01-focus-contract',
    msg:  'element.focus() 직접 호출 금지 → FocusManager 사용',
  },
  {
    test: (line) => /\blocalStorage\.(getItem|setItem|removeItem|clear)\s*\(/.test(line) && !line.trimStart().startsWith('//'),
    rule: '08-adapter-contract',
    msg:  'localStorage 직접 접근 금지 → Store 사용',
  },
  {
    test: (line) => /\bsnapshot\.\w+\s*\.(push|splice|pop|shift)\s*\(/.test(line) && !line.trimStart().startsWith('//'),
    rule: '05-snapshot-contract',
    msg:  'snapshot 직접 mutation 금지 → dispatch() 사용',
  },
];

const SCAN_DIRS  = ['engine', 'shared', 'core'];
const SKIP_DIRS  = ['tests', 'node_modules', '.git', 'scripts', 'baseline', 'contracts'];
const EXTENSIONS = new Set(['.js', '.mjs', '.ts']);

function walk(dir, results) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.includes(entry)) walk(full, results);
    } else if (EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
}

let violations = 0;

for (const dir of SCAN_DIRS) {
  const files = [];
  try { walk(dir, files); } catch { continue; }

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { test, rule, msg } of BANNED) {
        if (test(line, file)) {
          console.error(`\n❌ Contract Violation`);
          console.error(`   File   : ${file}`);
          console.error(`   Line   : ${i + 1}`);
          console.error(`   Code   : ${line.trim()}`);
          console.error(`   Rule   : contracts/${rule}.md`);
          console.error(`   Reason : ${msg}`);
          violations++;
        }
      }
    }
  }
}

console.log('\n' + '─'.repeat(50));
if (violations === 0) {
  console.log('✅ Contract Gate PASS — 금지 패턴 없음');
  process.exit(0);
} else {
  console.error(`❌ Contract Gate FAIL — ${violations}개 위반`);
  process.exit(1);
}
