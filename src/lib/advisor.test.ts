import { describe, expect, it } from 'vitest';
import type { Attempt, Exam, StudySession, Subject, Task } from '../db';
import { buildLearnerProfile, contextFrom, diffDays, generatePlan, getInsights, rescheduleOverdue, type AdvisorContext } from './advisor';

const subjects: Subject[] = [
  { id: 1, name: 'الفيزياء', color: '#fff' },
  { id: 2, name: 'الكيمياء', color: '#fff' },
  { id: 3, name: 'العربية', color: '#fff' },
];

const exam = (id: number, subjectId: number, date: string): Exam => ({ id, title: 'x', subjectId, date });
const session = (subjectId: number, dateKey: string, minutes = 30): StudySession => ({ id: 0, subjectId, startedAt: 0, minutes, dateKey });
const task = (date: string, subjectId: number, minutes: number, done = false): Task => ({ id: 0, title: 't', subjectId, date, minutes, done });

const base: AdvisorContext = {
  subjects,
  exams: [],
  tasks: [],
  sessions: [],
  attempts: [],
  goalMin: 120,
  today: '2026-11-02',
};

describe('advisor', () => {
  it('diffDays', () => {
    expect(diffDays('2026-11-02', '2026-11-05')).toBe(3);
    expect(diffDays('2026-11-02', '2026-11-01')).toBe(-1);
  });

  it('plan fills each day up to the daily goal', () => {
    const plan = generatePlan(base, 3);
    for (const d of ['2026-11-02', '2026-11-03', '2026-11-04']) {
      const total = plan.filter((p) => p.date === d).reduce((s, p) => s + p.minutes, 0);
      expect(total).toBeLessThanOrEqual(120);
      expect(total).toBeGreaterThanOrEqual(115);
    }
  });

  it('plan favours the subject with the nearest exam', () => {
    const ctx = { ...base, exams: [exam(1, 1, '2026-11-06'), exam(2, 2, '2026-12-20')] };
    const plan = generatePlan(ctx, 4);
    const sum = (id: number) => plan.filter((p) => p.subjectId === id).reduce((s, p) => s + p.minutes, 0);
    expect(sum(1)).toBeGreaterThan(sum(2));
    expect(sum(1)).toBeGreaterThan(sum(3));
    expect(plan.some((p) => p.subjectId === 1 && p.title.startsWith('مراجعة نهائية'))).toBe(true);
  });

  it('plan stops scheduling a subject after its exam day', () => {
    const ctx = { ...base, exams: [exam(1, 1, '2026-11-03')] };
    const plan = generatePlan(ctx, 5);
    expect(plan.filter((p) => p.subjectId === 1 && p.date > '2026-11-03')).toHaveLength(0);
  });

  it('plan respects existing tasks (no duplicates, reduced budget)', () => {
    const ctx = { ...base, tasks: [task('2026-11-02', 1, 120)] };
    const plan = generatePlan(ctx, 1);
    expect(plan).toHaveLength(0);

    const ctx2 = { ...base, tasks: [task('2026-11-02', 1, 60)] };
    const plan2 = generatePlan(ctx2, 1);
    expect(plan2.reduce((s, p) => s + p.minutes, 0)).toBeLessThanOrEqual(60);
    expect(plan2.some((p) => p.subjectId === 1)).toBe(false);
  });

  it('plan is empty with no subjects or a tiny goal', () => {
    expect(generatePlan({ ...base, subjects: [] })).toEqual([]);
    expect(generatePlan({ ...base, goalMin: 10 })).toEqual([]);
  });

  it('insights warn about neglected subjects and near exams', () => {
    const ctx = {
      ...base,
      exams: [exam(1, 1, '2026-11-05'), exam(2, 2, '2026-11-20')],
      sessions: [session(1, '2026-11-02')],
    };
    const ids = getInsights(ctx).map((i) => i.id);
    expect(ids).toContain('soon-1');
    expect(ids).toContain('neglect-2');
    expect(ids).not.toContain('neglect-1');
  });

  it('insights suggest adding exams when none exist', () => {
    expect(getInsights(base).map((i) => i.id)).toContain('no-exams');
  });

  it('insights report goal progress', () => {
    const done = getInsights({ ...base, sessions: [session(1, '2026-11-02', 130)] }).map((i) => i.id);
    expect(done).toContain('goal-done');
    expect(getInsights(base).map((i) => i.id)).toContain('goal-left');
  });

  it('insights count overdue tasks', () => {
    const ids = getInsights({ ...base, tasks: [task('2026-11-01', 1, 30)] }).map((i) => i.id);
    expect(ids).toContain('overdue');
  });

  const withId = (t: Task, id: number): Task => ({ ...t, id });

  it('rescheduleOverdue spreads overdue tasks over upcoming days within the goal', () => {
    const ctx = {
      ...base,
      tasks: [
        withId(task('2026-10-30', 1, 60), 1),
        withId(task('2026-10-31', 2, 60), 2),
        withId(task('2026-11-01', 3, 60), 3),
        withId(task('2026-11-02', 1, 60, true), 4),
      ],
    };
    const moves = rescheduleOverdue(ctx, 7);
    expect(moves).toHaveLength(3);
    expect(moves.map((m) => m.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-03']);
    expect(moves.every((m) => m.date >= ctx.today)).toBe(true);
  });

  it('rescheduleOverdue puts subjects with nearer exams first', () => {
    const ctx = {
      ...base,
      goalMin: 60,
      exams: [exam(1, 2, '2026-11-05')],
      tasks: [withId(task('2026-10-30', 1, 60), 1), withId(task('2026-10-31', 2, 60), 2)],
    };
    const moves = rescheduleOverdue(ctx, 3);
    expect(moves.find((m) => m.id === 2)?.date).toBe('2026-11-02');
    expect(moves.find((m) => m.id === 1)?.date).toBe('2026-11-03');
  });

  it('rescheduleOverdue never drops a task, even when days are full', () => {
    const ctx = {
      ...base,
      goalMin: 60,
      tasks: [1, 2, 3].map((i) => withId(task('2026-10-30', 1, 60), i)),
    };
    expect(rescheduleOverdue(ctx, 1)).toHaveLength(3);
    expect(rescheduleOverdue(base, 7)).toEqual([]);
  });

  it('buildLearnerProfile summarises branch, exams and accuracy without names', () => {
    const at = (subjectId: number, correct: boolean): Attempt => ({ id: 0, questionId: 1, subjectId, correct, at: 0, dateKey: '2026-11-01' });
    const attempts = [
      ...[true, true, false, false, false].map((c) => at(1, c)),
      ...[true, true, true, true, true].map((c) => at(2, c)),
    ];
    const text = buildLearnerProfile({
      ...base,
      branch: 'literary',
      grade: 11,
      exams: [exam(1, 1, '2026-11-12')],
      attempts,
    });
    expect(text).toContain('أدبي');
    expect(text).toContain('الفيزياء (40%)');
    expect(text).toContain('مواد قوية: الكيمياء');
    expect(buildLearnerProfile({ ...base, subjects: [] })).toBe('');
  });

  it('contextFrom maps the store shape to an advisor context', () => {
    const ctx = contextFrom(
      { subjects, exams: [], tasks: [], sessions: [], attempts: [], settings: { dailyGoalMin: 90, branch: 'scientific', grade: 12 } },
      '2026-11-02',
    );
    expect(ctx.goalMin).toBe(90);
    expect(ctx.branch).toBe('scientific');
    expect(ctx.today).toBe('2026-11-02');
  });
});
