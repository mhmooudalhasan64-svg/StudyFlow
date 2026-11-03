import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, Download, Plus, Trash2, Upload } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle, SubjectDot } from './ui';
import { exportQuestions, parseQuestions } from '../lib/questionsIO';

export default function QuestionBank({ onBack }: { onBack: () => void }) {
  const questions = useApp((s) => s.questions);
  const subjects = useApp((s) => s.subjects);
  const addQuestion = useApp((s) => s.addQuestion);
  const removeQuestion = useApp((s) => s.removeQuestion);
  const importQuestions = useApp((s) => s.importQuestions);

  const [filter, setFilter] = useState<number | 'all'>('all');
  const [subjectId, setSubjectId] = useState<number | ''>(subjects[0]?.id ?? '');
  const [text, setText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [unit, setUnit] = useState('');
  const [year, setYear] = useState('');
  const [session, setSession] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inSubject = useMemo(
    () => (filter === 'all' ? questions : questions.filter((q) => q.subjectId === filter)),
    [questions, filter],
  );
  const units = useMemo(() => [...new Set(inSubject.map((q) => q.unit).filter(Boolean))] as string[], [inSubject]);
  const years = useMemo(
    () => [...new Set(inSubject.map((q) => q.year).filter((y): y is number => typeof y === 'number'))].sort((a, b) => b - a),
    [inSubject],
  );
  const list = useMemo(
    () =>
      inSubject.filter(
        (q) => (unitFilter === 'all' || q.unit === unitFilter) && (yearFilter === 'all' || String(q.year) === yearFilter),
      ),
    [inSubject, unitFilter, yearFilter],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (subjectId === '') return setMessage({ kind: 'err', text: 'اختر المادة أولاً' });
    if (!text.trim()) return setMessage({ kind: 'err', text: 'اكتب نص السؤال' });

    const filled = opts.map((t, i) => ({ t: t.trim(), i })).filter((o) => o.t);
    if (filled.length < 2) return setMessage({ kind: 'err', text: 'أدخل خيارين على الأقل' });
    if (!filled.some((o) => o.i === correct))
      return setMessage({ kind: 'err', text: 'الخيار المحدد كإجابة صحيحة فارغ' });

    const yearNum = Number(year);
    if (year.trim() && (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > 2100))
      return setMessage({ kind: 'err', text: 'سنة الدورة غير صالحة' });

    void addQuestion({
      subjectId,
      text: text.trim(),
      options: filled.map((o) => o.t),
      answerIndex: filled.findIndex((o) => o.i === correct),
      explanation: explanation.trim() || undefined,
      unit: unit.trim() || undefined,
      year: year.trim() ? yearNum : undefined,
      session: session.trim() || undefined,
    });
    setText('');
    setOpts(['', '', '', '']);
    setCorrect(0);
    setExplanation('');
    setMessage({ kind: 'ok', text: 'تمت إضافة السؤال' });
  };

  const doExport = () => {
    const blob = new Blob([exportQuestions(questions, subjects)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studyflow-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = parseQuestions(await file.text());
      const n = await importQuestions(parsed);
      setMessage({ kind: 'ok', text: `تم استيراد ${n} سؤال` });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'تعذّر استيراد الملف' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle
        title="إدارة الأسئلة"
        action={
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            <ArrowRight size={16} /> رجوع
          </button>
        }
      />

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-bold">سؤال جديد</h2>
        <div>
          <label className="label" htmlFor="qb-subject">
            المادة
          </label>
          <select
            id="qb-subject"
            className="input"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">— اختر —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="qb-unit">
              الوحدة
            </label>
            <input id="qb-unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="qb-year">
              سنة الدورة
            </label>
            <input id="qb-year" className="input" inputMode="numeric" placeholder="2024" value={year} onChange={(e) => setYear(e.target.value)} maxLength={4} />
          </div>
          <div>
            <label className="label" htmlFor="qb-session">
              الدورة
            </label>
            <input id="qb-session" className="input" placeholder="الأولى" value={session} onChange={(e) => setSession(e.target.value)} maxLength={30} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="qb-text">
            نص السؤال
          </label>
          <textarea id="qb-text" className="input min-h-20" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <fieldset className="space-y-2">
          <legend className="label">الخيارات (حدّد الإجابة الصحيحة)</legend>
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correct === i}
                onChange={() => setCorrect(i)}
                aria-label={`الخيار ${i + 1} هو الصحيح`}
                className="h-4 w-4 accent-[rgb(var(--accent))]"
              />
              <input
                className="input"
                placeholder={`الخيار ${i + 1}`}
                value={o}
                onChange={(e) => setOpts((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </div>
          ))}
        </fieldset>
        <div>
          <label className="label" htmlFor="qb-exp">
            شرح الإجابة (اختياري)
          </label>
          <input id="qb-exp" className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          <Plus size={16} /> إضافة السؤال
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.kind === 'ok' ? 'text-ok' : 'text-bad'}`}>
            {message.text}
          </p>
        )}
      </form>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">الأسئلة ({list.length})</h2>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost !py-1.5" onClick={doExport} disabled={questions.length === 0}>
              <Download size={15} /> تصدير
            </button>
            <button type="button" className="btn btn-ghost !py-1.5" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> استيراد
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
          </div>
        </div>
        <select
          className="input"
          aria-label="تصفية حسب المادة"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
            setUnitFilter('all');
            setYearFilter('all');
          }}
        >
          <option value="all">كل المواد</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {(units.length > 0 || years.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <select className="input" aria-label="تصفية حسب الوحدة" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
              <option value="all">كل الوحدات</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select className="input" aria-label="تصفية حسب السنة" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">كل السنوات</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
        {list.length === 0 ? (
          <Empty>لا أسئلة.</Empty>
        ) : (
          <ul className="space-y-2">
            {list.map((q) => (
              <li key={q.id} className="flex items-start gap-3 rounded-xl border border-line/70 bg-base/40 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{q.text}</p>
                  <p className="mt-1 text-xs text-ok">الصحيح: {q.options[q.answerIndex]}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <SubjectDot subjectId={q.subjectId} />
                    {q.unit && <span className="chip">{q.unit}</span>}
                    {q.year && (
                      <span className="chip">
                        {q.year}
                        {q.session ? ` · ${q.session}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="حذف السؤال"
                  onClick={() => void removeQuestion(q.id)}
                  className="rounded-lg p-2 text-muted transition hover:bg-bad/10 hover:text-bad"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
