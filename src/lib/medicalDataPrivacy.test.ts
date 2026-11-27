import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { clearMedicalData, getMedicalDataEpoch, isMedicalDataClearing } from './medicalDataPrivacy';

describe('clear local medical data', () => {
  beforeEach(async () => {
    await Promise.all([
      db.medicalCards.clear(),
      db.medicalQuestions.clear(),
      db.medicalSimulations.clear(),
      db.medicalAnalyses.clear(),
      db.tasks.clear(),
    ]);
  });

  it('invalidates pending work across the entire clear operation', async () => {
    const before = getMedicalDataEpoch();

    await clearMedicalData();

    expect(getMedicalDataEpoch()).toBe(before + 2);
    expect(isMedicalDataClearing()).toBe(false);
  });

  it('removes all four medical datasets atomically and preserves study data', async () => {
    await db.medicalCards.add({
      cardKey: 'card', college: 'Medicine', year: '1', subject: 'Anatomy',
      sourceName: 'lecture', category: 'term', front: 'Q', back: 'A',
      createdAt: 1, dueAt: 1, intervalDays: 1, reps: 0, lastReviewedAt: null,
    });
    await db.medicalQuestions.add({
      questionKey: 'question', college: 'Medicine', year: '1', subject: 'Anatomy',
      sourceName: 'lecture', vignette: '', stem: 'Question', options: ['A', 'B', 'C', 'D'],
      answerIndex: 0, explanations: ['a', 'b', 'c', 'd'], rationale: '',
      learningPoint: '', sourceQuote: '', createdAt: 1, attempts: 0, correctAttempts: 0,
      lastAttemptAt: null,
    });
    await db.medicalSimulations.add({
      caseTitle: 'Case', college: 'Medicine', year: '1', subject: 'Anatomy',
      score: 1, total: 4, createdAt: 1, completedAt: 1,
    });
    await db.medicalAnalyses.add({
      college: 'Medicine', year: '1', subject: 'Anatomy', sourceName: 'lecture',
      analysis: { summary: 'Summary' }, createdAt: 1,
    });
    await db.tasks.add({ id: 1, title: 'Study task', subjectId: null, date: '2026-11-27', minutes: 20, done: false });

    await clearMedicalData();

    expect(await db.medicalCards.count()).toBe(0);
    expect(await db.medicalQuestions.count()).toBe(0);
    expect(await db.medicalSimulations.count()).toBe(0);
    expect(await db.medicalAnalyses.count()).toBe(0);
    expect(await db.tasks.count()).toBe(1);
  });
});
