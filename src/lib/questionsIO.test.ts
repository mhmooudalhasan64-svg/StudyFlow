import { describe, expect, it } from 'vitest';
import { exportQuestions, parseGeneratedQuiz, parseQuestions } from './questionsIO';

const valid = {
  subject: 'الفيزياء',
  text: 'سؤال؟',
  options: ['أ', 'ب'],
  answerIndex: 1,
};

describe('questionsIO', () => {
  it('parses a valid list', () => {
    const out = parseQuestions(JSON.stringify([valid]));
    expect(out).toHaveLength(1);
    expect(out[0].answerIndex).toBe(1);
  });

  it('rejects invalid JSON and non-arrays', () => {
    expect(() => parseQuestions('{')).toThrow('JSON');
    expect(() => parseQuestions('{}')).toThrow('قائمة');
  });

  it('rejects out-of-range answer index', () => {
    expect(() => parseQuestions(JSON.stringify([{ ...valid, answerIndex: 2 }]))).toThrow('الإجابة');
  });

  it('rejects too few options and missing subject', () => {
    expect(() => parseQuestions(JSON.stringify([{ ...valid, options: ['أ'] }]))).toThrow('خياران');
    expect(() => parseQuestions(JSON.stringify([{ ...valid, subject: '' }]))).toThrow('المادة');
  });

  it('round-trips through export', () => {
    const json = exportQuestions(
      [{ id: 1, subjectId: 7, text: 'س', options: ['1', '2'], answerIndex: 0 }],
      [{ id: 7, name: 'الكيمياء', color: '#fff' }],
    );
    const back = parseQuestions(json);
    expect(back[0]).toMatchObject({ subject: 'الكيمياء', text: 'س', answerIndex: 0 });
  });

  it('parseGeneratedQuiz keeps only valid 4-option questions from noisy output', () => {
    const raw =
      'هذه الأسئلة:\n```json\n' +
      JSON.stringify([
        { text: 'س1', options: ['أ', 'ب', 'ج', 'د'], answerIndex: 2, explanation: 'ش' },
        { text: 'س2', options: ['أ', 'ب'], answerIndex: 0 },
        { text: 'س3', options: ['أ', 'أ', 'ج', 'د'], answerIndex: 0 },
        { text: 'س4', options: ['أ', 'ب', 'ج', 'د'], answerIndex: 9 },
      ]) +
      '\n```';
    const out = parseGeneratedQuiz(raw, 'الرياضيات', 'الاشتقاق');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ subject: 'الرياضيات', unit: 'الاشتقاق', text: 'س1', answerIndex: 2 });
  });

  it('parseGeneratedQuiz rejects output with no valid question', () => {
    expect(() => parseGeneratedQuiz('لا يوجد شيء هنا', 'م')).toThrow('اختباراً');
    expect(() => parseGeneratedQuiz('[{"text":"x","options":["a","b"],"answerIndex":0}]', 'م')).toThrow('اختباراً');
  });
});
