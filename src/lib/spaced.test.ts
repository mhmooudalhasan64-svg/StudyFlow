import { describe, expect, it } from 'vitest';
import { cardDue, isDue, nextStep, parseIntervals, sanitizeIntervals, scheduleNext } from './spaced';

describe('spaced review', () => {
  it('scheduleNext follows the ladder and ends with null', () => {
    const ladder = [1, 3, 7];
    expect(scheduleNext('2026-11-02', ladder, 0)).toBe('2026-11-03');
    expect(scheduleNext('2026-11-02', ladder, 2)).toBe('2026-11-09');
    expect(scheduleNext('2026-11-02', ladder, 3)).toBeNull();
  });

  it('nextStep advances on success and resets on failure', () => {
    expect(nextStep(2, true)).toBe(3);
    expect(nextStep(4, false)).toBe(0);
  });

  it('isDue handles null and dates', () => {
    expect(isDue(null, '2026-11-02')).toBe(false);
    expect(isDue('2026-11-02', '2026-11-02')).toBe(true);
    expect(isDue('2026-11-03', '2026-11-02')).toBe(false);
  });

  it('parseIntervals accepts commas, Arabic commas and Arabic digits', () => {
    expect(parseIntervals('1، 3, 7')).toEqual([1, 3, 7]);
    expect(parseIntervals('١ ٣ ٧')).toEqual([1, 3, 7]);
    expect(parseIntervals('')).toBeNull();
    expect(parseIntervals('1, x')).toBeNull();
    expect(parseIntervals('0, 3')).toBeNull();
    expect(parseIntervals('1.5')).toBeNull();
  });

  it('sanitizeIntervals falls back to the default ladder', () => {
    expect(sanitizeIntervals([])).toEqual([1, 3, 7, 14, 30]);
    expect(sanitizeIntervals(undefined)).toEqual([1, 3, 7, 14, 30]);
    expect(sanitizeIntervals([2, 5])).toEqual([2, 5]);
  });

  it('cardDue doubles the last interval after the ladder', () => {
    expect(cardDue('2026-11-02', [1, 3], 1)).toBe('2026-11-05');
    expect(cardDue('2026-11-02', [1, 3], 2)).toBe('2026-11-08');
  });
});
