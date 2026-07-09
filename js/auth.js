import { state } from './state.js';
import { $, formData } from './utils.js';
import { saveWorkbook } from './supabase.js';
import { closeModal, input, openModal, select, toast } from './ui.js';

export function readSession() {
  try { return JSON.parse(sessionStorage.getItem('instrumentUser')); } catch { return null; }
}

export function hasRole(role) {
  return state.currentUser && state.currentUser.role === role;
}

export function login(username, password) {
  username = String(username || '').trim();
  password = String(password || '').trim();
  const user = state.users.find((u) => String(u.username || '').trim() === username && String(u.password || '').trim() === password);
  if (!user) return false;
  state.currentUser = {
    username: String(user.username).trim(),
    role: user.role === 'admin' ? 'admin' : 'employee',
    extra: user.extra || ''
  };
  sessionStorage.setItem('instrumentUser', JSON.stringify(state.currentUser));
  return true;
}

export function logout() {
  state.currentUser = null;
  sessionStorage.removeItem('instrumentUser');
}

export async function ensureDefaultAdmin() {
  const hasAdmin = state.users.some((u) => String(u.username || '').trim() === 'admin');
  if (hasAdmin) return;
  state.users.unshift({ username: 'admin', password: 'admin', role: 'admin', extra: '' });
  await saveWorkbook('Добавлен пользователь admin/admin');
}

export function showUserForm(user = null, afterSave = () => {}) {
  const values = user || { role: 'employee', extra: '' };
  openModal(user ? 'Изменить пользователя' : 'Добавить пользователя',
    `<form id="userForm" class="form-grid">
      ${input('username', 'Логин', values.username, 'text', true)}
      ${input('password', 'Пароль', values.password, 'text', true)}
      ${select('role', 'Роль', values.role, [['employee', 'Пользователь'], ['admin', 'Администратор']])}
      ${input('extra', 'Доп. информация (телефон, email и т.д.)', values.extra, 'text')}
      <div class="modal-actions"><button class="primary" type="submit">Сохранить</button></div>
    </form>`
  );
  document.getElementById('userForm').onsubmit = async (event) => {
    event.preventDefault();
    const data = formData(event.target);
    if (state.users.some((u) => u !== user && u.username === data.username)) return toast('Такой логин уже есть', true);
    if (user) Object.assign(user, data);
    else state.users.push(data);
    closeModal();
    await saveWorkbook('Пользователь сохранен');
    if (state.currentUser && state.currentUser.username === data.username) {
      state.currentUser.extra = data.extra;
      sessionStorage.setItem('instrumentUser', JSON.stringify(state.currentUser));
    }
    afterSave();
  };
}

export function showUsersManager() {
  const rows = state.users.map((u) =>
    `<div class="row"><div><b>${u.username}</b><div class="row-subtitle">${u.role === 'admin' ? 'Администратор' : 'Пользователь'}${u.extra ? ' · ' + u.extra : ''}</div></div>
    <div class="badges"><button class="secondary" data-edit-user="${u.username}">Изменить</button>
    <button class="danger" data-delete-user="${u.username}">Удалить</button></div></div>`
  ).join('');
  openModal('Пользователи',
    `<div class="form-grid"><button class="primary" data-add-user>Добавить</button>${rows}</div>`
  );
  document.querySelector('[data-add-user]').onclick = () => showUserForm(null, showUsersManager);
  document.querySelectorAll('[data-edit-user]').forEach((n) => n.onclick = () => showUserForm(state.users.find((u) => u.username === n.dataset.editUser), showUsersManager));
  document.querySelectorAll('[data-delete-user]').forEach((n) => n.onclick = async () => {
    if (n.dataset.deleteUser === 'admin') return toast('Пользователя admin нельзя удалить', true);
    state.users = state.users.filter((u) => u.username !== n.dataset.deleteUser);
    await saveWorkbook('Пользователь удален');
    showUsersManager();
  });
}