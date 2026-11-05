import type { Attempt, ExamResult, Question } from '../db';
import { shuffle } from './utils';

/** الأسئلة التي كانت آخر إجابة عنها خاطئة (الأحدث خطأً أولاً). تخرج من الدفتر عند الإجابة عنها صحيحاً. */
export function currentMistakes(attempts: readonly Attempt[], questions: readonly Question[]): Question[] {
  const last = new Map<number, Attempt>();
  for (const a of attempts) {
    const prev = last.get(a.questionId);
    if (!prev || a.at >= prev.at) last.set(a.questionId, a);
  }
  const byId = new Map(questions.map((q) => [q.id, q]));
  return [...last.values()]
    .filter((a) => !a.correct && byId.has(a.questionId))
    .sort((a, b) => b.at - a.at)
    .map((a) => byId.get(a.questionId) as Question);
}

export function mistakesBySubject(mistakes: readonly Question[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const q of mistakes) out.set(q.subjectId, (out.get(q.subjectId) ?? 0) + 1);
  return out;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** مولّد أرقام عشوائية ثابت بحسب البذرة (mulberry32) */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * أسئلة تحدي اليوم: نفس الأسئلة طوال اليوم لنفس بنك الأسئلة.
 * نصفها تقريباً من أخطاء الأيام السابقة (إن وُجدت) والباقي عشوائي مبذور بالتاريخ.
 */
export function pickDaily(
  questions: readonly Question[],
  attempts: readonly Attempt[],
  dateKey: string,
  n = 5,
): Question[] {
  if (questions.length === 0) return [];
  const rand = seededRandom(hashString(dateKey));
  const mistakes = currentMistakes(
    attempts.filter((a) => a.dateKey < dateKey),
    questions,
  );

  const chosen: Question[] = [];
  const used = new Set<number>();
  for (const q of shuffle(mistakes, rand)) {
    if (chosen.length >= Math.ceil(n / 2)) break;
    chosen.push(q);
    used.add(q.id);
  }
  // نوزّع الباقي على المواد بالتناوب كي لا تطغى مادة واحدة على التحدي
  const groups = new Map<number | null, Question[]>();
  for (const q of shuffle(
    questions.filter((x) => !used.has(x.id)),
    rand,
  )) {
    const g = groups.get(q.subjectId);
    if (g) g.push(q);
    else groups.set(q.subjectId, [q]);
  }
  const lists = shuffle([...groups.values()], rand);
  for (let i = 0; chosen.length < n && lists.some((l) => l.length > i); i++) {
    for (const l of lists) {
      if (chosen.length >= n) break;
      if (l[i]) chosen.push(l[i]);
    }
  }
  return shuffle(chosen, rand);
}

/** نتيجة تحدي اليوم إن أُنجز */
export function dailyResult(results: readonly ExamResult[], today: string): ExamResult | undefined {
  return results.find((r) => r.kind === 'daily' && r.dateKey === today);
}

export interface WeakUnit {
  subjectId: number;
  unit: string;
  /** 0 إلى 1 */
  accuracy: number;
  attempts: number;
  questions: Question[];
}

/** الوحدات التي دقتك فيها أقل من 70% (بعد 3 محاولات على الأقل)، الأضعف أولاً */
export function weakUnits(attempts: readonly Attempt[], questions: readonly Question[], minAttempts = 3, limit = 3): WeakUnit[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const groups = new Map<string, { subjectId: number; unit: string; ok: number; n: number }>();
  for (const a of attempts) {
    const q = byId.get(a.questionId);
    const unit = q?.unit?.trim();
    if (!q || !unit) continue;
    const key = `${q.subjectId}|${unit}`;
    const g = groups.get(key) ?? { subjectId: q.subjectId, unit, ok: 0, n: 0 };
    g.n++;
    if (a.correct) g.ok++;
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.n >= minAttempts && g.ok / g.n < 0.7)
    .sort((a, b) => a.ok / a.n - b.ok / b.n || b.n - a.n)
    .slice(0, limit)
    .map((g) => ({
      subjectId: g.subjectId,
      unit: g.unit,
      accuracy: g.ok / g.n,
      attempts: g.n,
      questions: questions.filter((q) => q.subjectId === g.subjectId && q.unit?.trim() === g.unit),
    }));
}

/** طلب للمعلّم: تحليل نمط أخطائي (حتى 6 أسئلة) واقتراح خطة إصلاح قصيرة */
export function mistakesPrompt(mistakes: readonly Question[], subjectName: (id: number) => string): string {
  const list = mistakes
    .slice(0, 6)
    .map((q, i) => `${i + 1}) [${subjectName(q.subjectId)}] ${q.text}\nالإجابة الصحيحة: ${q.options[q.answerIndex]}`)
    .join('\n\n');
  return `هذه أسئلة أخطأت فيها مؤخراً. حلّل لي أنماط أخطائي (ما الذي أخلط فيه؟)، ثم اقترح خطة مراجعة قصيرة من 3 نقاط:\n\n${list}`;
}
