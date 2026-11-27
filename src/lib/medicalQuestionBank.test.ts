import { beforeEach, describe, expect, it } from 'vitest';
import { db, type MedicalQuestion } from '../db';
import { filterMedicalQuestions, parseMedicalQuestions, recordMedicalAnswer } from './medicalQuestionBank';

const valid = {
  questions: [{
    vignette: 'حالة افتراضية تعليمية.',
    stem: 'أي بنية مسؤولة عن الوظيفة المذكورة؟',
    options: ['A', 'B', 'C', 'D'],
    answerIndex: 2,
    explanations: ['خطأ A', 'خطأ B', 'صحيح C', 'خطأ D'],
    rationale: 'شرح الاستدلال.',
    learningPoint: 'نقطة التعلم.',
    sourceQuote: 'اقتباس من المصدر',
  }],
};

describe('medical question bank parser', () => {
  it('parses a valid four-option question with all option explanations', () => {
    const result = parseMedicalQuestions(JSON.stringify(valid));
    expect(result).toHaveLength(1);
    expect(result[0].answerIndex).toBe(2);
    expect(result[0].explanations).toHaveLength(4);
  });

  it('rejects a question with fewer than four options or explanations', () => {
    const invalid = structuredClone(valid);
    invalid.questions[0].options.pop();
    expect(() => parseMedicalQuestions(JSON.stringify(invalid))).toThrow();
  });

  it('rejects an invalid answer index', () => {
    const invalid = structuredClone(valid);
    invalid.questions[0].answerIndex = 4;
    expect(() => parseMedicalQuestions(JSON.stringify(invalid))).toThrow();
  });

  it('rejects coerced answer indexes such as strings and booleans', () => {
    const stringIndex = structuredClone(valid);
    stringIndex.questions[0].answerIndex = '2' as unknown as number;
    const booleanIndex = structuredClone(valid);
    booleanIndex.questions[0].answerIndex = true as unknown as number;
    expect(() => parseMedicalQuestions(JSON.stringify(stringIndex))).toThrow();
    expect(() => parseMedicalQuestions(JSON.stringify(booleanIndex))).toThrow();
  });
});


describe('medical question history filters', () => {
  const questions = [
    { id: 1, attempts: 0, correctAttempts: 0 },
    { id: 2, attempts: 5, correctAttempts: 2 },
    { id: 3, attempts: 5, correctAttempts: 4 },
  ] as { id: number; attempts: number; correctAttempts: number }[];

  it('returns unanswered questions for the new filter', () => {
    expect(filterMedicalQuestions(questions, 'new').map((q) => q.id)).toEqual([1]);
  });

  it('returns only questions below 60% accuracy for review', () => {
    expect(filterMedicalQuestions(questions, 'weak').map((q) => q.id)).toEqual([2]);
  });

  it('returns the full bank for the all filter', () => {
    expect(filterMedicalQuestions(questions, 'all')).toHaveLength(3);
  });

  it('does not flag exactly 60% accuracy as needing review', () => {
    const boundary = [{ id: 4, attempts: 5, correctAttempts: 3 }];
    expect(filterMedicalQuestions(boundary, 'weak')).toHaveLength(0);
  });

  it('returns an empty list when no questions match a filter', () => {
    expect(filterMedicalQuestions([], 'new')).toEqual([]);
  });
});


describe('medical answer recording', () => {
  beforeEach(async () => {
    await db.medicalQuestions.clear();
  });

  it('increments attempts from the latest stored value, not a stale snapshot', async () => {
    const id = await db.medicalQuestions.add({
      questionKey: 'test|1', college: 'medicine', year: '1', subject: 'Anatomy',
      sourceName: 'Test', vignette: '', stem: 'Question?', options: ['A', 'B', 'C', 'D'],
      answerIndex: 1, explanations: ['a', 'b', 'c', 'd'], rationale: '',
      learningPoint: '', sourceQuote: '', createdAt: 1, attempts: 0,
      correctAttempts: 0, lastAttemptAt: null,
    });
    const staleQuestion = (await db.medicalQuestions.get(id)) as MedicalQuestion;
    await recordMedicalAnswer(staleQuestion, 1);
    await recordMedicalAnswer(staleQuestion, 1);
    const updated = await db.medicalQuestions.get(id);
    expect(updated?.attempts).toBe(2);
    expect(updated?.correctAttempts).toBe(2);
  });

  it('rejects invalid answers without changing the stored counters', async () => {
    const id = await db.medicalQuestions.add({
      questionKey: 'test|2', college: 'medicine', year: '1', subject: 'Anatomy',
      sourceName: 'Test', vignette: '', stem: 'Question?', options: ['A', 'B', 'C', 'D'],
      answerIndex: 1, explanations: ['a', 'b', 'c', 'd'], rationale: '',
      learningPoint: '', sourceQuote: '', createdAt: 1, attempts: 0,
      correctAttempts: 0, lastAttemptAt: null,
    });
    const question = (await db.medicalQuestions.get(id)) as MedicalQuestion;
    await expect(recordMedicalAnswer(question, 4)).rejects.toThrow();
    const unchanged = await db.medicalQuestions.get(id);
    expect(unchanged?.attempts).toBe(0);
  });

  it('requires exact source quotes when a lecture source is supplied', () => {
    const source = 'The myocardium contracts to pump blood.';
    const supported = structuredClone(valid);
    supported.questions[0].sourceQuote = 'myocardium contracts';
    expect(parseMedicalQuestions(JSON.stringify(supported), source)).toHaveLength(1);
    const unsupported = structuredClone(valid);
    unsupported.questions[0].sourceQuote = 'A claim absent from the lecture';
    expect(() => parseMedicalQuestions(JSON.stringify(unsupported), source)).toThrow();
  });

  it('rejects oversized model output and source text', () => {
    expect(() => parseMedicalQuestions(' '.repeat(100_001))).toThrow('حجم بيانات');
    expect(() => parseMedicalQuestions(JSON.stringify(valid), 'x'.repeat(8_001))).toThrow('حجم بيانات');
  });

  it('caps long generated question fields', () => {
    const large = structuredClone(valid);
    large.questions[0].vignette = 'v'.repeat(2_000);
    expect(parseMedicalQuestions(JSON.stringify(large))[0].vignette).toHaveLength(1_200);
  });
});
