import { describe, expect, it } from 'vitest';
import {
  addDays,
  clamp,
  daysLabel,
  daysUntil,
  formatClock,
  formatMinutes,
  shuffle,
  toDateKey,
} from './utils';

describe('utils', () => {
  it('toDateKey formats local dates', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 10, 2))).toBe('2026-11-02');
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('daysUntil counts calendar days', () => {
    const now = new Date(2026, 10, 2, 23, 30);
    expect(daysUntil('2026-11-02', now)).toBe(0);
    expect(daysUntil('2026-11-03', now)).toBe(1);
    expect(daysUntil('2026-11-01', now)).toBe(-1);
    expect(daysUntil('2026-12-02', now)).toBe(30);
  });

  it('formatClock pads and rounds up', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00');
    expect(formatClock(61_001)).toBe('01:02');
    expect(formatClock(-5)).toBe('00:00');
  });

  it('formatMinutes', () => {
    expect(formatMinutes(45)).toBe('45 د');
    expect(formatMinutes(60)).toBe('1 س');
    expect(formatMinutes(135)).toBe('2 س 15 د');
  });

  it('daysLabel', () => {
    expect(daysLabel(-1)).toBe('انتهى');
    expect(daysLabel(0)).toBe('اليوم');
    expect(daysLabel(1)).toBe('غداً');
    expect(daysLabel(2)).toBe('بعد يومين');
    expect(daysLabel(5)).toBe('بعد 5 أيام');
    expect(daysLabel(20)).toBe('بعد 20 يوماً');
  });

  it('shuffle keeps all items and does not mutate', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src);
    expect(out.slice().sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });

  it('clamp', () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
