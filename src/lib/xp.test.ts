import { describe, expect, it } from 'vitest';
import { computeXp, levelFromXp, xpForLevel } from './xp';

describe('xp and levels', () => {
  it('computeXp applies the rules', () => {
    expect(
      computeXp({ minutes: 10, correct: 5, wrong: 2, lessonsDone: 1, examResults: 1, cardReviews: 2 }),
    ).toBe(10 + 10 + 2 + 20 + 25 + 6);
    expect(computeXp({ minutes: 0, correct: 0, wrong: 0, lessonsDone: 0, examResults: 0, cardReviews: 0 })).toBe(0);
  });

  it('level thresholds are 0, 100, 300, 600', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 300, 600]);
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(299).level).toBe(2);
    expect(levelFromXp(300).level).toBe(3);
    expect(levelFromXp(5000).level).toBe(10);
  });

  it('progress is between 0 and 1 inside a level', () => {
    const l = levelFromXp(200);
    expect(l.level).toBe(2);
    expect(l.progress).toBeCloseTo(0.5);
    expect(l.floor).toBe(100);
    expect(l.ceil).toBe(300);
  });
});
