// shared/search-manager.js
// 업무Portal v2 — SearchManager
//
// 역할: Snapshot → Index → Query → Result
//
// 규칙:
//   Index는 derived data — source of truth 아님
//   Snapshot 변경 → rebuild (Index → Snapshot 방향 금지)
//   Engine 밖, Store 밖, UI 밖
//   index 자체를 저장하지 않음 (재생성 가능)
//
// Index 항목:
//   todo:     id, title, priority, dueDate, done
//   event:    id, title, date, time
//   memo:     date, content (최대 200자 excerpt)

/* --- INDEX ENTRY 구조 ---
  {
    type:    'todo' | 'event' | 'memo'
    id:      string
    title:   string          (검색 대상 주 필드)
    excerpt: string | null   (memo content 일부)
    date:    string | null   (YYYY-MM-DD)
    meta:    object          (type별 추가 정보)
  }
---------------------------------------- */

export function createSearchManager() {
  let _index = [];  // flat array of index entries

  return {
    /* --- build ------------------------------------------
       Snapshot 변경 시 호출 — index 완전 재생성
       store.subscribe(snap => searchManager.build(snap))
    ---------------------------------------------------- */
    build(snapshot) {
      const entries = [];
      const { todos, calendar, memo } = snapshot.data;

      // Todo
      for (const t of todos.items) {
        entries.push({
          type:    'todo',
          id:      t.id,
          title:   t.title,
          excerpt: null,
          date:    t.dueDate || null,
          meta:    { priority: t.priority, done: t.done, linkedEventId: t.linkedEventId },
        });
      }

      // Calendar Events
      for (const e of calendar.events) {
        entries.push({
          type:    'event',
          id:      e.id,
          title:   e.title,
          excerpt: null,
          date:    e.date,
          meta:    { time: e.time, color: e.color, todoId: e.todoId || null },
        });
      }

      // Memo (byDate)
      for (const [date, m] of Object.entries(memo.byDate)) {
        if (!m?.content) continue;
        entries.push({
          type:    'memo',
          id:      `memo-${date}`,
          title:   `${date} 메모`,
          excerpt: m.content.slice(0, 200),
          date,
          meta:    { charCount: m.content.length },
        });
      }

      _index = entries;
    },

    /* --- query ------------------------------------------
       keyword: 검색어 (공백 분리 → AND 조건)
       options: { types, dateFrom, dateTo, doneFilter }
    ---------------------------------------------------- */
    query(keyword = '', options = {}) {
      const {
        types      = ['todo', 'event', 'memo'],
        dateFrom   = null,
        dateTo     = null,
        doneFilter = 'all',  // 'all' | 'active' | 'done'
      } = options;

      const keywords = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);

      return _index.filter(entry => {
        // type 필터
        if (!types.includes(entry.type)) return false;

        // done 필터 (todo만 해당)
        if (entry.type === 'todo' && doneFilter !== 'all') {
          if (doneFilter === 'active' && entry.meta.done)  return false;
          if (doneFilter === 'done'   && !entry.meta.done) return false;
        }

        // 날짜 범위
        if (dateFrom && entry.date && entry.date < dateFrom) return false;
        if (dateTo   && entry.date && entry.date > dateTo)   return false;

        // 키워드 매칭 (AND — 모든 키워드 포함)
        if (keywords.length === 0) return true;
        const searchTarget = [
          entry.title,
          entry.excerpt || '',
          entry.date    || '',
        ].join(' ').toLowerCase();

        return keywords.every(kw => searchTarget.includes(kw));
      });
    },

    /* --- getStats --------------------------------------- */
    getStats() {
      const byType = { todo: 0, event: 0, memo: 0 };
      for (const e of _index) byType[e.type] = (byType[e.type] || 0) + 1;
      return { total: _index.length, byType };
    },

    /* --- clear ----------------------------------------- */
    clear() { _index = []; },
  };
}
