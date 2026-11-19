const digitsOnly = (value: string) => value.replace(/\D/g, '');

export function normalizeMoneyInput(value: string | number | null | undefined) {
  return digitsOnly(String(value ?? '')).replace(/^0+(?=\d)/, '');
}

export function formatMoneyInput(value: string | number | null | undefined) {
  const normalized = normalizeMoneyInput(value);
  return normalized ? new Intl.NumberFormat('vi-VN').format(Number(normalized)) : '';
}

export function maskDate(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function maskDateTime(value: string) {
  const digits = digitsOnly(value).slice(0, 12);
  const date = maskDate(digits.slice(0, 8));
  if (digits.length <= 8) return date;
  const time = digits.slice(8);
  return `${date} ${time.length <= 2 ? time : `${time.slice(0, 2)}:${time.slice(2)}`}`;
}

function validDateParts(day: number, month: number, year: number) {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseVietnameseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  if (!validDateParts(Number(day), Number(month), Number(year))) return null;
  return `${year}-${month}-${day}`;
}

export function parseVietnameseDateTime(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  if (!validDateParts(Number(day), Number(month), Number(year)) || Number(hour) > 23 || Number(minute) > 59) return null;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
