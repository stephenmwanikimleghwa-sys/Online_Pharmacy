export const normalizeDisplayValue = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => normalizeDisplayValue(item, '')).join(', ');
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};
