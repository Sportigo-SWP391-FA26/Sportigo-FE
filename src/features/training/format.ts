// Ngày giờ hiển thị theo múi giờ trung tâm (NFR-24). Việt Nam không đổi giờ mùa hè nên luôn là UTC+7.
export const CENTER_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CENTER_UTC_OFFSET = '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CENTER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: CENTER_TIME_ZONE });

const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: CENTER_TIME_ZONE, weekday: 'long' });

function centerParts(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = Object.fromEntries(dateTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return parts as Record<'day' | 'month' | 'year' | 'hour' | 'minute', string>;
}

/** "2026-10-12T06:17:26Z" → "12/10/2026 13:17" */
export function formatDateTime(value: string) {
  const { day, month, year, hour, minute } = centerParts(value);
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/** Chuỗi ISO → "13:17" theo giờ trung tâm */
export function formatTime(value: string) {
  const { hour, minute } = centerParts(value);
  return `${hour}:${minute}`;
}

/** "2026-10-12" hoặc chuỗi ISO → "12/10/2026" */
export function formatDate(value: string) {
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const { day, month, year } = centerParts(value);
  return `${day}/${month}/${year}`;
}

/** "Thứ Hai" theo giờ trung tâm */
export function formatWeekday(value: string) {
  const date = DATE_ONLY.test(value) ? new Date(`${value}T12:00:00${CENTER_UTC_OFFSET}`) : new Date(value);
  const weekday = weekdayFormatter.format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

/** Ngày "YYYY-MM-DD" theo giờ trung tâm của một thời điểm */
export function toCenterDate(date: Date = new Date()) {
  return isoDateFormatter.format(date);
}

export function todayInCenter() {
  return toCenterDate(new Date());
}

/** Đầu ngày (00:00 giờ trung tâm) dưới dạng ISO UTC để gửi bộ lọc `from` */
export function startOfCenterDay(date: string) {
  return new Date(`${date}T00:00:00.000${CENTER_UTC_OFFSET}`).toISOString();
}

/** Cuối ngày (23:59:59.999 giờ trung tâm) dưới dạng ISO UTC để gửi bộ lọc `to` */
export function endOfCenterDay(date: string) {
  return new Date(`${date}T23:59:59.999${CENTER_UTC_OFFSET}`).toISOString();
}

function dateToUtc(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: string, days: number) {
  return new Date(dateToUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Số ngày từ `from` đến `to` (có thể âm) */
export function diffDays(from: string, to: string) {
  return Math.round((dateToUtc(to) - dateToUtc(from)) / DAY_MS);
}

/** Tuần bắt đầu từ Thứ Hai */
export function weekRange(date: string) {
  const weekday = new Date(dateToUtc(date)).getUTCDay();
  const monday = addDays(date, weekday === 0 ? -6 : 1 - weekday);
  return { from: monday, to: addDays(monday, 6) };
}

export function monthRange(date: string) {
  const [year, month] = date.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return { from: `${prefix}-01`, to: `${prefix}-${String(lastDay).padStart(2, '0')}` };
}

const numberFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatPercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`;
}

/** score có thể là chuỗi Decimal ("8.5") hoặc số */
export function toScore(score: string | number | null) {
  if (score === null || score === '') return null;
  const value = Number(score);
  return Number.isFinite(value) ? value : null;
}
