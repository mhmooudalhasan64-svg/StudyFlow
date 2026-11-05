import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle, SubjectDot, SubjectSelect } from '../components/ui';
import { daysLabel, daysUntil, formatLongDate, toDateKey } from '../lib/utils';

export default function Exams() {
  const exams = useApp((s) => s.exams);
  const addExam = useApp((s) => s.addExam);
  const removeExam = useApp((s) => s.removeExam);
  const subjects = useApp((s) => s.subjects);

  const today = toDateKey();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState('');

  const { upcoming, past } = useMemo(() => {
    const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date));
    return {
      upcoming: sorted.filter((e) => daysUntil(e.date) >= 0),
      past: sorted.filter((e) => daysUntil(e.date) < 0).reverse(),
    };
  }, [exams]);

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
      <PageTitle title="العدّ التنازلي للامتحانات" subtitle="اعرف المدة المتبقية لكل امتحان وخطّط وفقًا لها" />

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
