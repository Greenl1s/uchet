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
  console.log(`[Supabase] ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    console.log(`[Supabase] -> статус ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.error('[Supabase] Тело ошибки:', text);
      throw new Error(`Supabase error (${response.status}): ${text}`);
    }

    if (response.status === 204 || response.status === 205) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (parseError) {
        const text = await response.text();
        console.warn('[Supabase] Невалидный JSON, возвращаем текст:', text);
        return text;
      }
    } else {
      const text = await response.text();
      console.warn('[Supabase] Ответ не JSON:', text);
      return text;
    }
  } catch (fetchError) {
    console.error('[Supabase] Ошибка сети:', fetchError);
    throw new Error(`Ошибка сети: ${fetchError.message}`);
  }
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
    return {
      instruments: Array.isArray(instruments) ? instruments : [],
      history: Array.isArray(history) ? history : [],
      users: Array.isArray(users) ? users : [],
      retired: Array.isArray(retired) ? retired : []
    };
  } catch (err) {
    throw new Error(`Ошибка загрузки данных из Supabase: ${err.message}`);
  }
}

export async function saveWorkbook(message = 'Сохранено') {
  console.log('[Supabase] Сохранение данных...');
  try {
    const { instruments, history, users, retired } = state;
    
    await upsertData('instruments', instruments, 'id');
    await upsertData('users', users, 'username');
    await upsertData('retired', retired, 'id');
    await replaceTable('history', history);
    
    console.log('[Supabase] Сохранение завершено успешно');
    return message;
  } catch (err) {
    console.error('[Supabase] Ошибка сохранения:', err);
    throw new Error(`Ошибка сохранения данных: ${err.message}`);
  }
}

async function upsertData(table, records, primaryKey) {
  if (!records || records.length === 0) {
    console.log(`[Supabase] ${table}: нет записей для сохранения`);
    return;
  }
  console.log(`[Supabase] ${table}: сохранение ${records.length} записей`);

  for (const record of records) {
    if (!record[primaryKey]) {
      console.warn(`[Supabase] Пропускаем запись без ${primaryKey}:`, record);
      continue;
    }

    try {
      const existing = await supabaseFetch(
        `${table}?${primaryKey}=eq.${encodeURIComponent(record[primaryKey])}`
      );

      if (existing && Array.isArray(existing) && existing.length > 0) {
        console.log(`[Supabase] Обновление ${table} ${primaryKey}=${record[primaryKey]}`);
        await supabaseFetch(`${table}?${primaryKey}=eq.${encodeURIComponent(record[primaryKey])}`, {
          method: 'PATCH',
          body: JSON.stringify(record)
        });
      } else {
        console.log(`[Supabase] Вставка новой записи в ${table}`);
        await supabaseFetch(table, {
          method: 'POST',
          body: JSON.stringify(record)
        });
      }
    } catch (err) {
      console.error(`[Supabase] Ошибка при обработке ${table} ${record[primaryKey]}:`, err);
      throw err;
    }
  }
}

async function replaceTable(table, records) {
  console.log(`[Supabase] Замена таблицы ${table} (${records.length} записей)`);
  try {
    // Используем условие id=gte.0, чтобы удалить все записи (так как id SERIAL всегда >=1)
    await supabaseFetch(`${table}?id=gte.0`, { method: 'DELETE' });
    if (records.length > 0) {
      // Убираем поле id, чтобы база генерировала новые значения
      const recordsToInsert = records.map(({ id, ...rest }) => rest);
      await supabaseFetch(table, {
        method: 'POST',
        body: JSON.stringify(recordsToInsert)
      });
    }
  } catch (err) {
    console.error(`[Supabase] Ошибка замены таблицы ${table}:`, err);
    throw err;
  }
}
