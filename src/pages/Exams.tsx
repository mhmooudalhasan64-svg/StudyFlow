import { useMemo, useState, type FormEvent } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle, SubjectDot, SubjectSelect } from '../components/ui';
import { daysLabel, daysUntil, formatLongDate, toDateKey } from '../lib/utils';
import { buildIcs, type CalendarEvent } from '../lib/calendar';

const EXAM_NIGHT_CHECKLIST = [
  'الهوية أو بطاقة الامتحان',
  'أقلام وأدوات مسموح بها',
  'ماء ووجبة خفيفة',
  'النوم مبكراً',
  'الوصول قبل الموعد بربع ساعة',
];

export default function Exams() {
  const exams = useApp((s) => s.exams);
  const addExam = useApp((s) => s.addExam);
  const removeExam = useApp((s) => s.removeExam);
  const subjects = useApp((s) => s.subjects);
  const tasks = useApp((s) => s.tasks);

  const today = toDateKey();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  const { upcoming, past } = useMemo(() => {
    const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
    return {
      upcoming: sorted.filter((e) => daysUntil(e.date) >= 0),
      past: sorted.filter((e) => daysUntil(e.date) < 0).reverse(),
    };
  }, [exams]);

  const calendarEvents = useMemo<CalendarEvent[]>(
    () => [
      ...exams.map((e) => ({ id: `exam-${e.id}`, title: `امتحان: ${e.title}`, date: e.date })),
      ...tasks.filter((t) => !t.done && t.date >= today).map((t) => ({ id: `task-${t.id}`, title: t.title, date: t.date })),
    ],
    [exams, tasks, today],
  );

  const exportCalendar = () => {
    const url = URL.createObjectURL(new Blob([buildIcs(calendarEvents)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studyflow-calendar.ics';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = title.trim() || subjects.find((s) => s.id === subjectId)?.name || '';
    if (!name || !date) return;
    void addExam({ title: name, subjectId, date });
    setTitle('');
    setDate('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle
        title="العدّ التنازلي للامتحانات"
        subtitle="اعرف المدة المتبقية لكل امتحان وخطّط وفقًا لها"
        action={
          <button
            type="button"
            className="btn btn-ghost !px-3"
            onClick={exportCalendar}
            disabled={calendarEvents.length === 0}
            aria-label="تصدير الامتحانات والمهام إلى التقويم"
          >
            <Download size={16} /> تقويم
          </button>
        }
      />

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-bold">إضافة امتحان</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="exam-subject">
              المادة
            </label>
            <SubjectSelect id="exam-subject" value={subjectId} onChange={setSubjectId} />
          </div>
          <div>
            <label className="label" htmlFor="exam-date">
              التاريخ
            </label>
            <input id="exam-date" className="input" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="exam-title">
            اسم الامتحان (اختياري)
          </label>
          <input
            id="exam-title"
            className="input"
            placeholder="مثال: امتحان الفيزياء — الدورة الأولى"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>
        <button className="btn btn-primary w-full" type="submit" disabled={!date || (!title.trim() && subjectId === null)}>
          <Plus size={16} /> إضافة
        </button>
      </form>

      {upcoming.length > 0 && daysUntil(upcoming[0].date) <= 1 && (
        <section className="card space-y-3 border-accent/60" aria-label="قائمة ليلة الامتحان">
          <h2 className="font-bold">قائمة ليلة الامتحان: {upcoming[0].title}</h2>
          <ul className="space-y-2">
            {EXAM_NIGHT_CHECKLIST.map((item, i) => (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={checked.has(i)}
                    onChange={() =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                  />
                  <span className={checked.has(i) ? 'text-muted line-through' : ''}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-bold">القادمة</h2>
        {upcoming.length === 0 ? (
          <Empty>لا توجد امتحانات قادمة. أضف موعد أول امتحان لبدء العدّ التنازلي.</Empty>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((e, i) => {
              const n = daysUntil(e.date);
              const urgent = n <= 7;
              return (
                <li key={e.id} className={`card flex items-center gap-4 ${i === 0 ? 'border-accent/60' : ''}`}>
                  <div
                    className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-center ${
                      urgent ? 'bg-gradient-to-br from-accent to-accent2 text-onaccent' : 'border border-line'
                    }`}
                  >
                    <div>
                      <div className="text-2xl font-extrabold leading-none">{n}</div>
                      <div className="text-[10px] opacity-80">{n === 1 ? 'يوم' : 'أيام'}</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{e.title}</p>
                    <p className="text-sm text-muted">{formatLongDate(e.date)}</p>
                    <div className="mt-1 flex gap-1.5">
                      <SubjectDot subjectId={e.subjectId} />
                      <span className="chip">{daysLabel(n)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`حذف ${e.title}`}
                    onClick={() => void removeExam(e.id)}
                    className="rounded-lg p-2 text-muted transition hover:bg-bad/10 hover:text-bad"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-muted">المنتهية</h2>
          <ul className="space-y-2">
            {past.map((e) => (
              <li key={e.id} className="card flex items-center justify-between gap-3 opacity-60">
                <div className="min-w-0">
                  <p className="truncate text-sm">{e.title}</p>
                  <p className="text-xs text-muted">{formatLongDate(e.date)}</p>
                </div>
                <button
                  type="button"
                  aria-label={`حذف ${e.title}`}
                  onClick={() => void removeExam(e.id)}
                  className="rounded-lg p-2 text-muted hover:text-bad"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
