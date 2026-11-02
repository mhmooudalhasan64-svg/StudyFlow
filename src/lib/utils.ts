export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** مفتاح تاريخ محلي بصيغة YYYY-MM-DD */
export function toDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** عدد الأيام بين اليوم والتاريخ المعطى (سالب إن كان في الماضي) */
export function daysUntil(key: string, now: Date = new Date()): number {
  const t = parseDateKey(key);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** نص الوقت المتبقي mm:ss */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** 135 -> "2 س 15 د" */
export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} س ${r} د` : `${h} س`;
}

export function daysLabel(n: number): string {
  if (n < 0) return 'انتهى';
  if (n === 0) return 'اليوم';
  if (n === 1) return 'غداً';
  if (n === 2) return 'بعد يومين';
  if (n <= 10) return `بعد ${n} أيام`;
  return `بعد ${n} يوماً`;
}

const LOCALE = 'ar-u-nu-latn';

export function weekdayShort(key: string): string {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(parseDateKey(key));
}

export function dayNumber(key: string): string {
  return String(parseDateKey(key).getDate());
}

export function formatLongDate(key: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(key));
}

/** خلط فيشر-ييتس دون تعديل المصفوفة الأصلية */
export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));
