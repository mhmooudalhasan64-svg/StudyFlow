import type { Attempt, Exam, Lesson, StudySession, Subject } from '../db';
import { diffDays } from './advisor';

/** أقل عدد محاولات نثق بعده بنسبة الدقة */
const MIN_ATTEMPTS = 5;
/** دقائق الدراسة الأسبوعية للمادة التي نعدّها «كافية» */
const WEEKLY_TARGET_MIN = 120;

export interface SubjectReadiness {
  subjectId: number;
  name: string;
  /** 0 إلى 100، أو null إن لم توجد أي بيانات للمادة */
  score: number | null;
  accuracy: number | null;
  lessonsPct: number | null;
  weekMinutes: number;
  /** أيام حتى أقرب امتحان للمادة */
  daysToExam: number | null;
  tip: string;
}

export interface ReadinessInput {
  subjects: readonly Subject[];
  exams: readonly Exam[];
  attempts: readonly Attempt[];
  lessons: readonly Lesson[];
  sessions: readonly StudySession[];
  today: string;
}

export interface ReadinessReport {
  /** متوسط جاهزية المواد التي لها بيانات، أو null */
  overall: number | null;
  /** مرتبة: الأولى بالانتباه أولاً (الأضعف والأقرب امتحاناً) */
  subjects: SubjectReadiness[];
}

/**
 * «جاهزيتك»: مؤشر بسيط يجمع دقتك في الأسئلة وإنجاز الدروس ودراستك في آخر أسبوع.
 * المكوّن الناقص يُهمَل وتُعاد موازنة الباقي. كله محلي ودون أي خدمة.
 */
export function computeReadiness(i: ReadinessInput): ReadinessReport {
  const out: SubjectReadiness[] = i.subjects.map((s) => {
    const att = i.attempts.filter((a) => a.subjectId === s.id);
    const accuracy = att.length >= MIN_ATTEMPTS ? att.filter((a) => a.correct).length / att.length : null;

    const lessons = i.lessons.filter((l) => l.subjectId === s.id);
    const lessonsPct = lessons.length > 0 ? lessons.filter((l) => l.done).length / lessons.length : null;

    const weekMinutes = i.sessions
      .filter((x) => x.subjectId === s.id && diffDays(x.dateKey, i.today) >= 0 && diffDays(x.dateKey, i.today) < 7)
      .reduce((n, x) => n + x.minutes, 0);

    const parts: [number, number][] = [];
    if (accuracy !== null) parts.push([accuracy, 0.5]);
    if (lessonsPct !== null) parts.push([lessonsPct, 0.3]);
    if (att.length > 0 || lessons.length > 0 || weekMinutes > 0) parts.push([Math.min(1, weekMinutes / WEEKLY_TARGET_MIN), 0.2]);
    const weight = parts.reduce((n, [, w]) => n + w, 0);
    const score = weight > 0 ? Math.round((parts.reduce((n, [v, w]) => n + v * w, 0) / weight) * 100) : null;

    const next = i.exams
      .filter((e) => e.subjectId === s.id && diffDays(i.today, e.date) >= 0)
      .map((e) => diffDays(i.today, e.date))
      .sort((a, b) => a - b)[0];

    let tip = 'ابدأ بحل أسئلة وإنجاز دروس هذه المادة ليظهر مستواك.';
    if (score !== null) {
      if (accuracy !== null && accuracy < 0.6) tip = 'دقتك منخفضة: راجع أخطاءك من «دفتر أخطائي».';
      else if (lessonsPct !== null && lessonsPct < 0.5) tip = 'أكمل دروس المنهاج لتغطي المادة.';
      else if (weekMinutes < 60) tip = 'ادرس جلسة أو اثنتين هذا الأسبوع للحفاظ على مستواك.';
      else tip = 'مستواك جيد، حافظ عليه بمراجعة أسبوعية.';
    }

    return { subjectId: s.id, name: s.name, score, accuracy, lessonsPct, weekMinutes, daysToExam: next ?? null, tip };
  });

  // الأولوية: الأضعف، مع وزن أكبر للامتحان الأقرب. المواد بلا بيانات بعد المواد التي لها بيانات.
  const urgency = (r: SubjectReadiness) => {
    if (r.score === null) return -1;
    const near = r.daysToExam === null ? 1 : 1 + 14 / (1 + r.daysToExam);
    return (100 - r.score) * near;
  };
  out.sort((a, b) => urgency(b) - urgency(a));

  const scored = out.filter((r) => r.score !== null);
  const overall = scored.length ? Math.round(scored.reduce((n, r) => n + (r.score as number), 0) / scored.length) : null;
  return { overall, subjects: out };
}

export interface FlowStep {
  id: 'review' | 'mistakes' | 'daily' | 'tasks' | 'focus';
  label: string;
  href: string;
  done: boolean;
}

export interface FlowInput {
  dueReviews: number;
  mistakes: number;
  dailyAvailable: boolean;
  dailyDone: boolean;
  tasksOpen: number;
  tasksTotal: number;
  todayMin: number;
  goalMin: number;
}

/** «يومك الذكي»: خطوات اليوم المقترحة بالترتيب، تُحسب كلها من بياناتك (لا حالة محفوظة) */
export function buildTodayFlow(f: FlowInput): FlowStep[] {
  const steps: FlowStep[] = [];
  if (f.dueReviews > 0) steps.push({ id: 'review', label: `راجع ${f.dueReviews} من دروسك وبطاقاتك المستحقة`, href: '#/review', done: false });
  if (f.mistakes > 0) steps.push({ id: 'mistakes', label: `صحّح أخطاءك (${Math.min(f.mistakes, 20)} سؤالاً)`, href: '#/quiz', done: false });
  if (f.dailyAvailable) steps.push({ id: 'daily', label: 'أنجز تحدي اليوم', href: '#/quiz', done: f.dailyDone });
  if (f.tasksTotal > 0) steps.push({ id: 'tasks', label: `أنجز مهام اليوم (${f.tasksTotal - f.tasksOpen}/${f.tasksTotal})`, href: '#/plan', done: f.tasksOpen === 0 });
  steps.push({ id: 'focus', label: 'ادرس حتى تبلغ هدفك اليومي', href: '#/timer', done: f.goalMin > 0 && f.todayMin >= f.goalMin });
  return steps;
}
