import { describe, expect, it } from 'vitest';
import type { Mark } from '../db';
import { computeTotals, gradeLabel, planForTarget } from './calc';

const m = (subjectId: number, mark: number | null, max = 100): Mark => ({ subjectId, mark, max });

describe('grade calculator', () => {
  it('computes totals over entered subjects only', () => {
    const t = computeTotals([m(1, 80), m(2, 60), m(3, null)]);
    expect(t.earned).toBe(140);
    expect(t.maxEntered).toBe(200);
    expect(t.maxAll).toBe(300);
    expect(t.entered).toBe(2);
    expect(t.percentEntered).toBe(70);
  });

  it('clamps marks above the maximum and handles no entries', () => {
    expect(computeTotals([m(1, 150)]).earned).toBe(100);
    expect(computeTotals([m(1, null)]).percentEntered).toBeNull();
  });

  it('respects different maximums per subject', () => {
    const t = computeTotals([m(1, 300, 600), m(2, 100, 200)]);
    expect(t.earned).toBe(400);
    expect(t.maxAll).toBe(800);
  });

  it('plans the marks needed in the remaining subjects', () => {
    const plan = planForTarget([m(1, 80), m(2, null), m(3, null)], 90);
    // الهدف 270 من 300، لديه 80 -> يحتاج 190 من 200
    expect(plan.needed).toBe(190);
    expect(plan.remainingMax).toBe(200);
    expect(plan.remainingCount).toBe(2);
    expect(plan.neededPct).toBe(95);
    expect(plan.feasible).toBe(true);
    expect(plan.reached).toBe(false);
  });

  it('flags impossible and already-reached targets', () => {
    expect(planForTarget([m(1, 20), m(2, null)], 90).feasible).toBe(false);
    const reached = planForTarget([m(1, 100), m(2, 100)], 90);
    expect(reached.reached).toBe(true);
    expect(reached.needed).toBe(0);
  });

  it('gradeLabel thresholds', () => {
    expect(gradeLabel(95)).toBe('ممتاز');
    expect(gradeLabel(50)).toBe('ناجح');
    expect(gradeLabel(49.9)).toBe('دون النجاح');
  });
});
