import type { Attempt, ExamResult, Lesson, StudySession } from '../db';
import { formatMinutes } from './utils';
import { lastNDays, minutesByDay } from './stats';

export interface WeeklyReport {
  from: string;
  to: string;
  days: string[];
  minutesPerDay: number[];
  totalMin: number;
  sessionCount: number;
  activeDays: number;
  avgPerActiveDay: number;
  bySubject: { subjectId: number | null; minutes: number }[];
  lessonsDone: number;
  answered: number;
  correct: number;
  results: ExamResult[];
}

export function buildReport(
  data: {
    sessions: readonly StudySession[];
    attempts: readonly Attempt[];
    lessons: readonly Lesson[];
    results: readonly ExamResult[];
  },
  endKey: string,
  length = 7,
): WeeklyReport {
  const days = lastNDays(length, endKey);
  const set = new Set(days);
  const sessions = data.sessions.filter((s) => set.has(s.dateKey));
  const perDay = minutesByDay(sessions);
  const minutesPerDay = days.map((d) => perDay[d] ?? 0);
  const totalMin = minutesPerDay.reduce((a, b) => a + b, 0);
  const activeDays = minutesPerDay.filter((m) => m > 0).length;

  const subj = new Map<number | null, number>();
  for (const s of sessions) subj.set(s.subjectId, (subj.get(s.subjectId) ?? 0) + s.minutes);

  const attempts = data.attempts.filter((a) => set.has(a.dateKey));

  return {
    from: days[0],
    to: days[days.length - 1],
    days,
    minutesPerDay,
    totalMin,
    sessionCount: sessions.length,
    activeDays,
    avgPerActiveDay: activeDays > 0 ? Math.round(totalMin / activeDays) : 0,
    bySubject: [...subj.entries()]
      .map(([subjectId, minutes]) => ({ subjectId, minutes }))
      .sort((a, b) => b.minutes - a.minutes),
    lessonsDone: data.lessons.filter((l) => l.doneAt !== null && set.has(l.doneAt)).length,
    answered: attempts.length,
    correct: attempts.filter((a) => a.correct).length,
    results: data.results.filter((r) => set.has(r.dateKey)).sort((a, b) => b.at - a.at),
  };
}

/** نص قابل للنسخ والمشاركة */
export function reportToText(r: WeeklyReport, nameOf: (id: number | null) => string): string {
  const lines = [
    `تقرير StudyFlow الأسبوعي (${r.from} → ${r.to})`,
    `• ساعات التركيز: ${formatMinutes(r.totalMin)}`,
    `• عدد الجلسات: ${r.sessionCount} (في ${r.activeDays} أيام)`,
    `• الدروس المنجزة: ${r.lessonsDone}`,
    `• الأسئلة: ${r.correct}/${r.answered} إجابة صحيحة`,
  ];
  if (r.bySubject.length > 0) {
    lines.push('المواد:');
    for (const s of r.bySubject) lines.push(`  - ${nameOf(s.subjectId)}: ${formatMinutes(s.minutes)}`);
  }
  if (r.results.length > 0) {
    lines.push('الاختبارات:');
    for (const x of r.results) {
      const pct = x.total > 0 ? Math.round((x.score / x.total) * 100) : 0;
      lines.push(`  - ${nameOf(x.subjectId)} (${x.kind === 'simulator' ? 'امتحان تجريبي' : 'اختبار'}): ${x.score}/${x.total} = ${pct}%`);
    }
  }
  return lines.join('\n');
}
