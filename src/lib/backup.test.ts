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

  it('rejects invalid files with Arabic messages', () => {
    expect(() => parseBackup('not json')).toThrow('الملف ليس نسخة احتياطية صالحة');
    expect(() => parseBackup('{"app":"other"}')).toThrow('ليس نسخة احتياطية من StudyFlow');
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
