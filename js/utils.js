export const $ = (id) => document.getElementById(id);
export const today = () => new Date().toISOString().slice(0, 10);
export const pad = (value) => String(value).padStart(2, '0');
export const clean = (value) => value == null || String(value).toLowerCase() === 'nan' ? '' : String(value).trim();
export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(String.fromCharCode(34), '&quot;')
    .replaceAll(String.fromCharCode(39), '&#39;');
}
export const escapeAttr = escapeHtml;
export const formData = (form) => Object.fromEntries(new FormData(form).entries());