import { describe, expect, it } from 'vitest';
import type { Attempt, ExamResult, Question } from '../db';
import { mistakesPrompt, weakUnits, currentMistakes, dailyResult, mistakesBySubject, pickDaily, seededRandom } from './practice';

const q = (id: number, subjectId = 1): Question => ({ id, subjectId, text: `q${id}`, options: ['a', 'b', 'c', 'd'], answerIndex: 0 });
const at = (questionId: number, correct: boolean, t: number, dateKey = '2026-11-01', subjectId = 1): Attempt => ({
  id: 0,
  questionId,
  subjectId,
  correct,
  at: t,
  dateKey,
});

describe('practice', () => {
  it('currentMistakes: last answer decides, newest mistake first, unknown questions ignored', () => {
    const questions = [q(1), q(2), q(3)];
    const attempts = [at(1, false, 1), at(1, true, 5), at(2, false, 2), at(3, false, 3), at(9, false, 4)];
    expect(currentMistakes(attempts, questions).map((x) => x.id)).toEqual([3, 2]);
    expect(currentMistakes([], questions)).toEqual([]);
  });

  it('mistakesBySubject counts per subject', () => {
    const m = mistakesBySubject([q(1, 1), q(2, 1), q(3, 2)]);
    expect(m.get(1)).toBe(2);
    expect(m.get(2)).toBe(1);
  });

  it('seededRandom is deterministic and within [0,1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 20; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x < 1).toBe(true);
    }
  });

  it('pickDaily is stable for a date, unique, and favours earlier mistakes', () => {
    const questions = Array.from({ length: 10 }, (_, i) => q(i + 1));
    const prev = [at(1, false, 1), at(2, false, 2), at(3, false, 3)];
    const day = '2026-11-02';
    const a = pickDaily(questions, prev, day, 5);
    const b = pickDaily(questions, prev, day, 5);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(a).toHaveLength(5);
    expect(new Set(a.map((x) => x.id)).size).toBe(5);
    for (const id of [1, 2, 3]) expect(a.some((x) => x.id === id)).toBe(true);
  });

  it('pickDaily ignores attempts made today so the set stays fixed all day', () => {
    const questions = Array.from({ length: 10 }, (_, i) => q(i + 1));
    const day = '2026-11-02';
    const before = pickDaily(questions, [], day, 5).map((x) => x.id);
    const after = pickDaily(questions, [at(1, false, 9, day)], day, 5).map((x) => x.id);
    expect(after).toEqual(before);
    expect(pickDaily([], [], day)).toEqual([]);
  });

  it('dailyResult finds only the daily result of that date', () => {
    const r = (kind: ExamResult['kind'], dateKey: string): ExamResult => ({ id: 1, kind, subjectId: null, score: 3, total: 5, at: 0, dateKey, seconds: 10 });
    expect(dailyResult([r('quiz', '2026-11-02')], '2026-11-02')).toBeUndefined();
    expect(dailyResult([r('daily', '2026-11-01')], '2026-11-02')).toBeUndefined();
    expect(dailyResult([r('daily', '2026-11-02')], '2026-11-02')?.score).toBe(3);
  });

  it('pickDaily mixes subjects instead of one dominating', () => {
    const qs = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      subjectId: i < 8 ? 1 : i < 10 ? 2 : 3,
      text: 't' + i,
      options: ['a', 'b'],
      answerIndex: 0,
    }));
    const d = pickDaily(qs, [], '2026-11-05', 5);
    expect(d).toHaveLength(5);
    expect(new Set(d.map((q) => q.subjectId)).size).toBe(3);
  });

  it('weakUnits finds low-accuracy units with enough attempts, weakest first', () => {
    const q = (id: number, unit: string | undefined, subjectId = 1) => ({ id, subjectId, text: 'q' + id, options: ['a', 'b'], answerIndex: 0, unit });
    const qs = [q(1, 'الحركة'), q(2, 'الحركة'), q(3, 'القوى'), q(4, 'القوى'), q(5, undefined), q(6, 'الضوء')];
    const at = (questionId: number, correct: boolean, i: number) => ({ id: i, questionId, subjectId: 1, correct, at: i, dateKey: '2026-11-01' });
    const attempts = [
      at(1, false, 1), at(2, false, 2), at(1, true, 3), // الحركة: 1/3
      at(3, true, 4), at(4, true, 5), at(3, true, 6), // القوى: 3/3 (قوية)
      at(5, false, 7), at(5, false, 8), at(5, false, 9), // بلا وحدة: يُتجاهل
      at(6, false, 10), // الضوء: محاولة واحدة فقط
    ];
    const w = weakUnits(attempts, qs);
    expect(w).toHaveLength(1);
    expect(w[0].unit).toBe('الحركة');
    expect(w[0].questions.map((x) => x.id)).toEqual([1, 2]);
    expect(Math.round(w[0].accuracy * 100)).toBe(33);
  });

  it('mistakesPrompt lists at most 6 questions with the correct answer', () => {
    const qs = Array.from({ length: 8 }, (_, i) => ({ id: i, subjectId: 1, text: 'سؤال' + i, options: ['خطأ', 'صح'], answerIndex: 1 }));
    const p = mistakesPrompt(qs, () => 'الفيزياء');
    expect(p).toContain('6) [الفيزياء] سؤال5');
    expect(p).not.toContain('سؤال6');
    expect(p).toContain('الإجابة الصحيحة: صح');
  });
});
