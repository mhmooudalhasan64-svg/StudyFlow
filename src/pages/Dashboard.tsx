import { useMemo } from 'react';
import { CalendarClock, Check, Circle, Flame, Gauge, ListChecks, Repeat, ShieldCheck, Target } from 'lucide-react';
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
        <PageTitle title="أهلًا بعودتك 👋" subtitle="كل جلسة تركيز تقرّبك من هدفك." />
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
          <p className="mb-5 text-xs font-semibold text-accent">✦ مساحة إنجازك اليومية</p>
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
      <a href="#/about" className="group block overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/10 via-card/90 to-accent2/10 p-4 shadow-lg shadow-accent2/10 transition hover:-translate-y-0.5 hover:border-accent/50 sm:p-5" aria-label="التعرّف على منظومة AUREVON وVAYORA وSKOVA">
        <div className="mb-3 text-center">
          <div className="text-[10px] font-bold tracking-wider text-accent sm:text-xs">منظومة العلامات المتكاملة</div>
          <h2 className="mt-1 text-base font-black sm:text-lg">ثلاث هويات، هدف تعليمي واحد</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="min-w-0 rounded-2xl border border-slate-400/25 bg-gradient-to-br from-[#111827] to-[#263449] px-1.5 py-3 text-center text-white sm:px-3">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-white/30 bg-white/10 text-sm font-black">A</span>
            <p className="mt-2 truncate text-[10px] font-black tracking-wide sm:text-xs" dir="ltr">AUREVON</p>
            <p className="mt-1 text-[9px] text-slate-300 sm:text-[10px]">الشركة الأم</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-sky-400/30 bg-gradient-to-br from-[#10233D] to-[#245078] px-1.5 py-3 text-center text-white sm:px-3">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-white/30 bg-white/10"><img src="/icon.svg" alt="" className="h-6 w-6" /></span>
            <p className="mt-2 truncate text-[10px] font-black tracking-wide sm:text-xs" dir="ltr">VAYORA</p>
            <p className="mt-1 text-[9px] text-sky-100 sm:text-[10px]">المنصة التعليمية</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-[#21183E] to-[#49336D] px-1.5 py-3 text-center text-white sm:px-3">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-white/30 bg-white/10"><img src="/logo.png" alt="" className="h-7 w-7 rounded-lg object-cover" /></span>
            <p className="mt-2 truncate text-[10px] font-black tracking-wide sm:text-xs" dir="ltr">SKOVA</p>
            <p className="mt-1 text-[9px] text-violet-100 sm:text-[10px]">المعلم والمتجر</p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted sm:text-sm">AUREVON تقود · VAYORA تجمع · SKOVA تساعد</p>
      </a>
        </div>
      </details>
    </div>
  );
}
