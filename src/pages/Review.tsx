import { useMemo, useState, type FormEvent } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle, SubjectDot } from '../components/ui';
import { isDue, parseIntervals } from '../lib/spaced';
import { daysLabel, daysUntil, toDateKey } from '../lib/utils';

export default function Review() {
  const lessons = useApp((s) => s.lessons);
  const cards = useApp((s) => s.cards);
  const intervals = useApp((s) => s.settings.reviewIntervals);
  const updateSettings = useApp((s) => s.updateSettings);
  const reviewLesson = useApp((s) => s.reviewLesson);

  const today = toDateKey();
  const [text, setText] = useState(intervals.join('، '));
  const [error, setError] = useState('');

  const due = useMemo(() => lessons.filter((l) => l.done && isDue(l.nextReview, today)), [lessons, today]);
  const upcoming = useMemo(
    () =>
      lessons
        .filter((l) => l.done && l.nextReview && !isDue(l.nextReview, today))
        .sort((a, b) => (a.nextReview as string).localeCompare(b.nextReview as string))
        .slice(0, 12),
    [lessons, today],
  );
  const mastered = lessons.filter((l) => l.done && l.nextReview === null).length;
  const dueCards = cards.filter((c) => c.due <= today).length;

  const save = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseIntervals(text);
    if (!parsed) return setError('أدخل أرقامًا صحيحة بين 1 و365، وافصل بينها بفواصل، مثل: 1، 3، 7، 14، 30');
    setError('');
    void updateSettings({ reviewIntervals: parsed });
    setText(parsed.join('، '));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="المراجعة الذكية" subtitle="تذكير بالدروس المنجزة بفواصل متدرجة تثبّت الحفظ" />

      <section className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-xl font-extrabold">{due.length}</div>
          <div className="text-xs text-muted">دروس تنتظر المراجعة</div>
        </div>
        <a href="#/cards" className="card text-center transition hover:border-accent">
          <div className="text-xl font-extrabold">{dueCards}</div>
          <div className="text-xs text-muted">بطاقات مستحقة</div>
        </a>
        <div className="card text-center">
          <div className="text-xl font-extrabold">{mastered}</div>
          <div className="text-xs text-muted">دروس أكملت مراحل المراجعة</div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">مستحقة اليوم</h2>
        {due.length === 0 ? (
          <Empty>لا توجد مراجعات مستحقة الآن. أنجز بعض الدروس من «خطة إنهاء المنهاج» لتظهر هنا.</Empty>
        ) : (
          <ul className="space-y-2">
            {due.map((l) => (
              <li key={l.id} className="rounded-xl border border-line/70 bg-base/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{l.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <SubjectDot subjectId={l.subjectId} />
                      {l.unit && <span className="chip">{l.unit}</span>}
                      <span className="chip">
                        المرحلة {l.step + 1} من {intervals.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-primary !px-3 !py-1.5" onClick={() => void reviewLesson(l.id, true)}>
                      <Check size={15} /> تمت مراجعتها
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={() => void reviewLesson(l.id, false)}>
                      <RotateCcw size={15} /> لم أتذكرها
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">القادمة</h2>
          <ul className="space-y-1.5 text-sm">
            {upcoming.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{l.title}</span>
                <span className="shrink-0 text-xs text-muted">{daysLabel(daysUntil(l.nextReview as string))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={save} className="card space-y-3">
        <h2 className="font-bold">مواعيد المراجعة (بالأيام بعد الإنجاز)</h2>
        <input
          className="input"
          aria-label="فواصل المراجعة بالأيام"
          value={text}
          onChange={(e) => setText(e.target.value)}
          inputMode="numeric"
        />
        <p className="text-xs text-muted">
          «تمت مراجعتها» تنقل الدرس للفاصل التالي، و«لم أتذكرها» تعيده للأول. تنطبق التغييرات على المراجعات القادمة.
        </p>
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full">
          حفظ المواعيد
        </button>
      </form>
    </div>
  );
}
