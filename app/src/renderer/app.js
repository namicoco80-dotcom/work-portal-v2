// src/renderer/app.js
// 업무Portal v2 — STEP 7 UI Expansion
// Views: Calendar | Todo | Memo | Snapshot
// Flow:  UI → dispatch(command) → snapshot → render(snapshot)

/* --- IMPORTS --- */
import { store }        from '../../core/store.js';
import { FocusManager } from '../../shared/focus-manager.js';

/* --- CONSTANTS --- */
const PRIORITIES = { high:'높음', normal:'보통', low:'낮음' };

/* --- UI STATE (view cursor only) --- */
let currentView  = 'calendar';
let viewYear     = new Date().getFullYear();
let viewMonth    = new Date().getMonth();
let selectedDate = toDateStr(new Date());

/* --- UTILS --- */
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayStr()   { return toDateStr(new Date()); }
function newId(p='id'){ return `${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
function nowISO()     { return new Date().toISOString(); }
function escHtml(s)   {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function el(id) { return document.getElementById(id); }

/* --- SNAPSHOT ACCESSORS --- */
function snap()        { return store.getSnapshot(); }
function getEvents()   { return snap().data.calendar.events; }
function getTodos()    { return snap().data.todos.items; }
function getMemo(date) { return snap().data.memo.byDate[date]?.content || ''; }

/* ═══════════════════════════════════
   RENDER ROUTER
═══════════════════════════════════ */
function render() {
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('hidden', v.id !== `view-${currentView}`));
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === currentView));

  if (currentView === 'calendar') renderCalendar();
  if (currentView === 'todo')     renderTodo();
  if (currentView === 'memo')     renderMemo();
  if (currentView === 'snapshot') renderSnapshot();
}

/* ═══════════════════════════════════
   CALENDAR
═══════════════════════════════════ */
function renderCalendar() {
  const today = new Date();
  const days  = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  el('cal-today-label').textContent = `${today.getMonth()+1}월 ${today.getDate()}일`;
  el('cal-today-sub').textContent   = `${today.getFullYear()} · ${days[today.getDay()]}`;
  el('cal-month-label').textContent = `${viewYear}년 ${viewMonth+1}월`;

  const cellsEl    = el('cal-cells');
  const todayDS    = todayStr();
  const eventDates = new Set(getEvents().map(e => e.date));
  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const lastDate   = new Date(viewYear, viewMonth+1, 0).getDate();
  const prevLast   = new Date(viewYear, viewMonth, 0).getDate();

  let html = '';
  for (let i = firstDay-1; i >= 0; i--) {
    const ds = toDateStr(new Date(viewYear, viewMonth-1, prevLast-i));
    html += `<div class="day-cell other-month" data-date="${ds}">${prevLast-i}</div>`;
  }
  for (let d = 1; d <= lastDate; d++) {
    const ds = toDateStr(new Date(viewYear, viewMonth, d));
    let cls = 'day-cell';
    if (ds === todayDS)      cls += ' today';
    if (ds === selectedDate) cls += ' selected';
    if (eventDates.has(ds))  cls += ' has-event';
    html += `<div class="${cls}" data-date="${ds}">${d}</div>`;
  }
  const remain = (firstDay + lastDate) % 7 === 0 ? 0 : 7 - ((firstDay + lastDate) % 7);
  for (let d = 1; d <= remain; d++) {
    const ds = toDateStr(new Date(viewYear, viewMonth+1, d));
    html += `<div class="day-cell other-month" data-date="${ds}">${d}</div>`;
  }
  cellsEl.innerHTML = html;
  cellsEl.querySelectorAll('.day-cell').forEach(cell =>
    cell.addEventListener('click', () => {
      const d = new Date(cell.dataset.date);
      selectedDate = cell.dataset.date;
      viewYear = d.getFullYear(); viewMonth = d.getMonth();
      renderCalendar();
    })
  );

  // Event list
  const listEl = el('event-list');
  const d = new Date(selectedDate + 'T00:00:00');
  el('event-date-label').textContent = `${d.getMonth()+1}월 ${d.getDate()}일 일정`;
  const events = getEvents()
    .filter(e => e.date === selectedDate)
    .sort((a,b) => (a.time||'99:99').localeCompare(b.time||'99:99'));

  if (!events.length) {
    listEl.innerHTML = `<div class="empty-state">등록된 일정이 없습니다</div>`;
  } else {
    listEl.innerHTML = events.map(e => `
      <div class="event-item${e.todoId ? ' linked-todo' : ''}">
        <div class="event-dot color-${e.color||'default'}"></div>
        ${e.todoId ? '<span class="link-badge" title="할 일 연결">✓</span>' : ''}
        <span class="event-title">${escHtml(e.title)}</span>
        ${e.time ? `<span class="event-time">${e.time}</span>` : ''}
        <button class="icon-btn del-btn" data-id="${e.id}">×</button>
      </div>`).join('');
    listEl.querySelectorAll('.del-btn').forEach(btn =>
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        store.dispatch({ type:'EVENT_DELETE', payload:{ id:btn.dataset.id } });
      })
    );
  }
}

/* ═══════════════════════════════════
   TODO
═══════════════════════════════════ */
function renderTodo() {
  const todos  = getTodos();
  const active = todos.filter(t => !t.done);
  const done   = todos.filter(t => t.done);

  el('todo-stats').textContent = `${active.length}개 진행 중 · ${done.length}개 완료`;

  const makeItems = (items, isDone) => items.map(t => `
    <div class="todo-item${isDone?' done':''}">
      <button class="todo-check${isDone?' checked':''}" data-id="${t.id}" data-done="${isDone}">
        ${isDone ? '✓' : ''}
      </button>
      <div class="todo-body">
        <span class="todo-title">${escHtml(t.title)}</span>
        ${t.dueDate ? `<span class="todo-due">${t.dueDate}</span>` : ''}
      </div>
      <span class="prio-badge prio-${t.priority||'normal'}">${PRIORITIES[t.priority||'normal']}</span>
      <button class="icon-btn del-btn" data-id="${t.id}">×</button>
    </div>`).join('');

  el('todo-active').innerHTML = active.length
    ? makeItems(active, false)
    : `<div class="empty-state">할 일 없음 🎉</div>`;

  el('todo-done-section').classList.toggle('hidden', !done.length);
  if (done.length) el('todo-done').innerHTML = makeItems(done, true);

  el('todo-list-wrap').querySelectorAll('.todo-check').forEach(btn => {
    btn.addEventListener('click', () => {
      const isDone = btn.dataset.done === 'true';
      store.dispatch(isDone
        ? { type:'TODO_UPDATE',    payload:{ id:btn.dataset.id, changes:{ done:false } } }
        : { type:'TODO_COMPLETE',  payload:{ id:btn.dataset.id } }
      );
    });
  });
  el('todo-list-wrap').querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      store.dispatch({ type:'TODO_DELETE', payload:{ id:btn.dataset.id } });
    });
  });
}

/* ═══════════════════════════════════
   MEMO
═══════════════════════════════════ */
function renderMemo() {
  const d = new Date(selectedDate+'T00:00:00');
  el('memo-date-label').textContent =
    `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
  const ta = el('memo-textarea');
  if (document.activeElement !== ta) ta.value = getMemo(selectedDate);
  el('memo-saved').classList.add('hidden');
}

let memoTimer = null;
function scheduleMemoSave(content) {
  clearTimeout(memoTimer);
  el('memo-saved').classList.add('hidden');
  memoTimer = setTimeout(() => {
    store.dispatch({ type:'MEMO_SET', payload:{ date:selectedDate, content, updatedAt:nowISO() } });
    el('memo-saved').classList.remove('hidden');
  }, 600);
}

/* ═══════════════════════════════════
   SNAPSHOT VIEWER
═══════════════════════════════════ */
function renderSnapshot() {
  const s = snap();
  el('sv-engine').textContent  = s.engine_version;
  el('sv-snap').textContent    = s.snapshot_version;
  el('sv-updated').textContent = s.metadata?.updatedAt?.slice(0,19).replace('T',' ') || '—';
  el('sv-todos').textContent   = getTodos().length;
  el('sv-events').textContent  = getEvents().length;
  el('sv-memos').textContent   = Object.keys(s.data.memo.byDate).length;
  el('sv-json').textContent    = JSON.stringify(s, null, 2);
}

/* ═══════════════════════════════════
   MODAL
═══════════════════════════════════ */
function openModal(html, onConfirm) {
  const root = el('modal-root');
  root.innerHTML = `<div class="modal-backdrop">${html}</div>`;
  const bd = root.querySelector('.modal-backdrop');

  const close = () => { root.innerHTML = ''; FocusManager.restore(); };
  bd.querySelector('.btn-cancel')?.addEventListener('click', close);
  bd.querySelector('.btn-confirm')?.addEventListener('click', () => {
    if (onConfirm(bd)) close();
  });
  bd.addEventListener('keydown', e => { if (e.key==='Escape') close(); });
  bd.addEventListener('click',   e => { if (e.target===bd) close(); });
  setTimeout(() => bd.querySelector('input,textarea')?.focus(), 30);
}

function openAddEventModal() {
  FocusManager._lastTarget = el('cal-panel');
  openModal(`
    <div class="modal-box">
      <div class="modal-title">일정 추가 — ${selectedDate}</div>
      <div class="modal-field"><label>제목 *</label>
        <input id="ev-title" type="text" placeholder="일정 제목" maxlength="80"></div>
      <div class="modal-field"><label>시간 (선택)</label>
        <input id="ev-time" type="time"></div>
      <div class="modal-field"><label>색상</label>
        <select id="ev-color">
          <option value="default">기본 (파랑)</option>
          <option value="red">빨강</option>
          <option value="green">초록</option>
        </select></div>
      <div class="modal-actions">
        <button class="btn-cancel">취소</button>
        <button class="btn-confirm">추가</button>
      </div>
    </div>`,
    bd => {
      const title = bd.querySelector('#ev-title').value.trim();
      if (!title) { bd.querySelector('#ev-title').focus(); return false; }
      store.dispatch({ type:'EVENT_ADD', payload:{
        id:newId('evt'), title, date:selectedDate,
        time:bd.querySelector('#ev-time').value||null,
        color:bd.querySelector('#ev-color').value||'default',
        createdAt:nowISO(),
      }});
      return true;
    });
}

function openAddTodoModal() {
  FocusManager._lastTarget = el('todo-panel');
  openModal(`
    <div class="modal-box">
      <div class="modal-title">할 일 추가</div>
      <div class="modal-field"><label>제목 *</label>
        <input id="td-title" type="text" placeholder="할 일 제목" maxlength="100"></div>
      <div class="modal-field"><label>우선순위</label>
        <select id="td-prio">
          <option value="normal">보통</option>
          <option value="high">높음</option>
          <option value="low">낮음</option>
        </select></div>
      <div class="modal-field"><label>마감일 (선택)</label>
        <input id="td-due" type="date" value="${selectedDate}"></div>
      <div class="modal-actions">
        <button class="btn-cancel">취소</button>
        <button class="btn-confirm">추가</button>
      </div>
    </div>`,
    bd => {
      const title = bd.querySelector('#td-title').value.trim();
      if (!title) { bd.querySelector('#td-title').focus(); return false; }
      const dueDate = bd.querySelector('#td-due').value || null;
      store.dispatch({ type:'TODO_ADD', payload:{
        id:       newId('td'),
        title,
        priority: bd.querySelector('#td-prio').value,
        dueDate,
        eventId:  dueDate ? newId('evt') : undefined,
        createdAt: nowISO(),
      }});
      return true;
    });
}

/* ═══════════════════════════════════
   BINDINGS (one-time)
═══════════════════════════════════ */
function setupBindings() {
  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => { currentView = btn.dataset.view; render(); })
  );

  // Calendar
  el('cal-prev').addEventListener('click', () => {
    if (--viewMonth < 0) { viewMonth=11; viewYear--; } renderCalendar();
  });
  el('cal-next').addEventListener('click', () => {
    if (++viewMonth > 11) { viewMonth=0; viewYear++; } renderCalendar();
  });
  el('cal-today').addEventListener('click', () => {
    const t=new Date(); viewYear=t.getFullYear(); viewMonth=t.getMonth();
    selectedDate=todayStr(); renderCalendar();
  });
  el('cal-add-btn').addEventListener('click', openAddEventModal);

  // Todo
  el('todo-add-btn').addEventListener('click', openAddTodoModal);
  el('todo-clear-done').addEventListener('click', () => {
    if (getTodos().some(t=>t.done))
      store.dispatch({ type:'TODO_CLEAR_DONE' });
  });

  // Memo
  el('memo-textarea').addEventListener('input', e => scheduleMemoSave(e.target.value));
  el('memo-prev').addEventListener('click', () => {
    const d=new Date(selectedDate+'T00:00:00'); d.setDate(d.getDate()-1);
    selectedDate=toDateStr(d); renderMemo();
  });
  el('memo-next').addEventListener('click', () => {
    const d=new Date(selectedDate+'T00:00:00'); d.setDate(d.getDate()+1);
    selectedDate=toDateStr(d); renderMemo();
  });
  el('memo-today').addEventListener('click', () => { selectedDate=todayStr(); renderMemo(); });

  // Snapshot
  el('sv-copy').addEventListener('click', () => {
    navigator.clipboard?.writeText(el('sv-json').textContent);
    el('sv-copy').textContent='복사됨 ✓';
    setTimeout(()=>{ el('sv-copy').textContent='JSON 복사'; }, 1500);
  });
}

/* ═══════════════════════════════════
   PERSISTENCE
   저장: store.subscribe → debounce → snapshotSave
   로드: 앱 시작 시 snapshotLoad → store 복원
═══════════════════════════════════ */
let saveTimer = null;

function scheduleSave(snapshot) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await window.electronAPI?.snapshotSave(snapshot);
    } catch(e) {
      console.warn('[Persistence] save failed:', e.message);
    }
  }, 300);
}

async function initPersistence() {
  try {
    const saved = await window.electronAPI?.snapshotLoad();
    if (saved) {
      // 저장된 snapshot으로 store 복원
      store.dispatch({ type: 'SNAPSHOT_RESTORE', payload: saved });
    }
  } catch(e) {
    console.warn('[Persistence] load failed — using initial snapshot:', e.message);
  }
}

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
// 1. persistence subscribe (저장은 render와 독립)
store.subscribe(snapshot => scheduleSave(snapshot));

// 2. render subscribe
store.subscribe(render);

// 3. 저장 데이터 복원 후 초기 render
setupBindings();
await initPersistence();
render();
FocusManager.focusById('cal-panel');
