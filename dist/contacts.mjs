export const directoryFields = {
  clinics: ['name', 'city', 'address', 'contact', 'phone'],
  representatives: ['name', 'person', 'phone'],
};
export function validDirectory(value, kind) {
  if (value === undefined) return true;
  const fields = directoryFields[kind];
  return Array.isArray(value) && value.length <= 500 && value.every(row =>
    row && typeof row.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(row.id) &&
    fields.every(key => typeof row[key] === 'string' && row[key].length <= 300) &&
    row.name.trim() && (kind !== 'representatives' || row.person.trim())) &&
    new Set(value.map(row => row.id)).size === value.length;
}
export function migrateDirectories(state) {
  for (const kind of Object.keys(directoryFields)) {
    if (!validDirectory(state[kind], kind) || !state[kind]) state[kind] = [];
  }
  return state;
}
export function applyContact(state, kind, id, target = 'event') {
  const row = state[kind].find(row => row.id === id);
  if (!row) return false;
  if (kind === 'clinics') Object.assign(state.event, {clinicId: id, venue: row.name, city: row.city});
  else if (target === 'travel') Object.assign(state.travel, {representativeId: id, driver: row.name});
  else Object.assign(state.event, {representativeId: id, person: row.person});
  return true;
}
