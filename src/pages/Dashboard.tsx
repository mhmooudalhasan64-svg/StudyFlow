import { useMemo } from 'react';
import { CalendarClock, Flame, ListChecks, Play, Repeat, Target } from 'lucide-react';
import { useApp } from '../store';
import { TaskRow } from '../components/TaskRow';
import { Empty, PageTitle, ProgressRing } from '../components/ui';
import { computeStreak, minutesByDay } from '../lib/stats';
import { dailyPhrase, motivationMessage, SLOGAN } from '../lib/motivation';
import { dailyResult } from '../lib/practice';
import { daysLabel, daysUntil, formatMinutes, toDateKey } from '../lib/utils';

export default function Dashboard() {
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const exams = useApp((s) => s.exams);
  const goal = useApp((s) => s.settings.dailyGoalMin);
  const lessons = useApp((s) => s.lessons);
  const cards = useApp((s) => s.cards);
  const results = useApp((s) => s.results);
  const questionCount = useApp((s) => s.questions.length);

  const today = toDateKey();
  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);
  const todayMin = byDay[today] ?? 0;
  const streak = useMemo(() => computeStreak(byDay), [byDay]);
  const pct = goal > 0 ? todayMin / goal : 0;

  const dueLessons = lessons.filter((l) => l.done && l.nextReview !== null && l.nextReview <= today).length;
  const dueCards = cards.filter((c) => c.due <= today).length;

  const todayTasks = tasks.filter((t) => t.date === today);
  const doneCount = todayTasks.filter((t) => t.done).length;

  const nextExam = useMemo(
    () =>
      exams
        .filter((e) => daysUntil(e.date) >= 0)
        .sort((a, b) => a.date.localeCompare(b.date))[0],
    [exams],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="مرحباً بك 👋" subtitle="خطوة صغيرة كل يوم تصنع فرقاً كبيراً في البكالوريا" />

      <section className="card text-center" aria-label="شعار التطبيق">
        <p className="bg-gradient-to-l from-accent to-accent2 bg-clip-text text-xl font-extrabold text-transparent">
          {dailyPhrase(today)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{SLOGAN}</p>
      </section>

      <section className="card flex flex-col items-center gap-5 sm:flex-row">
        <ProgressRing pct={pct} gradientId="ring-home">
          <div>
            <div className="text-2xl font-extrabold">{Math.round(Math.min(pct, 9.99) * 100)}%</div>
            <div className="text-xs text-muted">من هدف اليوم</div>
          </div>
        </ProgressRing>
        <div className="flex-1 text-center sm:text-start">
          <p className="text-sm text-muted">درست اليوم</p>
          <p className="text-3xl font-extrabold">{formatMinutes(todayMin)}</p>
          <p className="mt-1 text-sm text-muted">الهدف: {formatMinutes(goal)}</p>
          <p className="mt-3 text-sm">{motivationMessage(pct, streak)}</p>
          <a href="#/timer" className="btn btn-primary mt-4">
            <Play size={16} /> ابدأ جلسة تركيز
          </a>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Flame className="mx-auto mb-1 text-accent" size={22} />
          <div className="text-xl font-extrabold">{streak}</div>
          <div className="text-xs text-muted">أيام متتالية</div>
        </div>
        <div className="card text-center">
          <Target className="mx-auto mb-1 text-accent" size={22} />
          <div className="text-xl font-extrabold">
            {doneCount}/{todayTasks.length}
          </div>
          <div className="text-xs text-muted">مهام اليوم</div>
        </div>
        <a href="#/exams" className="card text-center transition hover:border-accent">
          <CalendarClock className="mx-auto mb-1 text-accent" size={22} />
          <div className="text-xl font-extrabold">
            {nextExam ? daysUntil(nextExam.date) : '—'}
          </div>
          <div className="truncate text-xs text-muted">
            {nextExam ? `${nextExam.title} (${daysLabel(daysUntil(nextExam.date))})` : 'لا امتحانات قادمة'}
          </div>
        </a>
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
    </div>
  );
}
