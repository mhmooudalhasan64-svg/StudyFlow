import { describe, expect, it } from 'vitest';
import type { Attempt, StudySession } from '../db';
import { accuracyBySubject, computeBadges, computeStreak, lastNDays, minutesByDay } from './stats';

const session = (dateKey: string, minutes: number, subjectId: number | null = 1): StudySession => ({
  id: 0,
  subjectId,
  startedAt: 0,
  minutes,
  dateKey,
});

describe('stats', () => {
  it('minutesByDay sums per day', () => {
    const out = minutesByDay([session('2026-11-01', 25), session('2026-11-01', 30), session('2026-11-02', 10)]);
    expect(out).toEqual({ '2026-11-01': 55, '2026-11-02': 10 });
  });

  it('lastNDays ends with today', () => {
    expect(lastNDays(3, '2026-11-02')).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('computeStreak counts consecutive days including today', () => {
    const m = { '2026-11-02': 10, '2026-11-01': 5, '2026-10-31': 20 };
    expect(computeStreak(m, '2026-11-02')).toBe(3);
  });

  it('computeStreak starts from yesterday when today is empty', () => {
    const m = { '2026-11-01': 5, '2026-10-31': 20 };
    expect(computeStreak(m, '2026-11-02')).toBe(2);
  });

  it('computeStreak breaks on a gap and is zero when idle', () => {
    expect(computeStreak({ '2026-11-02': 5, '2026-10-30': 5 }, '2026-11-02')).toBe(1);
    expect(computeStreak({}, '2026-11-02')).toBe(0);
  });

  it('accuracyBySubject', () => {
    const at = (subjectId: number, correct: boolean): Attempt => ({
      id: 0,
      questionId: 1,
      subjectId,
      correct,
      at: 0,
      dateKey: '2026-11-02',
    });
    const acc = accuracyBySubject([at(1, true), at(1, false), at(2, true)]);
    expect(acc.get(1)).toEqual({ total: 2, correct: 1 });
    expect(acc.get(2)).toEqual({ total: 1, correct: 1 });
  });

  it('computeBadges', () => {
    const badges = computeBadges({ totalMin: 700, streak: 3, answered: 10, correct: 5 });
    const earned = badges.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(['first', 'streak3', 'h10']);
  });
});
