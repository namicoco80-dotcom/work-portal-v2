// src/renderer/app.js
// 업무Portal v2 — Calendar MVP
//
// Flow: UI → command → store.dispatch() → snapshot → render
// 금지: snapshot 직접 수정 / engine 직접 호출 / element.focus() 직접 호출

/* --- IMPORTS --- */
import { store }        from '../../core/store.js';
import { FocusManager } from '../../shared/focus-manager.js';
import { ModalManager } from '../../shared/modal-manager.js';

/* --- CONSTANTS --- */
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const COLORS    = ['default', 'red', 'green'];

/* --- STATE (UI only — view cursor) --- */
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();       // 0-based
let selectedDate = toDateStr(new Date());    // YYYY-MM-DD

/* --- HELPERS --- */
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayStr() { return toDateStr(new Date()); }
function newId()    { return `evt-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function nowISO()   { return new Date().toISOString(); }

function getEvents() {
  return store.getSnapshot().data.calendar.events;
}
function getEventsForDate(dateStr) {
  return getEvents().filter(e => e.date === dateStr);
}

/* --- RENDER --- */
function render() {
  renderHeader();
  renderMonthNav();
  renderDayCells();
  renderEventList();
}

function renderHeader() {
  const today = new Date();
  const days  = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  document.getElementById('today-label').textContent =
    `${today.getMonth()+1}월 ${today.getDate()}일`;
  document.getElementById('today-sub').textContent =
    `${today.getFullYear()} · ${days[today.getDay()]}`;
}

function renderMonthNav() {
  document.getElementById('month-label').textContent =
    `${viewYear}년 ${viewMonth+1}월`;
}

function renderDayCells() {
  // Day name header (한 번만 그려도 되지만 단순화)
  const namesEl = document.getElementById('day-names');
  namesEl.innerHTML = DAY_NAMES.map(d =>
    `<div class="day-name">${d}</div>`
  ).join('');

  // 이달 첫날 요일, 마지막날
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const lastDate = new Date(viewYear, viewMonth+1, 0).getDate();

  const cellsEl = document.getElementById('day-cells');
  const today   = todayStr();
  const eventDates = new Set(getEvents().map(e => e.date));

  let html = '';

  // 이전 달 빈 칸
  const prevLast = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevLast - i;
    const dateStr = toDateStr(new Date(viewYear, viewMonth-1, d));
    html += `<div class="day-cell other-month" data-date="${dateStr}">${d}</div>`;
  }

  // 이번 달
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = toDateStr(new Date(viewYear, viewMonth, d));
    let cls = 'day-cell';
    if (dateStr === today)        cls += ' today';
    if (dateStr === selectedDate) cls += ' selected';
    if (eventDates.has(dateStr))  cls += ' has-event';
    html += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
  }

  // 다음 달 빈 칸 (6줄 고정)
  const total = firstDay + lastDate;
  const remain = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= remain; d++) {
    const dateStr = toDateStr(new Date(viewYear, viewMonth+1, d));
    html += `<div class="day-cell other-month" data-date="${dateStr}">${d}</div>`;
  }

  cellsEl.innerHTML = html;

  // 날짜 클릭
  cellsEl.querySelectorAll('.day-cell').forEach(el => {
    el.addEventListener('click', () => {
      selectedDate = el.dataset.date;
      // viewMonth 이동 (다른 달 날짜 클릭 시)
      const d = new Date(selectedDate);
      viewYear  = d.getFullYear();
      viewMonth = d.getMonth();
      render();
    });
  });
}

function renderEventList() {
  const label  = document.getElementById('event-date-label');
  const listEl = document.getElementById('event-list');
  const events = getEventsForDate(selectedDate);

  // 날짜 표시
  const d = new Date(selectedDate + 'T00:00:00');
  label.textContent = `${d.getMonth()+1}월 ${d.getDate()}일 일정`;

  if (events.length === 0) {
    listEl.innerHTML = `<div class="empty-state">등록된 일정이 없습니다</div>`;
    return;
  }

  listEl.innerHTML = events
    .sort((a,b) => (a.time||'99:99').localeCompare(b.time||'99:99'))
    .map(e => `
      <div class="event-item" data-id="${e.id}">
        <div class="event-dot ${e.color||'default'}"></div>
        <span class="event-title">${escHtml(e.title)}</span>
        ${e.time ? `<span class="event-time">${e.time}</span>` : ''}
        <button class="event-del" data-id="${e.id}" title="삭제">×</button>
      </div>`)
    .join('');

  // 삭제 버튼
  listEl.querySelectorAll('.event-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleDeleteEvent(btn.dataset.id);
    });
  });
}

/* --- COMMANDS --- */

// UI → command → store.dispatch() → render
function handleAddEvent({ title, time, color }) {
  store.dispatch({
    type: 'EVENT_ADD',
    payload: {
      id:        newId(),
      title:     title.trim(),
      date:      selectedDate,
      time:      time || null,
      color:     color || 'default',
      createdAt: nowISO(),
    },
  });
  render();
  FocusManager.focusById('calendar-panel');
}

function handleDeleteEvent(id) {
  store.dispatch({ type: 'EVENT_DELETE', payload: { id } });
  render();
}

/* --- MODAL: 일정 추가 ─────────────────────────────
   ModalManager 사용 — window.confirm/alert 금지
   직접 DOM 생성 (ModalManager.custom 패턴)
---------------------------------------------------*/
function openAddModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box" id="add-modal-box">
      <div class="modal-title">일정 추가</div>
      <div class="modal-field">
        <label>제목 *</label>
        <input id="ev-title" type="text" placeholder="일정 제목" maxlength="80" autocomplete="off">
      </div>
      <div class="modal-field">
        <label>시간 (선택)</label>
        <input id="ev-time" type="time">
      </div>
      <div class="modal-field">
        <label>색상</label>
        <select id="ev-color">
          <option value="default">기본 (파랑)</option>
          <option value="red">빨강</option>
          <option value="green">초록</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="modal-cancel">취소</button>
        <button class="btn-confirm" id="modal-confirm">추가</button>
      </div>
    </div>`;

  document.getElementById('modal-root').appendChild(backdrop);

  const titleInput = document.getElementById('ev-title');
  titleInput.focus();

  function close() {
    backdrop.remove();
    FocusManager.restore();
  }

  document.getElementById('modal-cancel').addEventListener('click', close);

  document.getElementById('modal-confirm').addEventListener('click', () => {
    const title = titleInput.value.trim();
    if (!title) { titleInput.focus(); return; }
    handleAddEvent({
      title,
      time:  document.getElementById('ev-time').value  || null,
      color: document.getElementById('ev-color').value || 'default',
    });
    close();
  });

  // ESC
  backdrop.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });

  // backdrop 클릭 (modal-box 외부)
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) close();
  });

  // Enter → confirm
  titleInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modal-confirm').click();
  });
}

/* --- XSS 방어 --- */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* --- EVENT BINDINGS --- */
document.getElementById('prev-month').addEventListener('click', () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  render();
});
document.getElementById('next-month').addEventListener('click', () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  render();
});
document.getElementById('go-today').addEventListener('click', () => {
  const today = new Date();
  viewYear     = today.getFullYear();
  viewMonth    = today.getMonth();
  selectedDate = todayStr();
  render();
});
document.getElementById('add-btn').addEventListener('click', () => {
  FocusManager._lastTarget = document.getElementById('calendar-panel');
  openAddModal();
});

/* --- Store subscribe → render ─────────────────────
   단방향 흐름 종착점: snapshot 변경 → UI 갱신
---------------------------------------------------*/
store.subscribe(render);

/* --- INIT --- */
render();
FocusManager.focusById('calendar-panel');
