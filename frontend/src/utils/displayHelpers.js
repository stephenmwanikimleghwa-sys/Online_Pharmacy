import { format } from 'date-fns';

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

export const isValidDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date instanceof Date && !isNaN(date);
};

export const formatDate = (value, pattern = 'MMM dd, yyyy', fallback = 'N/A') => {
  const date = value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || isNaN(date)) return fallback;
  try {
    return format(date, pattern);
  } catch (error) {
    return fallback;
  }
};
