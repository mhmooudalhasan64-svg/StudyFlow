import { describe, expect, it } from 'vitest';
import { buildTodayFlow, computeReadiness } from './readiness';

const subjects = [
  { id: 1, name: 'الفيزياء', color: '#fff' },
  { id: 2, name: 'الكيمياء', color: '#fff' },
  { id: 3, name: 'الفلسفة', color: '#fff' },
];
const att = (subjectId: number, correct: boolean, i: number) => ({ id: i, questionId: i, subjectId, correct, at: 0, dateKey: '2026-11-01' });
const base = { subjects, exams: [], attempts: [], lessons: [], sessions: [], today: '2026-11-05' };

describe('readiness', () => {
  it('has no score without data', () => {
    const r = computeReadiness(base);
    expect(r.overall).toBeNull();
    expect(r.subjects.every((s) => s.score === null)).toBe(true);
  });

  it('combines accuracy, lessons and study time and ranks the weakest nearest exam first', () => {
    const attempts = [
      ...Array.from({ length: 10 }, (_, i) => att(1, i < 9, i)), // 90%
      ...Array.from({ length: 10 }, (_, i) => att(2, i < 3, 100 + i)), // 30%
    ];
    const lessons = [
      { id: 1, subjectId: 1, unit: '', title: 'أ', done: true, doneAt: null, step: 0, nextReview: null },
      { id: 2, subjectId: 1, unit: '', title: 'ب', done: true, doneAt: null, step: 0, nextReview: null },
    ];
    const sessions = [{ id: 1, subjectId: 1, startedAt: 0, minutes: 120, dateKey: '2026-11-03' }];
    const exams = [{ id: 1, title: 'كيمياء', subjectId: 2, date: '2026-11-12' }];
    const r = computeReadiness({ ...base, attempts, lessons, sessions, exams });
    const phys = r.subjects.find((s) => s.subjectId === 1)!;
    const chem = r.subjects.find((s) => s.subjectId === 2)!;
    expect(phys.score).toBe(95); // 0.9*.5 + 1*.3 + 1*.2
    expect(chem.score).toBe(21); // (0.3*.5 + 0*.2) / .7
    expect(r.subjects[0].subjectId).toBe(2);
    expect(chem.daysToExam).toBe(7);
    expect(chem.tip).toContain('أخطاءك');
    expect(r.subjects[2].score).toBeNull();
    expect(r.overall).not.toBeNull();
  });

  it('ignores accuracy until enough attempts exist', () => {
    const r = computeReadiness({ ...base, attempts: [att(3, true, 1), att(3, true, 2)] });
    expect(r.subjects.find((s) => s.subjectId === 3)!.accuracy).toBeNull();
  });
});

describe('buildTodayFlow', () => {
  it('lists only relevant steps and marks the finished ones', () => {
    const steps = buildTodayFlow({ dueReviews: 3, mistakes: 0, dailyAvailable: true, dailyDone: true, tasksOpen: 0, tasksTotal: 2, todayMin: 30, goalMin: 60 });
    expect(steps.map((s) => s.id)).toEqual(['review', 'daily', 'tasks', 'focus']);
    expect(steps.find((s) => s.id === 'daily')!.done).toBe(true);
    expect(steps.find((s) => s.id === 'tasks')!.done).toBe(true);
    expect(steps.find((s) => s.id === 'focus')!.done).toBe(false);
  });
  it('always offers the focus step', () => {
    const steps = buildTodayFlow({ dueReviews: 0, mistakes: 0, dailyAvailable: false, dailyDone: false, tasksOpen: 0, tasksTotal: 0, todayMin: 60, goalMin: 60 });
    expect(steps).toHaveLength(1);
    expect(steps[0].done).toBe(true);
  });
});
