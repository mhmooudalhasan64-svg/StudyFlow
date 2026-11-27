import { describe, expect, it } from 'vitest';
import { getMedicalSimulationStats } from './medicalSimulationStats';

describe('medical simulation statistics', () => {
  it('calculates average, best, latest and practice-needed counts', () => {
    const stats = getMedicalSimulationStats([
      { score: 2, total: 4, completedAt: 100 },
      { score: 4, total: 4, completedAt: 200 },
      { score: 1, total: 4, completedAt: 300 },
    ]);
    expect(stats).toEqual({
      completed: 3,
      averagePercent: 58,
      bestPercent: 100,
      latestPercent: 25,
      needsPractice: 2,
    });
  });

  it('ignores malformed or impossible results', () => {
    const stats = getMedicalSimulationStats([
      { score: 5, total: 4, completedAt: 100 },
      { score: 1, total: 0, completedAt: 200 },
      { score: 2, total: 4, completedAt: 300 },
    ]);
    expect(stats.completed).toBe(1);
    expect(stats.latestPercent).toBe(50);
  });

  it('returns safe zero values for an empty history', () => {
    expect(getMedicalSimulationStats([])).toEqual({
      completed: 0,
      averagePercent: 0,
      bestPercent: 0,
      latestPercent: 0,
      needsPractice: 0,
    });
  });
});
