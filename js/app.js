import { state } from './state.js';
import { $ } from './utils.js';
import { loadWorkbook, saveWorkbook } from './supabase.js';
import { ensureDefaultAdmin, login, logout, readSession, showUserForm, showUsersManager } from './auth.js';
import { renderCard, renderList, showInstrumentForm, renderRetiredRow, restoreRetiredItem, retireInstrument } from './instruments.js';
import { showCalendar } from './calendar.js';
import { openModal, toast, closeModal } from './ui.js';

// === Тема ===
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.textContent = 'Светлая';
  } else {
    themeToggle.textContent = 'Тёмная';
  }
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? 'Светлая' : 'Тёмная';
  });
}

// === Инициализация ===
document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindEvents();
  state.currentUser = readSession();
  try {
    const data = await loadWorkbook();
    state.instruments = data.instruments || [];
    state.history = data.history || [];
    state.users = data.users || [];
    state.retired = data.retired || [];
    await ensureDefaultAdmin();
    populateUserFilter();
    state.currentUser ? showApp() : showAuth();
  } catch (error) {
    toast(error.message, true);
    document.getElementById('authView').innerHTML = `<div class="panel card">Ошибка загрузки: ${error.message}</div>`;
  }
}

function bindEvents() {
  document.getElementById('loginForm').addEventListener('submit', onLogin);
  document.getElementById('logoutButton').onclick = () => {
    logout();
    history.pushState(null, '', location.pathname);
    showAuth();
  };
  document.getElementById('usersButton').onclick = showUsersManager;
  document.getElementById('profileButton').onclick = () =>
    showUserForm(
      state.users.find((u) => u.username === state.currentUser.username),
      showApp
    );
  document.getElementById('addInstrumentButton').onclick = () => showInstrumentForm();
  document.getElementById('calendarButton').onclick = () => {
    if (state.currentUser.role !== 'admin') {
      toast('Доступ запрещён', true);
      return;
    }
    showCalendar();
  };
  document.getElementById('retiredButton').onclick = showRetired;
  document.getElementById('searchInput').oninput = (e) => {
    state.search = e.target.value;
    renderList(openCard);
  };
  document.getElementById('verificationFilter').onchange = (e) => {
    state.verification = e.target.value;
    renderList(openCard);
  };
  document.getElementById('conditionFilter').onchange = (e) => {
    state.condition = e.target.value;
    renderList(openCard);
  };
  const userFilter = document.getElementById('userFilter');
  userFilter.onchange = (e) => {
    state.userFilter = e.target.value;
    renderList(openCard);
  };
  // Массовый режим
  document.getElementById('massToggleBtn').onclick = () => {
    state.massMode = !state.massMode;
    const isMass = state.massMode;
    document.getElementById('massRetireBtn').style.display = isMass ? 'inline-flex' : 'none';
    document.getElementById('massDeleteBtn').style.display = isMass ? 'inline-flex' : 'none';
    document.getElementById('massToggleBtn').textContent = isMass ? 'Отменить выбор' : 'Выбрать';
    renderList(openCard);
  };
  document.getElementById('massRetireBtn').onclick = async () => {
    const selected = getSelectedInstruments();
    if (!selected.length) return toast('Выберите приборы', true);
    if (!confirm(`Списать ${selected.length} прибор(ов)?`)) return;
    for (const item of selected) {
      await retireInstrument(item, () => {});
    }
    state.massMode = false;
    document.getElementById('massRetireBtn').style.display = 'none';
    document.getElementById('massDeleteBtn').style.display = 'none';
    document.getElementById('massToggleBtn').textContent = 'Выбрать';
    renderList(openCard);
    toast('Приборы списаны');
  };
  document.getElementById('massDeleteBtn').onclick = async () => {
    const selected = getSelectedInstruments();
    if (!selected.length) return toast('Выберите приборы', true);
    if (!confirm(`Удалить ${selected.length} прибор(ов) безвозвратно?`)) return;
    for (const item of selected) {
      state.instruments = state.instruments.filter(i => i !== item);
    }
    await saveWorkbook('Приборы удалены');
    state.massMode = false;
    document.getElementById('massRetireBtn').style.display = 'none';
    document.getElementById('massDeleteBtn').style.display = 'none';
    document.getElementById('massToggleBtn').textContent = 'Выбрать';
    renderList(openCard);
    toast('Приборы удалены');
  };
  window.addEventListener('popstate', renderRoute);
  window.addEventListener('app:refresh-route', renderRoute);
}

function populateUserFilter() {
  const userFilter = document.getElementById('userFilter');
  const currentValue = userFilter.value;
  userFilter.innerHTML = '<option value="all">Все</option>';
  state.users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.username;
    opt.textContent = u.username;
    userFilter.appendChild(opt);
  });
  userFilter.value = currentValue || 'all';
}

function getSelectedInstruments() {
  const checkboxes = document.querySelectorAll('.instrument-checkbox:checked');
  const ids = Array.from(checkboxes).map(cb => cb.value);
  return state.instruments.filter(i => ids.includes(String(i.id)));
}

async function onLogin(event) {
  event.preventDefault();
  const btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Загрузка...';
  try {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!login(username, password)) {
      toast('Неверный логин или пароль', true);
      return;
    }
    showApp();
  } catch (err) {
    toast('Ошибка входа', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
}

function showAuth() {
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('appView').classList.add('hidden');
}

function showApp() {
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('currentUserBadge').textContent =
    state.currentUser.role === 'admin' ? 'Администратор' : state.currentUser.username;
  const isAdmin = state.currentUser.role === 'admin';
  document.querySelectorAll('.admin-only').forEach((node) =>
    node.classList.toggle('hidden', !isAdmin)
  );
  document.getElementById('massRetireBtn').style.display = 'none';
  document.getElementById('massDeleteBtn').style.display = 'none';
  document.getElementById('massToggleBtn').textContent = 'Выбрать';
  state.massMode = false;
  renderRoute();
}

function renderRoute() {
  const id = new URLSearchParams(location.search).get('id');
  if (id) {
    renderCard(id, goList);
  } else {
    document.getElementById('cardScreen').classList.add('hidden');
    document.getElementById('listScreen').classList.remove('hidden');
    renderList(openCard);
  }
}

function openCard(id) {
  history.pushState(null, '', `?id=${encodeURIComponent(id)}`);
  renderRoute();
}

function goList() {
  history.pushState(null, '', location.pathname);
  renderRoute();
}

function showRetired() {
  const isAdmin = state.currentUser.role === 'admin';
  let html = '';
  if (!state.retired.length) {
    html = '<div class="panel card">Списанных приборов нет</div>';
  } else {
    html = state.retired.map(renderRetiredRow).join('');
  }
  openModal('Списанные приборы', `<div class="list">${html}</div>`);
  if (!isAdmin) return;
  document.querySelectorAll('[data-restore-id]').forEach((btn) => {
    btn.onclick = async (e) => {
      const id = btn.dataset.restoreId;
      const item = state.retired.find((i) => String(i.id) === String(id));
      if (!item) return toast('Прибор не найден', true);
      await restoreRetiredItem(item);
      showRetired();
    };
  });
  document.querySelectorAll('[data-open-retired-id]').forEach((btn) => {
    btn.onclick = (e) => {
      const id = btn.dataset.openRetiredId;
      closeModal();
      openCard(id);
    };
  });
}