import type { Mark } from '../db';
import { clamp } from './utils';

export const DEFAULT_MAX = 100;

export interface Totals {
  /** مجموع العلامات المُدخلة */
  earned: number;
  /** مجموع العلامات العظمى للمواد المُدخلة */
  maxEntered: number;
  /** مجموع العلامات العظمى لكل المواد */
  maxAll: number;
  /** عدد المواد المُدخلة / الكلي */
  entered: number;
  count: number;
  /** نسبة المواد المُدخلة (null إن لم تُدخل أي مادة) */
  percentEntered: number | null;
}

export function computeTotals(marks: readonly Mark[]): Totals {
  let earned = 0;
  let maxEntered = 0;
  let maxAll = 0;
  let entered = 0;
  for (const m of marks) {
    maxAll += m.max;
    if (m.mark !== null) {
      earned += clamp(m.mark, 0, m.max);
      maxEntered += m.max;
      entered += 1;
    }
  }
  return {
    earned,
    maxEntered,
    maxAll,
    entered,
    count: marks.length,
    percentEntered: maxEntered > 0 ? (earned / maxEntered) * 100 : null,
  };
}

export interface TargetPlan {
  /** المطلوب جمعه من العلامات في المواد المتبقية */
  needed: number;
  remainingMax: number;
  remainingCount: number;
  /** النسبة المطلوبة في المواد المتبقية (null إن لم يبقَ شيء) */
  neededPct: number | null;
  reached: boolean;
  feasible: boolean;
}

/** كم يلزم في المواد المتبقية للوصول إلى نسبة مستهدفة من المجموع الكلي */
export function planForTarget(marks: readonly Mark[], targetPct: number): TargetPlan {
  const t = computeTotals(marks);
  const targetMarks = (clamp(targetPct, 0, 100) / 100) * t.maxAll;
  const needed = targetMarks - t.earned;
  const remainingMax = t.maxAll - t.maxEntered;
  const reached = needed <= 0;
  return {
    needed: Math.max(0, needed),
    remainingMax,
    remainingCount: t.count - t.entered,
    neededPct: remainingMax > 0 ? (Math.max(0, needed) / remainingMax) * 100 : null,
    reached,
    feasible: reached || needed <= remainingMax,
  };
}

export function gradeLabel(pct: number): string {
  if (pct >= 90) return 'ممتاز';
  if (pct >= 80) return 'جيد جداً';
  if (pct >= 70) return 'جيد';
  if (pct >= 60) return 'مقبول';
  if (pct >= 50) return 'ناجح';
  return 'دون النجاح';
}

export const round1 = (n: number): number => Math.round(n * 10) / 10;
