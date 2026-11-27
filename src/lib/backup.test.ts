import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { useApp } from '../store';
import { exportBackup, importBackup, parseBackup } from './backup';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useApp.setState({ ready: false });
  await useApp.getState().init();
});

describe('backup', () => {
  it('round-trips data through export and import', async () => {
    await useApp.getState().addTask({ title: 'مهمة', subjectId: null, date: '2026-11-02', minutes: 20 });
    await useApp.getState().addCard({ subjectId: null, category: 'term', front: 'س', back: 'ج' });
    const json = await exportBackup();

    await useApp.getState().resetAll();
    expect(useApp.getState().tasks).toHaveLength(0);

    await useApp.getState().importBackupText(json);
    expect(useApp.getState().tasks.map((t) => t.title)).toEqual(['مهمة']);
    expect(useApp.getState().cards).toHaveLength(1);
    expect(useApp.getState().subjects.length).toBeGreaterThan(0);
  });

  it('keeps MASAR MEDICAL records out of backups and preserves them on restore', async () => {
    await db.medicalCards.add({
      cardKey: 'medical-card-private', college: 'Medicine', year: '1', subject: 'Anatomy',
      sourceName: 'medical-card-private.pdf', category: 'term', front: 'Card question', back: 'Card answer',
      createdAt: 1, dueAt: 1, intervalDays: 0, reps: 0, lastReviewedAt: null,
    });
    await db.medicalQuestions.add({
      questionKey: 'medical-question-private', college: 'Medicine', year: '1', subject: 'Anatomy',
      sourceName: 'medical-question-private.pdf', vignette: 'Fictional vignette', stem: 'Question?',
      options: ['A', 'B', 'C', 'D'], answerIndex: 0, explanations: ['a', 'b', 'c', 'd'],
      rationale: 'Rationale', learningPoint: 'Learning point', sourceQuote: '',
      createdAt: 1, attempts: 0, correctAttempts: 0, lastAttemptAt: null,
    });
    await db.medicalSimulations.add({
      caseTitle: 'medical-simulation-private', college: 'Medicine', year: '1', subject: 'Anatomy',
      score: 1, total: 4, createdAt: 1, completedAt: 1,
    });
    await db.medicalAnalyses.add({
      college: 'Medicine', year: '1', subject: 'Anatomy', sourceName: 'lecture.pdf',
      analysis: { summary: 'private medical study data' }, createdAt: 1,
    });
    const backup = await exportBackup();
    expect(backup).not.toContain('private medical study data');

    const parsed = parseBackup(backup);
    await importBackup(parsed);
    expect(await db.medicalCards.count()).toBe(1);
    expect(await db.medicalQuestions.count()).toBe(1);
    expect(await db.medicalSimulations.count()).toBe(1);
    expect(await db.medicalAnalyses.count()).toBe(1);
    expect((await db.medicalAnalyses.toArray())[0].analysis.summary).toBe('private medical study data');
  });

  it('rejects invalid files with Arabic messages', () => {
    expect(() => parseBackup('not json')).toThrow('الملف ليس نسخة احتياطية صالحة');
    expect(() => parseBackup('{"app":"other"}')).toThrow('ليس نسخة احتياطية من MASAR');
    expect(() =>
      parseBackup(JSON.stringify({ app: 'studyflow', version: 1, exportedAt: 0, tables: {} })),
    ).toThrow('النسخة ناقصة');
  });

  it('importBackup replaces existing rows', async () => {
    const file = parseBackup(await exportBackup());
    await useApp.getState().addTask({ title: 'جديدة', subjectId: null, date: '2026-11-02', minutes: 5 });
    await importBackup(file);
    expect(await db.tasks.count()).toBe(0);
  });
});
