import { addDays } from './utils';

/** سلّم المراجعة الافتراضي بالأيام */
export const DEFAULT_INTERVALS = [1, 3, 7, 14, 30];

/** يتحقق من القائمة ويعيد الافتراضية إن كانت فارغة أو غير صالحة */
export function sanitizeIntervals(list: readonly number[] | undefined): number[] {
  const clean = (list ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 365);
  return clean.length > 0 ? [...clean] : [...DEFAULT_INTERVALS];
}

/** "1، 3، 7" أو "1,3,7" أو "1 3 7" -> [1,3,7]؛ يعيد null إن لم يوجد أي رقم صالح */
export function parseIntervals(text: string): number[] | null {
  const normalized = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const nums = normalized
    .split(/[\s,،;]+/)
    .filter(Boolean)
    .map(Number);
  if (nums.length === 0 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > 365)) return null;
  return nums;
}

/** موعد المراجعة لخطوة معيّنة، أو null إن انتهى السلّم */
export function scheduleNext(today: string, intervals: readonly number[], step: number): string | null {
  if (step < 0) step = 0;
  if (step >= intervals.length) return null;
  return addDays(today, intervals[step]);
}

/** الخطوة الجديدة بعد مراجعة: تذكّر -> التالية، نسيان -> من البداية */
export function nextStep(step: number, remembered: boolean): number {
  return remembered ? step + 1 : 0;
}

export function isDue(nextReview: string | null | undefined, today: string): boolean {
  return nextReview != null && nextReview <= today;
}

/** موعد بطاقة بعد مراجعتها: لا تُلغى أبداً، بعد انتهاء السلّم يتضاعف آخر فاصل */
export function cardDue(today: string, intervals: readonly number[], step: number): string {
  const last = intervals[intervals.length - 1] ?? 1;
  if (step >= intervals.length) return addDays(today, last * 2);
  return addDays(today, intervals[Math.max(0, step)]);
}
