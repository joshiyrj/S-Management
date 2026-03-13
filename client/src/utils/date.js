const pad = (value) => String(value).padStart(2, '0');

const buildLocalDate = (year, month, day) => {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);

  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || !Number.isInteger(parsedDay)) {
    return null;
  }

  const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== parsedYear ||
    date.getMonth() !== parsedMonth - 1 ||
    date.getDate() !== parsedDay
  ) {
    return null;
  }

  return date;
};

export const parseDisplayDate = (value = '') => {
  const match = String(value).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return buildLocalDate(year, month, day);
};

export const normalizeDateInput = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const isValidDisplayDate = (value = '') => {
  return Boolean(parseDisplayDate(value));
};

export const toIsoDateString = (value = '') => {
  const match = String(value).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';

  const [, day, month, year] = match;
  const date = buildLocalDate(year, month, day);
  if (!date) return '';

  return `${year}-${month}-${day}`;
};

export const formatDateDDMMYYYY = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && isValidDisplayDate(value)) return value;

  if (typeof value === 'string') {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = buildLocalDate(year, month, day);
      if (date) return `${day}/${month}/${year}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};
