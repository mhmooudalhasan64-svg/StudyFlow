import { describe, expect, it } from 'vitest';
import { filterMedicalQuestions, parseMedicalQuestions } from './medicalQuestionBank';

describe('medical question bank parser', () => {
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
});
