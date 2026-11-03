import { describe, expect, it } from 'vitest';
import type { Attempt, ExamResult, Lesson, StudySession } from '../db';
import { buildReport, reportToText } from './report';

const session = (dateKey: string, minutes: number, subjectId: number | null = 1): StudySession => ({
  id: 0,
  subjectId,
  startedAt: 0,
  minutes,
  dateKey,
});
const attempt = (dateKey: string, correct: boolean): Attempt => ({
  id: 0,
  questionId: 1,
  subjectId: 1,
  correct,
  at: 0,
  dateKey,
});
const lesson = (doneAt: string | null): Lesson => ({
  id: 0,
  subjectId: 1,
  unit: '',
  title: 'x',
  done: doneAt !== null,
  doneAt,
  step: 0,
  nextReview: null,
});
const result = (dateKey: string, score: number, total: number): ExamResult => ({
  id: 0,
  kind: 'simulator',
  subjectId: 1,
  score,
  total,
  at: 0,
  dateKey,
  seconds: 60,
});

describe('weekly report', () => {
  const data = {
    sessions: [session('2026-11-02', 30), session('2026-11-02', 20, 2), session('2026-10-20', 99)],
    attempts: [attempt('2026-11-01', true), attempt('2026-11-01', false), attempt('2026-10-01', true)],
    lessons: [lesson('2026-11-02'), lesson('2026-09-01'), lesson(null)],
    results: [result('2026-11-02', 8, 10), result('2026-10-01', 1, 10)],
  };

  it('only counts the last 7 days', () => {
    const r = buildReport(data, '2026-11-02');
    expect(r.days).toHaveLength(7);
    expect(r.totalMin).toBe(50);
    expect(r.sessionCount).toBe(2);
    expect(r.activeDays).toBe(1);
    expect(r.avgPerActiveDay).toBe(50);
    expect(r.answered).toBe(2);
    expect(r.correct).toBe(1);
    expect(r.lessonsDone).toBe(1);
    expect(r.results).toHaveLength(1);
  });

  it('groups minutes by subject, largest first', () => {
    const r = buildReport(data, '2026-11-02');
    expect(r.bySubject).toEqual([
      { subjectId: 1, minutes: 30 },
      { subjectId: 2, minutes: 20 },
    ]);
  });

  it('an earlier window excludes recent data', () => {
    const r = buildReport(data, '2026-10-10');
    expect(r.totalMin).toBe(0);
    expect(r.results).toHaveLength(0);
  });

  it('reportToText mentions key figures', () => {
    const text = reportToText(buildReport(data, '2026-11-02'), (id) => `مادة${id}`);
    expect(text).toContain('50');
    expect(text).toContain('8/10');
    expect(text).toContain('مادة1');
  });
});
