import { db, type MedicalQuestion } from '../db';


export type MedicalQuestionHistoryFilter = 'all' | 'weak' | 'new';

export function filterMedicalQuestions<T extends Pick<MedicalQuestion, 'id' | 'attempts' | 'correctAttempts'>>(
  questions: T[],
  filter: MedicalQuestionHistoryFilter,
): T[] {
  if (filter === 'new') return questions.filter((question) => question.attempts === 0);
  if (filter === 'weak') return questions.filter((question) =>
    question.attempts > 0 && question.correctAttempts / question.attempts < 0.6);
  return questions;
}

export interface MedicalQuestionDraft {
  vignette: string;
  stem: string;
  options: string[];
  answerIndex: number;
  explanations: string[];
  rationale: string;
  learningPoint: string;
  sourceQuote: string;
}

export function parseMedicalQuestions(raw: string): MedicalQuestionDraft[] {
  const cleaned = raw.trim().replace(/^`{3}(?:json)?\s*/i, '').replace(/\s*`{3}$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('وصل رد غير منسق من دليل.');
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error('تعذّر قراءة بنك الأسئلة. أعد المحاولة.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('بنية بنك الأسئلة غير صالحة.');
  const list = (parsed as Record<string, unknown>).questions;
  if (!Array.isArray(list)) throw new Error('لم يتضمن الرد قائمة أسئلة.');
  const output: MedicalQuestionDraft[] = [];
  for (const value of list) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const q = value as Record<string, unknown>;
    const str = (v: unknown) => typeof v === 'string' ? v.trim() : '';
    const options = Array.isArray(q.options) ? q.options.filter((v): v is string => typeof v === 'string').map((v) => v.trim()) : [];
    const explanations = Array.isArray(q.explanations) ? q.explanations.filter((v): v is string => typeof v === 'string').map((v) => v.trim()) : [];
    const answerIndex = q.answerIndex;
    if (!str(q.stem) || options.length !== 4 || options.some((v) => !v) ||
        explanations.length !== 4 || explanations.some((v) => !v) ||
        typeof answerIndex !== 'number' || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) continue;
    output.push({
      vignette: str(q.vignette), stem: str(q.stem), options, answerIndex, explanations,
      rationale: str(q.rationale), learningPoint: str(q.learningPoint), sourceQuote: str(q.sourceQuote),
    });
  }
  if (!output.length) throw new Error('لم ينتج دليل أسئلة مكتملة بأربعة خيارات وتفسيرات لكل البدائل.');
  return output.slice(0, 10);
}

export async function saveMedicalQuestions(args: {
  drafts: MedicalQuestionDraft[];
  college: string;
  year: string;
  subject: string;
  sourceName: string;
}): Promise<number> {
  let added = 0;
  await db.transaction('rw', db.medicalQuestions, async () => {
    for (const draft of args.drafts) {
      const questionKey = [args.college, args.year, args.subject, draft.stem].join('|').toLocaleLowerCase();
      const exists = await db.medicalQuestions.where('questionKey').equals(questionKey).first();
      if (exists) continue;
      const record: Omit<MedicalQuestion, 'id'> = {
        questionKey, college: args.college, year: args.year, subject: args.subject,
        sourceName: args.sourceName, ...draft, createdAt: Date.now(),
        attempts: 0, correctAttempts: 0, lastAttemptAt: null,
      };
      await db.medicalQuestions.add(record);
      added += 1;
    }
  });
  return added;
}

export async function recordMedicalAnswer(question: MedicalQuestion, selectedIndex: number): Promise<boolean> {
  if (question.id == null || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
    throw new Error('محاولة الإجابة غير صالحة.');
  }
  const correct = selectedIndex === question.answerIndex;
  await db.transaction('rw', db.medicalQuestions, async () => {
    const current = await db.medicalQuestions.get(question.id!);
    if (!current) throw new Error('السؤال غير موجود في قاعدة البيانات المحلية.');
    await db.medicalQuestions.update(question.id!, {
      attempts: current.attempts + 1,
      correctAttempts: current.correctAttempts + (correct ? 1 : 0),
      lastAttemptAt: Date.now(),
    });
  });
  return correct;
}
