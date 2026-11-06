import { useMemo } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Repeat, Target } from 'lucide-react';
import { useApp } from '../store';
import { PageTitle, Empty } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { daysUntil, formatMinutes, toDateKey } from '../lib/utils';
import { minutesByDay } from '../lib/stats';

export default function Today() {
  const tasks = useApp((s) => s.tasks);
  const sessions = useApp((s) => s.sessions);
  const lessons = useApp((s) => s.lessons);
  const cards = useApp((s) => s.cards);
  const exams = useApp((s) => s.exams);
  const goal = useApp((s) => s.settings.dailyGoalMin);
  const today = toDateKey();
  const todayTasks = tasks.filter((task) => task.date === today);
  const openTasks = todayTasks.filter((task) => !task.done);
  const dueLessons = lessons.filter((lesson) => lesson.done && lesson.nextReview !== null && lesson.nextReview <= today);
  const dueCards = cards.filter((card) => card.due <= today);
  const studied = minutesByDay(sessions)[today] ?? 0;
  const nextExam = useMemo(() => exams.filter((exam) => daysUntil(exam.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0], [exams]);
  const completed = todayTasks.length - openTasks.length;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="يومي الدراسي" subtitle="كل ما تحتاج متابعته اليوم في مكان واحد." />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card"><Clock3 className="mb-2 text-accent" size={19} /><p className="text-xl font-extrabold">{formatMinutes(studied)}</p><p className="text-xs text-muted">وقت التركيز</p></div>
        <div className="card"><Target className="mb-2 text-accent" size={19} /><p className="text-xl font-extrabold">{formatMinutes(goal)}</p><p className="text-xs text-muted">هدفك اليومي</p></div>
        <div className="card"><CheckCircle2 className="mb-2 text-accent" size={19} /><p className="text-xl font-extrabold">{completed}/{todayTasks.length}</p><p className="text-xs text-muted">المهام المنجزة</p></div>
        <div className="card"><Repeat className="mb-2 text-accent" size={19} /><p className="text-xl font-extrabold">{dueLessons.length + dueCards.length}</p><p className="text-xs text-muted">مراجعات مستحقة</p></div>
      </section>
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2"><h2 className="font-bold">مهام اليوم</h2><a href="#/plan" className="text-xs font-semibold text-accent">إدارة الخطة ←</a></div>
        {todayTasks.length ? <ul className="space-y-2">{todayTasks.map((task) => <TaskRow key={task.id} task={task} />)}</ul> : <Empty>لا توجد مهام محددة لليوم. أضف أول مهمة من الخطة.</Empty>}
        {openTasks.length > 0 && <p className="text-xs text-muted">باقي عليك {openTasks.length} مهمة. أنجزها واحدة تلو الأخرى.</p>}
      </section>
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-bold"><Repeat size={18} className="text-accent" /> المراجعات المستحقة</h2><a href="#/review" className="text-xs font-semibold text-accent">ابدأ المراجعة ←</a></div>
        {dueLessons.length + dueCards.length === 0 ? <p className="text-sm text-muted">لا توجد مراجعات مستحقة الآن. حافظ على الاستمرارية.</p> : <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-base/60 p-3"><p className="text-xl font-bold">{dueLessons.length}</p><p className="text-xs text-muted">دروس</p></div><div className="rounded-xl bg-base/60 p-3"><p className="text-xl font-bold">{dueCards.length}</p><p className="text-xs text-muted">بطاقات</p></div></div>}
      </section>
      {nextExam && <a href="#/exams" className="card flex items-center gap-3 transition hover:border-accent"><CalendarClock className="text-accent" /><div><p className="font-bold">الامتحان القادم: {nextExam.title}</p><p className="text-xs text-muted">{daysUntil(nextExam.date) === 0 ? 'موعده اليوم' : 'باقي ' + daysUntil(nextExam.date) + ' يوم'}</p></div></a>}
      <section className="grid grid-cols-2 gap-2"><a href="#/timer" className="btn btn-primary">ابدأ جلسة تركيز</a><a href="#/quiz" className="btn btn-ghost">اختبر نفسك</a></section>
    </div>
  );
}
