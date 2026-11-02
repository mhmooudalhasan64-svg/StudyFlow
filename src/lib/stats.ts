import type { Attempt, StudySession } from '../db';
import { addDays, toDateKey } from './utils';

/** مجموع دقائق الدراسة لكل يوم */
export function minutesByDay(sessions: readonly StudySession[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) out[s.dateKey] = (out[s.dateKey] ?? 0) + s.minutes;
  return out;
}

/** آخر n يوماً من الأقدم إلى الأحدث (اليوم آخرها) */
export function lastNDays(n: number, today: string = toDateKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

/** عدد الأيام المتتالية التي تمت فيها الدراسة. إن لم يدرس اليوم بعد يُحسب من أمس. */
export function computeStreak(
  minutes: Record<string, number>,
  today: string = toDateKey(),
): number {
  let key = today;
  if (!((minutes[key] ?? 0) > 0)) key = addDays(key, -1);
  let streak = 0;
  while ((minutes[key] ?? 0) > 0) {
    streak++;
    key = addDays(key, -1);
  }
  return streak;
}

export function minutesBySubject(
  sessions: readonly StudySession[],
): Map<number | null, number> {
  const out = new Map<number | null, number>();
  for (const s of sessions) out.set(s.subjectId, (out.get(s.subjectId) ?? 0) + s.minutes);
  return out;
}

export interface Accuracy {
  total: number;
  correct: number;
}

export function accuracyBySubject(attempts: readonly Attempt[]): Map<number, Accuracy> {
  const out = new Map<number, Accuracy>();
  for (const a of attempts) {
    const cur = out.get(a.subjectId) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    out.set(a.subjectId, cur);
  }
  return out;
}

export interface Badge {
  id: string;
  title: string;
  desc: string;
  earned: boolean;
}

export function computeBadges(input: {
  totalMin: number;
  streak: number;
  answered: number;
  correct: number;
}): Badge[] {
  const { totalMin, streak, answered, correct } = input;
  return [
    { id: 'first', title: 'البداية', desc: 'أكمل أول جلسة دراسة', earned: totalMin > 0 },
    { id: 'streak3', title: 'ثلاثة أيام', desc: 'ادرس 3 أيام متتالية', earned: streak >= 3 },
    { id: 'streak7', title: 'أسبوع كامل', desc: 'ادرس 7 أيام متتالية', earned: streak >= 7 },
    { id: 'streak30', title: 'شهر من الالتزام', desc: 'ادرس 30 يوماً متتالياً', earned: streak >= 30 },
    { id: 'h10', title: '10 ساعات', desc: 'اجمع 10 ساعات من الدراسة', earned: totalMin >= 600 },
    { id: 'h50', title: '50 ساعة', desc: 'اجمع 50 ساعة من الدراسة', earned: totalMin >= 3000 },
    { id: 'q50', title: 'مجتهد الأسئلة', desc: 'أجب عن 50 سؤالاً', earned: answered >= 50 },
    { id: 'q100c', title: 'دقّة عالية', desc: '100 إجابة صحيحة', earned: correct >= 100 },
  ];
}
