import { db, type MedicalQuestion } from '../db';
import { assertMedicalDataWriteAllowed, getMedicalDataEpoch } from './medicalDataPrivacy';


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

export function parseMedicalQuestions(raw: string, sourceText = ''): MedicalQuestionDraft[] {
  if (typeof raw !== 'string' || raw.length > 100_000 || typeof sourceText !== 'string' || sourceText.length > 8_000) {
    throw new Error('حجم بيانات بنك الأسئلة غير صالح. قلّل حجم المصدر وأعد المحاولة.');
  }
  const cleaned = raw.trim().replace(/^`{3}(?:json)?\s*/i, '').replace(/\s*`{3}$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('وصل رد غير منسق من دليل.');
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error('تعذّرت قراءة بنك الأسئلة. أعد المحاولة.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('بنية بنك الأسئلة غير صالحة.');
  const list = (parsed as Record<string, unknown>).questions;
  if (!Array.isArray(list)) throw new Error('لم يتضمن الرد قائمة أسئلة.');
  const output: MedicalQuestionDraft[] = [];
  for (const value of list.slice(0, 20)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const q = value as Record<string, unknown>;
    const str = (v: unknown, max = 800) => typeof v === 'string' ? v.trim().slice(0, max) : '';
    const vignette = str(q.vignette, 1200);
    const stem = str(q.stem, 800);
    const options = Array.isArray(q.options) ? q.options.slice(0, 5).filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, 500)) : [];
    const explanations = Array.isArray(q.explanations) ? q.explanations.slice(0, 5).filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, 700)) : [];
    const rationale = str(q.rationale, 1200);
    const learningPoint = str(q.learningPoint, 500);
    const answerIndex = q.answerIndex;
    const sourceQuote = str(q.sourceQuote, 500);
    if ((sourceText && (!sourceQuote || !sourceText.includes(sourceQuote))) ||
        !vignette || !stem || options.length !== 4 || options.some((v) => !v) ||
        new Set(options.map((option) => option.toLocaleLowerCase())).size !== 4 ||
        explanations.length !== 4 || explanations.some((v) => !v) ||
        !rationale || !learningPoint ||
        typeof answerIndex !== 'number' || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) continue;
    output.push({
      vignette, stem, options, answerIndex, explanations, rationale, learningPoint, sourceQuote,
    });
  }
  if (!output.length) throw new Error('لم ينتج دليل أسئلة مكتملة بأربعة خيارات مختلفة وتفسيرات لكل البدائل وشرح ونقطة تعلم.');
  return output.slice(0, 10);
}

export async function saveMedicalQuestions(args: {
  drafts: MedicalQuestionDraft[];
  college: string;
  year: string;
  subject: string;
  sourceName: string;
}): Promise<number> {
  const epoch = getMedicalDataEpoch();
  assertMedicalDataWriteAllowed(epoch);
  let added = 0;
  await db.transaction('rw', db.medicalQuestions, async () => {
    assertMedicalDataWriteAllowed(epoch);
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
  const epoch = getMedicalDataEpoch();
  assertMedicalDataWriteAllowed(epoch);
  const correct = selectedIndex === question.answerIndex;
  await db.transaction('rw', db.medicalQuestions, async () => {
    assertMedicalDataWriteAllowed(epoch);
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
