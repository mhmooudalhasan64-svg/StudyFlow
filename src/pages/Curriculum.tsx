import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle, ProgressRing } from '../components/ui';
import { BRANCHES } from '../lib/bac';

export default function Curriculum() {
  const lessons = useApp((s) => s.lessons);
  const subjects = useApp((s) => s.subjects);
  const branch = useApp((s) => s.settings.branch);
  const addLessons = useApp((s) => s.addLessons);
  const toggleLesson = useApp((s) => s.toggleLesson);
  const removeLesson = useApp((s) => s.removeLesson);

  const [subjectId, setSubjectId] = useState<number | ''>(subjects[0]?.id ?? '');
  const [unit, setUnit] = useState('');
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  const total = lessons.length;
  const done = lessons.filter((l) => l.done).length;

  // مواد الفرع أولاً ثم بقية المواد التي لها دروس
  const order = useMemo(() => {
    const names = BRANCHES[branch].subjects;
    return [...subjects].sort((a, b) => {
      const ia = names.indexOf(a.name);
      const ib = names.indexOf(b.name);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [subjects, branch]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (subjectId === '') return setMessage('اختر المادة أولاً');
    const titles = text
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (titles.length === 0) return setMessage('اكتب عنوان درس واحداً على الأقل (كل درس في سطر)');
    void addLessons(titles.map((title) => ({ subjectId, unit, title }))).then((n) => {
      setMessage(`تمت إضافة ${n} درس`);
      setText('');
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="خطة إنهاء المنهاج" subtitle="أضف الوحدات والدروس وتابع المنجز والمتبقي" />

      <section className="card flex items-center gap-5">
        <ProgressRing pct={total ? done / total : 0} size={110} stroke={10} gradientId="ring-cur">
          <div className="text-xl font-extrabold">{total ? Math.round((done / total) * 100) : 0}%</div>
        </ProgressRing>
        <div>
          <p className="text-sm text-muted">إجمالي الدروس</p>
          <p className="text-2xl font-extrabold">
            {done} / {total}
          </p>
          <p className="text-sm text-muted">المتبقي: {total - done} درس</p>
        </div>
      </section>

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-bold">إضافة دروس</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cur-subject">
              المادة
            </label>
            <select
              id="cur-subject"
              className="input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">— اختر —</option>
              {order.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cur-unit">
              الوحدة
            </label>
            <input id="cur-unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={60} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cur-lessons">
            الدروس (كل درس في سطر)
          </label>
          <textarea id="cur-lessons" className="input min-h-24" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          <Plus size={16} /> إضافة
        </button>
        {message && (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        )}
      </form>

      {total === 0 ? (
        <Empty>لا دروس بعد. أضف دروس موادك لتظهر نسبة الإنجاز.</Empty>
      ) : (
        order.map((s) => {
          const list = lessons.filter((l) => l.subjectId === s.id);
          if (list.length === 0) return null;
          const d = list.filter((l) => l.done).length;
          const pct = Math.round((d / list.length) * 100);
          const units = new Map<string, typeof list>();
          for (const l of list) units.set(l.unit || 'بدون وحدة', [...(units.get(l.unit || 'بدون وحدة') ?? []), l]);
          return (
            <section key={s.id} className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-bold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </h2>
                <span className="text-sm text-muted">
                  {d}/{list.length} · {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line/60">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
              </div>
              {[...units.entries()].map(([u, ls]) => (
                <div key={u}>
                  <p className="mb-1.5 text-xs font-medium text-muted">{u}</p>
                  <ul className="space-y-1.5">
                    {ls.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 rounded-xl border border-line/70 bg-base/40 px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0 accent-[rgb(var(--accent))]"
                          checked={l.done}
                          aria-label={`إنجاز ${l.title}`}
                          onChange={() => void toggleLesson(l.id)}
                        />
                        <span className={`min-w-0 flex-1 text-sm ${l.done ? 'text-muted line-through' : ''}`}>{l.title}</span>
                        <button
                          type="button"
                          aria-label={`حذف ${l.title}`}
                          onClick={() => void removeLesson(l.id)}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-bad/10 hover:text-bad"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
