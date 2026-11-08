import type { Attempt, Exam, StudySession, Subject, Task } from '../db';
import { addDays, daysLabel, formatMinutes, parseDateKey } from './utils';
import { accuracyBySubject, minutesByDay } from './stats';

export interface AdvisorContext {
  subjects: readonly Subject[];
  exams: readonly Exam[];
  tasks: readonly Task[];
  sessions: readonly StudySession[];
  attempts: readonly Attempt[];
  goalMin: number;
  /** YYYY-MM-DD */
  today: string;
  /** اختياريان: لملخص مستوى الطالب */
  branch?: 'scientific' | 'literary';
  grade?: number;
}

export interface PlanSuggestion {
  title: string;
  subjectId: number;
  date: string;
  minutes: number;
}

export interface Insight {
  id: string;
  level: 'good' | 'info' | 'warn';
  text: string;
}

const BLOCK_MIN = 45;
const MIN_BLOCK = 25;
const MAX_NEGLECT_DAYS = 14;

/** الفرق بالأيام بين تاريخين (to - from) */
export function diffDays(from: string, to: string): number {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);
}

interface SubjectInfo {
  subject: Subject;
  /** أقرب امتحان قادم (أو null) */
  examDate: string | null;
  examLeft: number | null;
  /** أيام منذ آخر جلسة لهذه المادة (محدودة بسقف) */
  sinceStudy: number;
  weight: number;
}

function analyse(ctx: AdvisorContext): SubjectInfo[] {
  const lastStudy = new Map<number, string>();
  for (const s of ctx.sessions) {
    if (s.subjectId === null) continue;
    const prev = lastStudy.get(s.subjectId);
    if (!prev || s.dateKey > prev) lastStudy.set(s.subjectId, s.dateKey);
  }

  const nearestExam = new Map<number, string>();
  for (const e of ctx.exams) {
    if (e.subjectId === null || e.date < ctx.today) continue;
    const prev = nearestExam.get(e.subjectId);
    if (!prev || e.date < prev) nearestExam.set(e.subjectId, e.date);
  }
  const anyExam = nearestExam.size > 0;

  return ctx.subjects.map((subject) => {
    const examDate = nearestExam.get(subject.id) ?? null;
    const examLeft = examDate ? diffDays(ctx.today, examDate) : null;
    const last = lastStudy.get(subject.id);
    const sinceStudy = last ? Math.min(MAX_NEGLECT_DAYS, Math.max(0, diffDays(last, ctx.today))) : MAX_NEGLECT_DAYS;
    const neglect = 1 + Math.min(sinceStudy, 7) / 7; // من 1 إلى 2

    let base: number;
    if (examLeft !== null) base = 10 / (Math.max(examLeft, 1) + 2); // كلما اقترب الامتحان زاد الوزن
    else base = anyExam ? 0.1 : 1; // لا امتحان لها: وزن صغير إن وُجدت امتحانات لمواد أخرى

    return { subject, examDate, examLeft, sinceStudy, weight: base * neglect };
  });
}

/** يقترح مهام مراجعة لأيام قادمة بحسب قرب الامتحانات وإهمال المواد وهدف اليوم. */
export function generatePlan(ctx: AdvisorContext, days = 7): PlanSuggestion[] {
  const infos = analyse(ctx);
  if (infos.length === 0 || ctx.goalMin < MIN_BLOCK) return [];

  const totals = new Map<number, number>();
  const out: PlanSuggestion[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(ctx.today, i);
    const planned = ctx.tasks.filter((t) => t.date === date).reduce((sum, t) => sum + t.minutes, 0);
    let budget = Math.floor((ctx.goalMin - planned) / 5) * 5;
    if (budget < MIN_BLOCK) continue;

    // المواد التي انتهى امتحانها قبل هذا اليوم لا تدخل الخطة
    const eligible = infos.filter((x) => x.examDate === null || x.examDate >= date);
    if (eligible.length === 0) continue;

    const dayAssigned = new Map<number, number>();
    while (budget >= MIN_BLOCK) {
      let best = eligible[0];
      let bestScore = -1;
      for (const x of eligible) {
        const id = x.subject.id;
        const score = x.weight / (1 + (dayAssigned.get(id) ?? 0) / 60 + (totals.get(id) ?? 0) / 300);
        if (score > bestScore) {
          best = x;
          bestScore = score;
        }
      }
      let block = Math.min(BLOCK_MIN, budget);
      if (budget - block < MIN_BLOCK) block = budget; // لا نترك فتاتاً أقل من الحد الأدنى
      const id = best.subject.id;
      dayAssigned.set(id, (dayAssigned.get(id) ?? 0) + block);
      totals.set(id, (totals.get(id) ?? 0) + block);
      budget -= block;
    }

    for (const [id, minutes] of dayAssigned) {
      // لا نكرّر مهمة موجودة لنفس المادة في نفس اليوم
      if (ctx.tasks.some((t) => t.date === date && t.subjectId === id)) continue;
      const info = infos.find((x) => x.subject.id === id)!;
      const final = info.examLeft !== null && info.examLeft <= 7;
      out.push({
        title: final ? `مراجعة نهائية: ${info.subject.name}` : `مراجعة ${info.subject.name}`,
        subjectId: id,
        date,
        minutes,
      });
    }
  }
  return out;
}

/** ملاحظات ونصائح مبنية على بيانات الطالب. */
export function getInsights(ctx: AdvisorContext): Insight[] {
  const out: Insight[] = [];
  const infos = analyse(ctx);
  const byDay = minutesByDay(ctx.sessions as StudySession[]);
  const todayMin = byDay[ctx.today] ?? 0;

  if (ctx.exams.every((e) => e.date < ctx.today)) {
    out.push({
      id: 'no-exams',
      level: 'info',
      text: 'أضف مواعيد امتحاناتك من صفحة «الامتحانات» لأرتّب لك المراجعة حسب الأقرب.',
    });
  }

  const soon = infos
    .filter((x) => x.examLeft !== null && x.examLeft <= 7)
    .sort((a, b) => a.examLeft! - b.examLeft!);
  for (const x of soon) {
    out.push({
      id: `soon-${x.subject.id}`,
      level: 'warn',
      text: `امتحان ${x.subject.name} ${daysLabel(x.examLeft!)}. ركّز عليه وراجع الأسئلة السابقة.`,
    });
  }

  for (const x of infos) {
    if (x.examLeft === null || x.examLeft > 30) continue;
    if (x.sinceStudy >= 4 && !soon.includes(x)) {
      out.push({
        id: `neglect-${x.subject.id}`,
        level: 'warn',
        text:
          x.sinceStudy >= MAX_NEGLECT_DAYS
            ? `لم تدرس ${x.subject.name} بعد، وامتحانها ${daysLabel(x.examLeft)}.`
            : `لم تدرس ${x.subject.name} منذ ${x.sinceStudy} أيام، وامتحانها ${daysLabel(x.examLeft)}.`,
      });
    }
  }

  for (const [subjectId, acc] of accuracyBySubject(ctx.attempts as Attempt[])) {
    if (acc.total >= 5 && acc.correct / acc.total < 0.6) {
      const name = ctx.subjects.find((s) => s.id === subjectId)?.name;
      if (name)
        out.push({
          id: `weak-${subjectId}`,
          level: 'warn',
          text: `نتيجتك في أسئلة ${name} ${Math.round((acc.correct / acc.total) * 100)}%. أعد مراجعة دروسها ثم جرّب الأسئلة مجدداً.`,
        });
    }
  }

  const overdue = ctx.tasks.filter((t) => !t.done && t.date < ctx.today).length;
  if (overdue > 0) {
    out.push({
      id: 'overdue',
      level: 'warn',
      text: `عندك ${overdue} ${overdue === 1 ? 'مهمة متأخرة' : 'مهام متأخرة'}. أعد تنظيمها تلقائياً من صفحة «الخطة».`,
    });
  }

  if (ctx.goalMin > 0) {
    if (todayMin >= ctx.goalMin) {
      out.push({ id: 'goal-done', level: 'good', text: `أنجزت هدف اليوم (${formatMinutes(ctx.goalMin)}). أحسنت!` });
    } else {
      out.push({
        id: 'goal-left',
        level: 'info',
        text: `بقي ${formatMinutes(ctx.goalMin - todayMin)} لتصل إلى هدف اليوم.`,
      });
    }
  }

  const top = [...infos].sort((a, b) => b.weight - a.weight)[0];
  if (top && infos.length > 0) {
    out.push({
      id: 'next',
      level: 'info',
      text: `الأولى بالدراسة الآن: ${top.subject.name}.`,
    });
  }

  return out;
}

/** يبني سياق المستشار من حالة التطبيق (بنية مطابقة لحالة المتجر) */
export function contextFrom(
  a: {
    subjects: readonly Subject[];
    exams: readonly Exam[];
    tasks: readonly Task[];
    sessions: readonly StudySession[];
    attempts: readonly Attempt[];
    settings: { dailyGoalMin: number; branch?: 'scientific' | 'literary'; grade?: number };
  },
  today: string,
): AdvisorContext {
  return {
    subjects: a.subjects,
    exams: a.exams,
    tasks: a.tasks,
    sessions: a.sessions,
    attempts: a.attempts,
    goalMin: a.settings.dailyGoalMin,
    today,
    branch: a.settings.branch,
    grade: a.settings.grade,
  };
}

export interface TaskMove {
  id: number;
  date: string;
}

/**
 * خطة مرنة: يوزّع المهام المتأخرة على الأيام القادمة بحسب هدفك اليومي.
 * الأولوية للمواد الأقرب امتحاناً ثم الأقدم تأخراً، ولا تُحذف أي مهمة.
 */
export function rescheduleOverdue(ctx: AdvisorContext, days = 7): TaskMove[] {
  const overdue = ctx.tasks.filter((t) => !t.done && t.date < ctx.today);
  if (overdue.length === 0) return [];

  const examLeft = new Map(analyse(ctx).map((x) => [x.subject.id, x.examLeft]));
  const urgency = (t: Task): number => {
    const left = t.subjectId === null ? null : (examLeft.get(t.subjectId) ?? null);
    return left === null ? Infinity : left;
  };
  const order = [...overdue].sort((a, b) => urgency(a) - urgency(b) || a.date.localeCompare(b.date));

  const slots = Array.from({ length: days }, (_, i) => {
    const date = addDays(ctx.today, i);
    const used = ctx.tasks.filter((t) => t.date === date).reduce((sum, t) => sum + t.minutes, 0);
    return { date, left: ctx.goalMin - used };
  });

  const moves: TaskMove[] = [];
  for (const t of order) {
    // أول يوم يتسع للمهمة؛ وإن لم يوجد فاليوم الأقل ازدحاماً (لا نُسقط مهمة أبداً)
    const slot = slots.find((c) => c.left >= t.minutes) ?? slots.reduce((best, c) => (c.left > best.left ? c : best), slots[0]);
    slot.left -= t.minutes;
    moves.push({ id: t.id, date: slot.date });
  }
  return moves;
}

/** ملخص قصير عن مستوى الطالب يُرسل للمعلّم الذكي ليخصّص الشرح (لا يتضمن اسماً ولا بيانات شخصية). */
export function buildLearnerProfile(ctx: AdvisorContext): string {
  const parts: string[] = [];
  const infos = analyse(ctx);

  if (ctx.branch) {
    parts.push(`فرع الطالب: ${ctx.branch === 'literary' ? 'أدبي' : 'علمي'}${ctx.grade ? `، الصف ${ctx.grade}` : ''}.`);
  }

  const soon = infos
    .filter((x) => x.examLeft !== null && x.examLeft <= 45)
    .sort((a, b) => (a.examLeft as number) - (b.examLeft as number))
    .slice(0, 3);
  if (soon.length) {
    parts.push(`امتحانات قريبة: ${soon.map((x) => `${x.subject.name} (${daysLabel(x.examLeft as number)})`).join('، ')}.`);
  }

  const name = (id: number) => ctx.subjects.find((s) => s.id === id)?.name;
  const acc = [...accuracyBySubject(ctx.attempts as Attempt[])].filter(([, a]) => a.total >= 5);
  const weak = acc.filter(([, a]) => a.correct / a.total < 0.6).slice(0, 3);
  const strong = acc.filter(([, a]) => a.correct / a.total >= 0.8).slice(0, 3);
  const pct = (a: { total: number; correct: number }) => `${Math.round((a.correct / a.total) * 100)}%`;
  if (weak.length) parts.push(`مواد ضعيفة في الأسئلة: ${weak.map(([id, a]) => `${name(id) ?? '—'} (${pct(a)})`).join('، ')}.`);
  if (strong.length) parts.push(`مواد قوية: ${strong.map(([id]) => name(id) ?? '—').join('، ')}.`);

  if (ctx.attempts.length > 0) {
    const ok = ctx.attempts.filter((a) => a.correct).length;
    parts.push(`حلّ ${ctx.attempts.length} سؤالاً بدقة إجمالية ${Math.round((ok / ctx.attempts.length) * 100)}%.`);

    // SKOVA adapts from recent evidence, not a permanent label: use the latest
    // ten attempts per subject and avoid conclusions from fewer than three.
    const subjectIds = [...new Set(ctx.attempts.map((a) => a.subjectId))];
    const recentSignals = subjectIds.flatMap((subjectId) => {
      const recent = ctx.attempts
        .filter((a) => a.subjectId === subjectId)
        .sort((a, b) => b.at - a.at)
        .slice(0, 10);
      if (recent.length < 3) return [];
      const accuracy = Math.round((recent.filter((a) => a.correct).length / recent.length) * 100);
      const subjectName = name(subjectId) ?? 'مادة غير محددة';
      const latestFive = recent.slice(0, 5);
      const previousFive = recent.slice(5, 10);
      const latestAccuracy = Math.round((latestFive.filter((a) => a.correct).length / latestFive.length) * 100);
      const previousAccuracy = previousFive.length >= 3
        ? Math.round((previousFive.filter((a) => a.correct).length / previousFive.length) * 100)
        : null;
      const trend = previousAccuracy === null
        ? 'لا توجد مقارنة زمنية كافية'
        : latestAccuracy >= previousAccuracy + 15
          ? 'تحسّن حديث'
          : latestAccuracy <= previousAccuracy - 15
            ? 'تراجع حديث'
            : 'أداء مستقر تقريباً';
      const nextStep = accuracy < 50
        ? 'ابدأ بمفهوم أصغر ومثال محلول وتلميح'
        : accuracy < 70
          ? 'ثبّت الفهم بتدريب متوسط وتغذية راجعة'
          : accuracy < 85
            ? 'ارفع التحدي تدريجياً مع مراجعة الأخطاء'
            : 'انتقل إلى تطبيق أعمق واسترجاع متباعد';
      return [`${subjectName}: ${accuracy}% في آخر ${recent.length} محاولات؛ ${trend}؛ الخطوة المقترحة: ${nextStep}`];
    }).slice(0, 5);
    if (recentSignals.length) {
      parts.push(`مؤشرات SKOVA الحديثة (آخر المحاولات، وليست حكماً ثابتاً على المستوى): ${recentSignals.join('؛ ')}.`);
    }
  }

  return parts.join(' ').slice(0, 700);
}
