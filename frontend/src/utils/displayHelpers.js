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

export const getProductUnitLabel = (product, count = 2) => {
  if (!product) return count === 1 ? 'unit' : 'units';
  const raw = product.unit || product.dosage_form || '';
  const unit = String(raw).trim().toLowerCase();
  if (!unit || unit === 'other') return count === 1 ? 'unit' : 'units';

  const singular = unit.endsWith('s') ? unit.slice(0, -1) : unit;
  const plural = unit.endsWith('s') ? unit : `${singular}s`;
  return count === 1 ? singular : plural;
};
