import { state } from './state.js';
import { today } from './utils.js';

export function addHistoryEntry(item) {
  state.history.push({
    instrument_id: item.id,
    instrument_name: item.name,
    taken_by: item.taken_by,
    place: item.taken_where,
    extra_data: item.taken_extra || '',
    issue_date: item.taken_date || today(),
    return_date: '',
    returned_by: '',
    operation_date: today()
  });
}

export function closeHistoryEntry(item, returnedBy) {
  const entry = [...state.history].reverse().find((row) => String(row.instrument_id) === String(item.id) && !row.return_date);
  if (entry) {
    entry.return_date = today();
    entry.returned_by = returnedBy;
  }
}