import type { MedicalSimulationResult } from '../db';

export interface MedicalSimulationStats {
  completed: number;
  averagePercent: number;
  bestPercent: number;
  latestPercent: number;
  needsPractice: number;
}

export function getMedicalSimulationStats(
  history: Pick<MedicalSimulationResult, 'score' | 'total' | 'completedAt'>[],
): MedicalSimulationStats {
  const valid = history.filter((item) =>
    Number.isFinite(item.score) && Number.isFinite(item.total) &&
    item.total > 0 && item.score >= 0 && item.score <= item.total,
  );
  if (!valid.length) {
    return { completed: 0, averagePercent: 0, bestPercent: 0, latestPercent: 0, needsPractice: 0 };
  }
  const percentages = valid.map((item) => Math.round((item.score / item.total) * 100));
  const averagePercent = Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);
  const latest = valid.reduce((current, item) => item.completedAt > current.completedAt ? item : current);
  return {
    completed: valid.length,
    averagePercent,
    bestPercent: Math.max(...percentages),
    latestPercent: Math.round((latest.score / latest.total) * 100),
    needsPractice: percentages.filter((value) => value < 60).length,
  };
}
