import { CONFIG } from './config.js';
import { state } from './state.js';

const SUPABASE_URL = CONFIG.supabaseUrl;
const SUPABASE_ANON_KEY = CONFIG.supabaseAnonKey;

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error (${response.status}): ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function loadWorkbook() {
  console.log('[Supabase] Загрузка данных...');
  try {
    const [instruments, history, users, retired] = await Promise.all([
      supabaseFetch('instruments?select=*'),
      supabaseFetch('history?select=*'),
      supabaseFetch('users?select=*'),
      supabaseFetch('retired?select=*')
    ]);
    return { instruments, history, users, retired };
  } catch (err) {
    throw new Error(`Ошибка загрузки данных из Supabase: ${err.message}`);
  }
}

export async function saveWorkbook(message = 'Сохранено') {
  console.log('[Supabase] Сохранение данных...');
  try {
    const { instruments, history, users, retired } = state;
    await upsertData('instruments', instruments, 'id');
    await upsertData('history', history, 'id');
    await upsertData('users', users, 'username');
    await upsertData('retired', retired, 'id');
    return message;
  } catch (err) {
    throw new Error(`Ошибка сохранения данных: ${err.message}`);
  }
}

async function upsertData(table, records, primaryKey) {
  if (!records || records.length === 0) return;
  for (const record of records) {
    const existing = await supabaseFetch(`${table}?${primaryKey}=eq.${record[primaryKey]}`);
    if (existing && existing.length > 0) {
      await supabaseFetch(`${table}?${primaryKey}=eq.${record[primaryKey]}`, {
        method: 'PATCH',
        body: JSON.stringify(record)
      });
    } else {
      await supabaseFetch(table, {
        method: 'POST',
        body: JSON.stringify(record)
      });
    }
  }
}