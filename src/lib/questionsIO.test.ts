import { describe, expect, it } from 'vitest';
import { exportQuestions, parseQuestions } from './questionsIO';

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
});
