import type { Question, Subject } from '../db';

export interface ExportedQuestion {
  subject: string;
  text: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  unit?: string;
  year?: number;
  session?: string;
}

export function exportQuestions(
  questions: readonly Question[],
  subjects: readonly Subject[],
): string {
  const names = new Map(subjects.map((s) => [s.id, s.name]));
  const data: ExportedQuestion[] = questions.map((q) => ({
    subject: names.get(q.subjectId) ?? 'بدون مادة',
    text: q.text,
    options: q.options,
    answerIndex: q.answerIndex,
    ...(q.explanation ? { explanation: q.explanation } : {}),
    ...(q.unit ? { unit: q.unit } : {}),
    ...(q.year ? { year: q.year } : {}),
    ...(q.session ? { session: q.session } : {}),
  }));
  return JSON.stringify(data, null, 2);
}

/** يتحقق من ملف JSON مستورد ويرمي خطأ برسالة عربية إن كان غير صالح */
export function parseQuestions(json: string): ExportedQuestion[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('الملف ليس JSON صالحاً');
  }
  if (!Array.isArray(raw)) throw new Error('يجب أن يحتوي الملف على قائمة أسئلة');

  return raw.map((item, i) => {
    const n = i + 1;
    if (typeof item !== 'object' || item === null) throw new Error(`السؤال ${n}: صيغة غير صالحة`);
    const o = item as Record<string, unknown>;
    if (typeof o.subject !== 'string' || !o.subject.trim())
      throw new Error(`السؤال ${n}: المادة مفقودة`);
    if (typeof o.text !== 'string' || !o.text.trim())
      throw new Error(`السؤال ${n}: نص السؤال مفقود`);
    if (
      !Array.isArray(o.options) ||
      o.options.length < 2 ||
      !o.options.every((x) => typeof x === 'string' && x.trim())
    )
      throw new Error(`السؤال ${n}: يلزم خياران على الأقل`);
    const idx = o.answerIndex;
    if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= o.options.length)
      throw new Error(`السؤال ${n}: رقم الإجابة الصحيحة غير صالح`);
    return {
      subject: o.subject.trim(),
      text: o.text.trim(),
      options: (o.options as string[]).map((x) => x.trim()),
      answerIndex: idx,
      explanation: typeof o.explanation === 'string' && o.explanation.trim() ? o.explanation.trim() : undefined,
      unit: typeof o.unit === 'string' && o.unit.trim() ? o.unit.trim() : undefined,
      year: typeof o.year === 'number' && Number.isInteger(o.year) ? o.year : undefined,
      session: typeof o.session === 'string' && o.session.trim() ? o.session.trim() : undefined,
    };
  });
}

/**
 * يقرأ ردّ نموذج ذكاء اصطناعي (مصفوفة JSON قد يحيط بها نص أو علامات ```)،
 * ويعيد الأسئلة الصالحة فقط بأربعة خيارات تماماً، ويسندها إلى المادة المعطاة.
 */
export function parseGeneratedQuiz(raw: string, subject: string, unit?: string): ExportedQuestion[] {
  const fail = () => new Error('لم يُنتج المساعد اختباراً صالحاً، أعد المحاولة.');
  const s = raw.replace(/```(?:json)?/gi, '').trim();
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  if (a < 0 || b <= a) throw fail();

  let arr: unknown;
  try {
    arr = JSON.parse(s.slice(a, b + 1));
  } catch {
    throw fail();
  }
  if (!Array.isArray(arr)) throw fail();

  const good: ExportedQuestion[] = [];
  for (const item of arr) {
    if (typeof item !== 'object' || item === null) continue;
    try {
      const [q] = parseQuestions(JSON.stringify([{ ...item, subject }]));
      if (q.options.length === 4 && new Set(q.options).size === 4) {
        good.push({ ...q, subject, unit: unit || q.unit });
      }
    } catch {
      /* نتجاهل السؤال غير الصالح ونكمل */
    }
  }
  if (good.length === 0) throw fail();
  return good;
}
