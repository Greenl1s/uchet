import { state } from './state.js';
import { pad } from './utils.js';
import { openModal } from './ui.js';

export function showCalendar() {
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();

  function renderCalendar(y, m) {
    const verificationMap = new Map();
    state.instruments.forEach((item) => {
      if (!item.valid_until) return;
      if (!verificationMap.has(item.valid_until)) verificationMap.set(item.valid_until, []);
      verificationMap.get(item.valid_until).push(item);
    });
    const bookedMap = new Map();
    state.instruments.forEach((item) => {
      if (!item.booked_by || !item.booked_date) return;
      if (!bookedMap.has(item.booked_date)) bookedMap.set(item.booked_date, []);
      bookedMap.get(item.booked_date).push(item);
    });
    const takenMap = new Map();
    state.instruments.forEach((item) => {
      if (!item.taken_by || !item.taken_date) return;
      if (!takenMap.has(item.taken_date)) takenMap.set(item.taken_date, []);
      takenMap.get(item.taken_date).push(item);
    });
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    let grid = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => `<div class="day header">${d}</div>`).join('');
    for (let i = 0; i < offset; i++) grid += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const key = y + '-' + pad(m + 1) + '-' + pad(d);
      const hasVerification = verificationMap.has(key) && verificationMap.get(key).length > 0;
      const hasBooked = bookedMap.has(key) && bookedMap.get(key).length > 0;
      const hasTaken = takenMap.has(key) && takenMap.get(key).length > 0;
      const isToday = (y === today.getFullYear() && m === today.getMonth() && d === today.getDate());
      let classes = 'day';
      if (isToday) classes += ' today';
      let colorClass = '';
      const count = [hasVerification, hasBooked, hasTaken].filter(Boolean).length;
      if (count === 3) colorClass = 'purple';
      else if (count === 2) colorClass = 'orange';
      else if (count === 1) {
        if (hasVerification) colorClass = 'green';
        else if (hasBooked) colorClass = 'red';
        else if (hasTaken) colorClass = 'blue';
      }
      if (colorClass) classes += ' ' + colorClass;
      let click = '';
      if (hasVerification || hasBooked || hasTaken) {
        const dateStr = key;
        click = `onclick="window._showDayEvents('${dateStr}')"`;
      }
      grid += `<div class="${classes}" ${click}>${d}</div>`;
    }
    return grid;
  }

  function renderMonth(y, m) {
    const monthName = new Date(y, m).toLocaleString('ru', { month: 'long', year: 'numeric' });
    const grid = renderCalendar(y, m);
    return `
      <div class="calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <button class="secondary" data-cal-prev>◀</button>
        <span style="font-weight:bold; font-size:18px;">${monthName}</span>
        <button class="secondary" data-cal-next>▶</button>
      </div>
      <div class="calendar-grid">${grid}</div>
      <div class="calendar-legend" style="display:flex; gap:12px; margin-top:12px; flex-wrap:wrap; justify-content:center; font-size:12px;">
        <span><span class="badge red" style="background:#fee2e2;color:#b42318;">Красный</span> — только бронь</span>
        <span><span class="badge green" style="background:#dcfae6;color:#067647;">Зелёный</span> — срок истекает</span>
        <span><span class="badge blue" style="background:#dbeafe;color:#1e40af;">Синий</span> — только выдача</span>
        <span><span class="badge orange" style="background:#ffedd5;color:#b45309;">Оранжевый</span> — два из трёх</span>
        <span><span class="badge purple" style="background:#ede9fe;color:#6b21a8;">Фиолетовый</span> — все три</span>
      </div>
    `;
  }

  window._showDayEvents = (dateStr) => {
    const verificationItems = state.instruments.filter(inst => inst.valid_until === dateStr);
    const bookedItems = state.instruments.filter(inst => inst.booked_date === dateStr && inst.booked_by);
    const takenItems = state.instruments.filter(inst => inst.taken_date === dateStr && inst.taken_by);
    let html = '';
    if (takenItems.length) {
      html += `<div style="margin-top:6px;"><b>Выданы:</b></div>`;
      takenItems.forEach(inst => {
        html += `<div class="row">#${inst.id} ${inst.name} (Выдача: ${inst.taken_by})</div>`;
      });
    }
    if (bookedItems.length) {
      html += `<div style="margin-top:6px;"><b>Бронирование:</b></div>`;
      bookedItems.forEach(inst => {
        html += `<div class="row">#${inst.id} ${inst.name} (Бронирование: ${inst.booked_by})</div>`;
      });
    }
    if (verificationItems.length) {
      html += `<div style="margin-top:6px;"><b>Истекает срок:</b></div>`;
      verificationItems.forEach(inst => {
        html += `<div class="row">#${inst.id} ${inst.name} (Поверка)</div>`;
      });
    }
    if (!html) html = '<div>Нет событий</div>';
    html += `<div class="modal-actions"><button class="secondary" data-back-to-calendar>Назад</button></div>`;
    openModal(`События на ${dateStr}`, `<div class="list">${html}</div>`);
    const modal = document.getElementById('modal');
    const backBtn = modal.querySelector('[data-back-to-calendar]');
    if (backBtn) backBtn.onclick = () => { closeModal(); showCalendar(); };
  };

  const content = renderMonth(currentYear, currentMonth);
  openModal('Календарь', content);
  const modal = document.getElementById('modal');
  const head = modal.querySelector('.modal-head');
  function updateCalendar() {
    const body = modal.querySelector('.modal-body');
    const children = body.children;
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i] !== head) children[i].remove();
    }
    const temp = document.createElement('div');
    temp.innerHTML = renderMonth(currentYear, currentMonth);
    while (temp.firstChild) body.appendChild(temp.firstChild);
    bindCalEvents();
  }
  function bindCalEvents() {
    const p = modal.querySelector('[data-cal-prev]');
    const n = modal.querySelector('[data-cal-next]');
    if (p) p.onclick = () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } updateCalendar(); };
    if (n) n.onclick = () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } updateCalendar(); };
  }
  bindCalEvents();
}