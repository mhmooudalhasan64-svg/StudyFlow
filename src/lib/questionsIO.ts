import type { Question, Subject } from '../db';

export interface ExportedQuestion {
  subject: string;
  text: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
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
    };
  });
}
