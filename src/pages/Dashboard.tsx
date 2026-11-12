import { useMemo } from 'react';
import { Bot, CalendarClock, Check, Circle, Flame, Gauge, ListChecks, Repeat, ShieldCheck, Target } from 'lucide-react';
import { useApp } from '../store';
import { TaskRow } from '../components/TaskRow';
import { Empty, PageTitle, ProgressRing } from '../components/ui';
import { computeStreak, minutesByDay } from '../lib/stats';
import { backupReminderDue, dailyPhrase, motivationMessage, SLOGAN } from '../lib/motivation';
import { currentMistakes, dailyResult } from '../lib/practice';
import { buildTodayFlow, computeReadiness } from '../lib/readiness';
import { daysLabel, daysUntil, formatMinutes, toDateKey } from '../lib/utils';

export default function Dashboard() {
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const exams = useApp((s) => s.exams);
  const goal = useApp((s) => s.settings.dailyGoalMin);
  const lessons = useApp((s) => s.lessons);
  const cards = useApp((s) => s.cards);
  const results = useApp((s) => s.results);
  const questions = useApp((s) => s.questions);
  const questionCount = questions.length;
  const attempts = useApp((s) => s.attempts);
  const subjects = useApp((s) => s.subjects);
  const lastBackup = useApp((s) => s.settings.lastBackup);

  const today = toDateKey();
  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);
  const todayMin = byDay[today] ?? 0;
  const streak = useMemo(() => computeStreak(byDay), [byDay]);
  const pct = goal > 0 ? todayMin / goal : 0;

  const dueLessons = lessons.filter((l) => l.done && l.nextReview !== null && l.nextReview <= today).length;
  const dueCards = cards.filter((c) => c.due <= today).length;

  const todayTasks = tasks.filter((t) => t.date === today);

  const flow = useMemo(
    () =>
      buildTodayFlow({
        dueReviews: dueLessons + dueCards,
        mistakes: currentMistakes(attempts, questions).length,
        dailyAvailable: questionCount > 0,
        dailyDone: !!dailyResult(results, today),
        tasksOpen: todayTasks.filter((t) => !t.done).length,
        tasksTotal: todayTasks.length,
        todayMin,
        goalMin: goal,
      }),
    [dueLessons, dueCards, attempts, questions, questionCount, results, today, tasks, todayMin, goal],
  );
  const flowDone = flow.filter((s) => s.done).length;

  const ready = useMemo(
    () => computeReadiness({ subjects, exams, attempts, lessons, sessions, today }),
    [subjects, exams, attempts, lessons, sessions, today],
  );
  const doneCount = todayTasks.filter((t) => t.done).length;

  const nextExam = useMemo(
    () =>
      exams
        .filter((e) => daysUntil(e.date) >= 0)
        .sort((a, b) => a.date.localeCompare(b.date))[0],
    [exams],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <PageTitle title="مساحة إنجازك" subtitle="خطّط، ركّز، وتابع تقدّمك في مكان واحد." />
        <span className="hidden items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent sm:inline-flex">
          ✦ مساحة إنجازك
        </span>
      </div>

      <a href="#/today" className="card flex items-center justify-between gap-3 border-accent/30 bg-accent/5 transition hover:border-accent">
        <div><p className="font-bold">لوحة يومي الدراسي</p><p className="mt-1 text-xs text-muted">مهامك ومراجعاتك ووقت تركيزك في شاشة واحدة.</p></div>
        <span className="btn btn-primary shrink-0 !px-3 !py-2 text-xs">افتح يومي ←</span>
      </a>

      <section className="dashboard-hero relative overflow-hidden rounded-3xl border border-accent/25 p-5 shadow-xl shadow-accent2/10 sm:p-7" aria-label="ملخص تقدمك اليوم">
        <div className="dashboard-orb dashboard-orb-one" aria-hidden="true" />
        <div className="dashboard-orb dashboard-orb-two" aria-hidden="true" />
        <div className="relative z-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-accent">✦ مساحة إنجازك اليومية</p><span className="rounded-full border border-accent/25 bg-accent/5 px-3 py-1 text-[9px] font-black tracking-[0.16em] text-accent" dir="ltr">VAYORA · BY AUREVON</span></div>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <div className="order-2 flex-1 text-center sm:order-1 sm:text-start">
              <p className="text-sm text-muted">مدة دراستك اليوم</p>
              <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{formatMinutes(todayMin)}</p>
              <p className="mt-2 text-sm text-muted">هدفك اليومي: {formatMinutes(goal)}</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 sm:mx-0">{motivationMessage(pct, streak)}</p>
              <a href="#/timer" className="btn btn-primary mt-5">▶ ابدأ جلسة تركيز</a>
            </div>
            <div className="order-1 rounded-full bg-base/40 p-2 shadow-inner sm:order-2">
              <ProgressRing pct={pct} size={142} stroke={11} gradientId="ring-home">
                <div>
                  <div className="text-3xl font-black tabular-nums">{Math.round(Math.min(pct, 9.99) * 100)}%</div>
                  <div className="mt-0.5 text-[11px] text-muted">من هدفك</div>
                </div>
              </ProgressRing>
            </div>
          </div>
          <div className="mt-6 border-t border-line/60 pt-4">
            <p className="text-sm font-bold leading-relaxed">{dailyPhrase(today)}</p>
            <p className="mt-1 text-xs text-muted">{SLOGAN}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">مهام اليوم</h2>
          <a href="#/plan" className="text-sm text-accent">
            فتح الخطة
          </a>
        </div>
        {todayTasks.length === 0 ? (
          <Empty>لا مهام لليوم. أضف مهمة من صفحة الخطة.</Empty>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </section>

      <details className="card group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
          <span>متابعة التقدم والأدوات الإضافية</span>
          <span className="text-xs font-medium text-accent group-open:hidden">عرض التفاصيل</span>
          <span className="hidden text-xs font-medium text-accent group-open:inline">إخفاء التفاصيل</span>
        </summary>
        <div className="mt-5 space-y-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="dashboard-stat">
          <span className="dashboard-stat-icon"><Flame size={19} /></span>
          <div><p className="text-2xl font-extrabold tabular-nums">{streak}</p><p className="text-xs text-muted">أيام إنجاز متتالية</p></div>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat-icon"><Target size={19} /></span>
          <div><p className="text-2xl font-extrabold tabular-nums">{doneCount}<span className="text-sm text-muted"> / {todayTasks.length}</span></p><p className="text-xs text-muted">مهام أنجزتها اليوم</p></div>
        </div>
        <a href="#/exams" className="dashboard-stat transition hover:-translate-y-0.5 hover:border-accent/50">
          <span className="dashboard-stat-icon"><CalendarClock size={19} /></span>
          <div className="min-w-0"><p className="truncate text-lg font-extrabold">{nextExam ? daysUntil(nextExam.date) + ' يوم' : '—'}</p><p className="truncate text-xs text-muted">{nextExam ? nextExam.title : 'لا توجد امتحانات قادمة'}</p></div>
        </a>
      </section>

      <section className="card space-y-3" aria-label="يومك الذكي">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">يومك الذكي</h2>
          <span className="text-xs text-muted">
            {flowDone}/{flow.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line/60">
          <div
            className="h-full rounded-full bg-gradient-to-l from-accent to-accent2 transition-all"
            style={{ width: `${flow.length ? (flowDone / flow.length) * 100 : 0}%` }}
          />
        </div>
        <ul className="space-y-1.5">
          {flow.map((s) => (
            <li key={s.id}>
              <a
                href={s.href}
                className={`flex items-center gap-2.5 rounded-xl border border-line/70 px-3 py-2.5 text-sm transition hover:border-accent ${
                  s.done ? 'text-muted line-through' : ''
                }`}
              >
                {s.done ? <Check size={16} className="shrink-0 text-ok" /> : <Circle size={16} className="shrink-0 text-muted" />}
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {ready.overall !== null && (
        <section className="card space-y-3" aria-label="جاهزيتك">
          <div className="flex items-center gap-3">
            <Gauge className="text-accent" />
            <div className="flex-1">
              <p className="font-bold">جاهزيتك العامة: {ready.overall}%</p>
              <p className="text-xs text-muted">من دقتك في الأسئلة، وإنجاز دروسك، ودراستك هذا الأسبوع.</p>
            </div>
          </div>
          <ul className="space-y-2">
            {ready.subjects
              .filter((r) => r.score !== null)
              .slice(0, 3)
              .map((r) => (
                <li key={r.subjectId} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span>
                      {r.name}
                      {r.daysToExam !== null && <span className="text-xs text-muted"> • الامتحان {daysLabel(r.daysToExam)}</span>}
                    </span>
                    <span className="font-bold">{r.score}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line/60">
                    <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent2" style={{ width: `${r.score}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{r.tip}</p>
                </li>
              ))}
          </ul>
        </section>
      )}



      {dueLessons + dueCards > 0 && (
        <a href="#/review" className="card flex items-center gap-3 border-accent/60 transition hover:border-accent">
          <Repeat className="text-accent" />
          <div>
            <p className="font-bold">لديك مراجعات مستحقة</p>
            <p className="text-sm text-muted">
              {dueLessons} درس و{dueCards} بطاقة بانتظارك اليوم
            </p>
          </div>
        </a>
      )}

      {backupReminderDue(lastBackup, Date.now(), sessions.length + tasks.length + results.length > 0) && (
        <a href="#/settings" className="card flex items-center gap-3 border-accent/60 transition hover:border-accent">
          <ShieldCheck className="text-accent" />
          <div>
            <p className="font-bold">احفظ نسخة احتياطية</p>
            <p className="text-sm text-muted">بياناتك على هذا الهاتف فقط. نزّل نسخة من الإعدادات لتحميها من الضياع.</p>
          </div>
        </a>
      )}

      <a href="#/quiz" className="card flex items-center gap-3 transition hover:border-accent">
        <ListChecks className="text-accent" />
        <div>
          <p className="font-bold">اختبر نفسك</p>
          <p className="text-sm text-muted">
            {questionCount > 0 && !dailyResult(results, today)
              ? 'تحدي اليوم ينتظرك: أسئلة قصيرة ونقاط إضافية'
              : 'حل أسئلة سريعة من بنك الأسئلة لتثبيت المعلومات'}
          </p>
        </div>
      </a>
      <a href="#/about" className="group relative block overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-[#101b2b] via-[#17283d] to-[#26364b] p-5 text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:border-amber-200/45 sm:p-6" aria-label="اكتشف منظومة AUREVON وVAYORA وAVORA">
        <div className="pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-slate-300/10 blur-3xl" />
        <div className="relative">
          <div className="text-center">
            <p className="text-[9px] font-black tracking-[0.28em] text-amber-200/80" dir="ltr">THE AUREVON ECOSYSTEM</p>
            <h2 className="mt-2 text-lg font-black sm:text-xl">منظومة تعليمية بتكامل أذكى</h2>
            <p className="mt-1 text-xs text-slate-300">شركة تقود، منصة تجمع، وذكاء يساند رحلتك.</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-1.5 py-3 text-center backdrop-blur-sm sm:px-3">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 text-sm font-black">A</span>
              <p className="mt-2 truncate text-[10px] font-black tracking-wide sm:text-xs" dir="ltr">AUREVON</p>
              <p className="mt-1 text-[9px] text-slate-300 sm:text-[10px]">الرؤية والتطوير</p>
            </div>
            <div className="rounded-2xl border border-amber-200/25 bg-amber-200/10 px-1.5 py-3 text-center sm:px-3">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-amber-100/20 bg-white/10"><img src="/logo.png" alt="" className="h-6 w-6" /></span>
              <p className="mt-2 truncate text-[10px] font-black tracking-wide sm:text-xs" dir="ltr">VAYORA</p>
              <p className="mt-1 text-[9px] text-amber-100 sm:text-[10px]">تجربة التعلم</p>
            </div>
            <div className="rounded-2xl border border-slate-300/20 bg-slate-300/10 px-1.5 py-3 text-center sm:px-3">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-slate-100/20 bg-white/10"><Bot size={18} className="text-amber-100" /></span>
              <p className="mt-2 truncate text-[10px] font-black tracking-wide sm:text-xs" dir="ltr">AVORA</p>
              <p className="mt-1 text-[9px] text-amber-100 sm:text-[10px]">المساعدة الذكية</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 text-[10px] font-semibold text-slate-200 sm:text-xs">
            <span>AUREVON تقود</span><span className="text-slate-500">·</span><span>VAYORA تجمع</span><span className="text-slate-500">·</span><span>AVORA تساعد</span>
          </div>
          <p className="mt-2 text-center text-[10px] font-bold text-amber-200 transition group-hover:text-white">اكتشف كيف تعمل المنظومة معاً ←</p>
        </div>
      </a>
        </div>
      </details>
    </div>
  );
}
