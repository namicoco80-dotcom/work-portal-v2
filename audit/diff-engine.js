// audit/diff-engine.js
// 업무Portal v2 — Diff Engine
//
// 규칙:
//   순수 함수만 허용 — side effect 금지
//   Snapshot 구조 직접 변경 금지
//   Engine / Store 의존 금지

/* --- SECTION: DIFF TARGETS --- */
// Snapshot.data 내에서 diff를 추적할 도메인 목록
const DIFF_DOMAINS = ['todos', 'calendar', 'memo'];

/* --- SECTION: HELPERS --- */

function diffArray(prevArr = [], nextArr = [], idKey = 'id') {
  const prevMap = new Map(prevArr.map(i => [i[idKey], i]));
  const nextMap = new Map(nextArr.map(i => [i[idKey], i]));

  const added   = nextArr.filter(i => !prevMap.has(i[idKey]))
                         .map(i => ({ id: i[idKey], data: i }));

  const removed = prevArr.filter(i => !nextMap.has(i[idKey]))
                         .map(i => ({ id: i[idKey], data: i }));

  const changed = nextArr
    .filter(i => prevMap.has(i[idKey]) &&
                 JSON.stringify(prevMap.get(i[idKey])) !== JSON.stringify(i))
    .map(i => ({ id: i[idKey], prev: prevMap.get(i[idKey]), next: i }));

  return { added, removed, changed };
}

function diffMemo(prevMemo = {}, nextMemo = {}) {
  const prevByDate = prevMemo.byDate ?? {};
  const nextByDate = nextMemo.byDate ?? {};
  const allDates   = new Set([...Object.keys(prevByDate), ...Object.keys(nextByDate)]);

  const added   = [];
  const removed = [];
  const changed = [];

  for (const date of allDates) {
    const p = prevByDate[date];
    const n = nextByDate[date];
    if (!p && n)                                          added.push({ date, data: n });
    else if (p && !n)                                     removed.push({ date, data: p });
    else if (p && n && p.content !== n.content)           changed.push({ date, prev: p, next: n });
  }

  return { added, removed, changed };
}

/* --- SECTION: MAIN --- */

/**
 * 두 Snapshot을 비교해 diffSummary 반환
 * @param {object} prev
 * @param {object} next
 * @returns {{ domain: string, added: [], removed: [], changed: [] }[]}
 */
export function buildDiff(prev, next) {
  if (!prev || !next) return [];

  const result = [];

  // Todos
  const todoPrev = prev.data?.todos?.items ?? [];
  const todoNext = next.data?.todos?.items ?? [];
  const todoDiff = diffArray(todoPrev, todoNext, 'id');
  if (todoDiff.added.length || todoDiff.removed.length || todoDiff.changed.length) {
    result.push({ domain: 'todos', ...todoDiff });
  }

  // Calendar events
  const calPrev = prev.data?.calendar?.events ?? [];
  const calNext = next.data?.calendar?.events ?? [];
  const calDiff = diffArray(calPrev, calNext, 'id');
  if (calDiff.added.length || calDiff.removed.length || calDiff.changed.length) {
    result.push({ domain: 'calendar', ...calDiff });
  }

  // Memo
  const memoDiff = diffMemo(prev.data?.memo, next.data?.memo);
  if (memoDiff.added.length || memoDiff.removed.length || memoDiff.changed.length) {
    result.push({ domain: 'memo', ...memoDiff });
  }

  return result;
}
