import { useState, type FormEvent } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../store';
import { TaskRow } from '../components/TaskRow';
import { Empty, PageTitle, SubjectDot, SubjectSelect } from '../components/ui';
import { contextFrom, rescheduleOverdue } from '../lib/advisor';
import { addDays, dayNumber, formatLongDate, formatMinutes, toDateKey, weekdayShort } from '../lib/utils';

export default function Planner() {
  const tasks = useApp((s) => s.tasks);
  const addTask = useApp((s) => s.addTask);
  const moveTask = useApp((s) => s.moveTask);
  const moveTasks = useApp((s) => s.moveTasks);
  const [note, setNote] = useState('');

  const today = toDateKey();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(today);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [minutes, setMinutes] = useState('45');

  const start = addDays(today, weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const dayTasks = tasks.filter((t) => t.date === selected);
  const plannedMin = dayTasks.reduce((sum, t) => sum + t.minutes, 0);
  const doneCount = dayTasks.filter((t) => t.done).length;
  const overdue = tasks.filter((t) => !t.done && t.date < today);

  /** خطة مرنة: توزيع المهام المتأخرة على الأيام القادمة بحسب هدفك اليومي وقرب الامتحانات */
  const reorganize = () => {
    const moves = rescheduleOverdue(contextFrom(useApp.getState(), today), 7);
    if (moves.length === 0) return;
    void moveTasks(moves);
    const last = moves.reduce((m, x) => (x.date > m ? x.date : m), moves[0].date);
    setNote(`أُعيد تنظيم ${moves.length} ${moves.length === 1 ? 'مهمة' : 'مهام'} متأخرة حتى ${formatLongDate(last)}، بحسب هدفك اليومي.`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = title.trim();
    const mins = Math.round(Number(minutes));
    if (!name || !Number.isFinite(mins) || mins <= 0) return;
    void addTask({ title: name, subjectId, date: selected, minutes: Math.min(mins, 600) });
    setTitle('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="خطة الدراسة" subtitle="وزّع موادك على أيام الأسبوع وتابع إنجازك" />

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="btn btn-ghost !px-3" onClick={() => setWeekOffset((w) => w - 1)} aria-label="الأسبوع السابق">
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="text-sm text-muted hover:text-main"
            onClick={() => {
              setWeekOffset(0);
              setSelected(today);
            }}
          >
            العودة إلى اليوم
          </button>
          <button type="button" className="btn btn-ghost !px-3" onClick={() => setWeekOffset((w) => w + 1)} aria-label="الأسبوع التالي">
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const has = tasks.some((t) => t.date === d);
            const active = d === selected;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(d)}
                aria-pressed={active}
                className={`relative flex flex-col items-center rounded-xl border py-2 text-xs transition ${
                  active
                    ? 'border-transparent bg-gradient-to-b from-accent to-accent2 text-onaccent'
                    : d === today
                      ? 'border-accent text-main'
                      : 'border-line text-muted hover:border-accent'
                }`}
              >
                <span>{weekdayShort(d)}</span>
                <span className="text-base font-bold">{dayNumber(d)}</span>
                {has && !active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-bold">إضافة مهمة ليوم {formatLongDate(selected)}</h2>
        <div>
          <label className="label" htmlFor="task-title">
            المهمة
          </label>
          <input
            id="task-title"
            className="input"
            placeholder="مثال: حل تمارين الفصل الثالث"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="task-subject">
              المادة
            </label>
            <SubjectSelect id="task-subject" value={subjectId} onChange={setSubjectId} />
          </div>
          <div>
            <label className="label" htmlFor="task-min">
              المدة (دقيقة)
            </label>
            <input
              id="task-min"
              className="input"
              type="number"
              inputMode="numeric"
              min={5}
              max={600}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary w-full" type="submit" disabled={!title.trim()}>
          <Plus size={16} /> إضافة
        </button>
      </form>

      {note && (
        <p role="status" className="card !py-3 text-sm text-ok">
          {note}
        </p>
      )}

      {overdue.length > 0 && (
        <section className="card border-bad/40">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold text-bad">مهام متأخرة ({overdue.length})</h2>
            <button type="button" className="btn btn-primary !py-1.5 text-xs" onClick={reorganize}>
              <CalendarRange size={14} /> أعد تنظيمها تلقائياً
            </button>
          </div>
          <ul className="space-y-2">
            {overdue.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/70 bg-base/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{t.title}</p>
                  <div className="mt-1 flex gap-1.5">
                    <SubjectDot subjectId={t.subjectId} />
                    <span className="chip">{t.date}</span>
                  </div>
                </div>
                <button type="button" className="btn btn-ghost shrink-0 !py-1.5" onClick={() => void moveTask(t.id, today)}>
                  نقل لليوم
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">مهام اليوم المحدد</h2>
          <span className="text-sm text-muted">
            {doneCount}/{dayTasks.length} • {formatMinutes(plannedMin)}
          </span>
        </div>
        {dayTasks.length === 0 ? (
          <Empty>لا مهام في هذا اليوم.</Empty>
        ) : (
          <ul className="space-y-2">
            {dayTasks.map((t) => (
              <TaskRow key={t.id} task={t} deletable />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
