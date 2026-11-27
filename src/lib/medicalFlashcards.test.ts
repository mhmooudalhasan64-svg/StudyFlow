import { describe, expect, it } from 'vitest';
import { buildMedicalFlashcards, scheduleMedicalReview } from './medicalFlashcards';

describe('medical flashcards', () => {
  it('builds cards from terminology and high-yield facts', () => {
    const cards = buildMedicalFlashcards({
      college: 'medicine', year: '2', subject: 'Physiology', sourceName: 'Lecture 1', now: 1000,
      analysis: {
        terminology: [{ term: 'Cardiomegaly', meaning: 'تضخم القلب', prefix: 'cardio', root: 'megaly', suffix: '' }],
        highYield: [{ fact: 'النقطة الأساسية', why: 'سبب الأهمية' }],
      },
    });
    expect(cards).toHaveLength(2);
    expect(cards[0].dueAt).toBe(1000);
    expect(cards[0].front).toContain('Cardiomegaly');
  });

  it('does not retain labelled personal details in source metadata or deduplication keys', () => {
    const cards = buildMedicalFlashcards({
      college: 'medicine', year: '1', subject: 'Anatomy',
      sourceName: 'Patient name: Jane Doe.pdf', now: 1,
      analysis: { terminology: [{ term: 'Neuro', meaning: 'متعلق بالأعصاب' }] },
    });
    expect(cards[0].sourceName).not.toContain('Jane Doe');
    expect(cards[0].cardKey).not.toContain('Jane Doe');
  });

  it('does not create duplicate card keys for the same source item', () => {
    const args = {
      college: 'medicine', year: '1', subject: 'Anatomy', sourceName: 'Lecture', now: 1,
      analysis: { terminology: [{ term: 'Neuro', meaning: 'متعلق بالأعصاب' }] },
    };
    expect(buildMedicalFlashcards(args)[0].cardKey).toBe(buildMedicalFlashcards(args)[0].cardKey);
  });

  it('schedules Good reviews progressively at 1, 3 and 7 days', () => {
    const day = 24 * 60 * 60 * 1000;
    const first = scheduleMedicalReview({ intervalDays: 0, reps: 0 }, 'good', 0);
    const second = scheduleMedicalReview({ intervalDays: first.intervalDays, reps: first.reps }, 'good', 0);
    const third = scheduleMedicalReview({ intervalDays: second.intervalDays, reps: second.reps }, 'good', 0);
    expect([first.intervalDays, second.intervalDays, third.intervalDays]).toEqual([1, 3, 7]);
    expect(first.dueAt).toBe(day);
  });

  it('resets the learning step after Again and extends Easy', () => {
    const again = scheduleMedicalReview({ intervalDays: 14, reps: 4 }, 'again', 50);
    const easy = scheduleMedicalReview({ intervalDays: 1, reps: 0 }, 'easy', 50);
    expect(again.intervalDays).toBe(1);
    expect(again.reps).toBe(0);
    expect(easy.intervalDays).toBe(3);
  });

  it('extends Hard reviews gradually without exceeding 90 days', () => {
    const hard = scheduleMedicalReview({ intervalDays: 7, reps: 3 }, 'hard', 0);
    const capped = scheduleMedicalReview({ intervalDays: 120, reps: 8 }, 'hard', 0);
    expect(hard.intervalDays).toBe(9);
    expect(hard.reps).toBe(3);
    expect(capped.intervalDays).toBe(90);
  });

  it('recovers safely from invalid saved scheduling values', () => {
    const result = scheduleMedicalReview({ intervalDays: Number.NaN, reps: -4 }, 'good', 0);
    expect(result.intervalDays).toBe(1);
    expect(result.reps).toBe(1);
    expect(Number.isFinite(result.dueAt)).toBe(true);
  });
});
