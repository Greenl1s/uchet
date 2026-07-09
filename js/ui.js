import { $, escapeAttr, escapeHtml } from './utils.js';

export function setSync(text) {
  document.getElementById('syncStatus').textContent = text;
}

export function toast(text, isError = false) {
  const node = document.getElementById('toast');
  node.textContent = text;
  node.style.background = isError ? '#b42318' : '#101828';
  node.classList.remove('hidden');
  setTimeout(() => node.classList.add('hidden'), 2600);
}

export function openModal(title, html) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-body">
      <div class="modal-head">
        <h1>${escapeHtml(title)}</h1>
        <button class="secondary" data-close type="button">Закрыть</button>
      </div>
      ${html}
    </div>
  `;
  modal.showModal();
  modal.querySelectorAll('[data-close]').forEach((node) => node.onclick = closeModal);
}

export function closeModal() {
  document.getElementById('modal').close();
}

export function field(label, value, raw = false) {
  return `<div class="field"><div class="field-label">${escapeHtml(label)}</div><div class="field-value">${raw ? value : escapeHtml(value || '—')}</div></div>`;
}

export function input(name, label, value = '', type = 'text', required = false) {
  let attrs = `name="${escapeAttr(name)}" type="${escapeAttr(type)}"`;
  if (type !== 'file' && value) attrs += ` value="${escapeAttr(value)}"`;
  if (required) attrs += ' required';
  return `<label>${escapeHtml(label)}<input ${attrs}></label>`;
}

export function select(name, label, value, options) {
  const normalized = options.map((option) => Array.isArray(option) ? option : [option, option]);
  return `<label>${escapeHtml(label)}<select name="${escapeAttr(name)}">${normalized.map(([val, text]) =>
    `<option value="${escapeAttr(val)}" ${String(val) === String(value) ? 'selected' : ''}>${escapeHtml(text)}</option>`
  ).join('')}</select></label>`;
}