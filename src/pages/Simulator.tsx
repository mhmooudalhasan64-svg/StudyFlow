import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, XCircle } from 'lucide-react';
import { useApp } from '../store';
import type { Question } from '../db';
import { Empty, NumberField, PageTitle } from '../components/ui';
import { formatClock, shuffle } from '../lib/utils';

type Phase = 'setup' | 'run' | 'result';

export default function Simulator() {
  const questions = useApp((s) => s.questions);
  const subjects = useApp((s) => s.subjects);
  const recordAttempt = useApp((s) => s.recordAttempt);
  const saveResult = useApp((s) => s.saveResult);

  const [phase, setPhase] = useState<Phase>('setup');
  const [subjectId, setSubjectId] = useState<number | 'all'>('all');
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(30);

  const [deck, setDeck] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [usedSec, setUsedSec] = useState(0);
  const [onlyWrong, setOnlyWrong] = useState(false);

  const endAt = useRef(0);
  const startedAt = useRef(0);
  const finished = useRef(false);

  const pool = useMemo(
    () => (subjectId === 'all' ? questions : questions.filter((q) => q.subjectId === subjectId)),
    [questions, subjectId],
  );
  const size = Math.min(count, pool.length);

  const start = () => {
    if (size === 0) return;
    const d = shuffle(pool).slice(0, size);
    setDeck(d);
    setAnswers(d.map(() => null));
    setIdx(0);
    setOnlyWrong(false);
    finished.current = false;
    startedAt.current = Date.now();
    endAt.current = Date.now() + minutes * 60_000;
    setRemainingMs(minutes * 60_000);
    setPhase('run');
  };

  const finish = (d: Question[], a: (number | null)[]) => {
    if (finished.current) return;
    finished.current = true;
    const seconds = Math.min(
      Math.round((Date.now() - startedAt.current) / 1000),
      minutes * 60,
    );
    setUsedSec(seconds);
    const score = d.reduce((n, q, i) => (a[i] === q.answerIndex ? n + 1 : n), 0);
    setPhase('result');
    void (async () => {
      for (let i = 0; i < d.length; i++) {
        const picked = a[i];
        if (picked !== null) await recordAttempt(d[i], picked === d[i].answerIndex);
      }
      await saveResult({
        kind: 'simulator',
        subjectId: subjectId === 'all' ? null : subjectId,
        score,
        total: d.length,
        seconds,
      });
    })();
  };

  // عدّاد الوقت
  useEffect(() => {
    if (phase !== 'run') return;
    const id = window.setInterval(() => {
      const left = endAt.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        finish(deck, answers);
      } else {
        setRemainingMs(left);
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deck, answers]);

  const pick = (i: number) => setAnswers((a) => a.map((x, j) => (j === idx ? i : x)));

  // ---------- الإعداد ----------
  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageTitle title="محاكي الامتحان النهائي" subtitle="نموذج امتحاني بوقت محدد، والنتيجة والأخطاء في النهاية" />
        <div className="card space-y-4">
          <div>
            <label className="label" htmlFor="sim-subject">
              المادة
            </label>
            <select
              id="sim-subject"
              className="input"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">كل المواد ({questions.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({questions.filter((q) => q.subjectId === s.id).length})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="عدد الأسئلة" value={count} min={1} max={100} onCommit={setCount} />
            <NumberField label="مدة الامتحان" unit="دقيقة" value={minutes} min={1} max={240} onCommit={setMinutes} />
          </div>
          {pool.length === 0 ? (
            <Empty>لا أسئلة في هذه المادة. أضف أسئلة من بنك الأسئلة أولاً.</Empty>
          ) : (
            <>
              {size < count && <p className="text-xs text-muted">المتاح {pool.length} سؤال فقط، سيحتوي النموذج {size}.</p>}
              <button type="button" className="btn btn-primary w-full !py-3" onClick={start}>
                <Clock size={16} /> ابدأ الامتحان ({size} سؤال · {minutes} د)
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- النتيجة ----------
  if (phase === 'result') {
    const score = deck.reduce((n, q, i) => (answers[i] === q.answerIndex ? n + 1 : n), 0);
    const unanswered = answers.filter((a) => a === null).length;
    const pct = deck.length ? Math.round((score / deck.length) * 100) : 0;
    const rows = deck
      .map((q, i) => ({ q, i, picked: answers[i] }))
      .filter((r) => !onlyWrong || r.picked !== r.q.answerIndex);

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageTitle title="نتيجة الامتحان" />
        <div className="card text-center">
          <p className="text-5xl font-extrabold">{pct}%</p>
          <p className="mt-1 text-muted">
            {score} من {deck.length} صحيحة · {deck.length - score - unanswered} خاطئة · {unanswered} دون إجابة
          </p>
          <p className="mt-1 text-xs text-muted">الزمن المستغرق: {formatClock(usedSec * 1000)}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn btn-primary" onClick={start}>
              نموذج جديد
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPhase('setup')}>
              تغيير الإعدادات
            </button>
          </div>
        </div>

        <section className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">الإجابات</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--accent))]"
                checked={onlyWrong}
                onChange={(e) => setOnlyWrong(e.target.checked)}
              />
              الأخطاء فقط
            </label>
          </div>
          {rows.length === 0 ? (
            <Empty>لا أخطاء، أحسنت!</Empty>
          ) : (
            <ul className="space-y-3">
              {rows.map(({ q, i, picked }) => {
                const ok = picked === q.answerIndex;
                return (
                  <li key={q.id} className="rounded-xl border border-line/70 p-3 text-sm">
                    <p className="flex items-start gap-2 font-medium">
                      {ok ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" />
                      ) : (
                        <XCircle size={18} className="mt-0.5 shrink-0 text-bad" />
                      )}
                      <span>
                        {i + 1}. {q.text}
                      </span>
                    </p>
                    {!ok && (
                      <p className="mt-1 text-bad">
                        إجابتك: {picked === null ? 'لم تُجب' : q.options[picked]}
                      </p>
                    )}
                    <p className="mt-1 text-ok">الصحيح: {q.options[q.answerIndex]}</p>
                    {q.explanation && <p className="mt-1 text-muted">{q.explanation}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // ---------- أثناء الامتحان ----------
  const q = deck[idx];
  const low = remainingMs < 60_000;
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          السؤال {idx + 1} من {deck.length} · أجبت {answeredCount}
        </span>
        <span className={`font-mono text-lg font-bold ${low ? 'text-bad' : ''}`} role="timer" aria-label="الوقت المتبقي">
          {formatClock(remainingMs)}
        </span>
      </div>

      <div className="card space-y-4">
        <p className="text-lg font-bold leading-relaxed">{q.text}</p>
        <ul className="space-y-2">
          {q.options.map((opt, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(i)}
                aria-pressed={answers[idx] === i}
                className={`w-full rounded-xl border px-4 py-3 text-start text-sm transition ${
                  answers[idx] === i ? 'border-accent bg-accent/10' : 'border-line hover:border-accent'
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="التنقل بين الأسئلة">
        {deck.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`السؤال ${i + 1}`}
            aria-current={i === idx ? 'true' : undefined}
            className={`h-8 w-8 rounded-lg border text-xs font-semibold ${
              i === idx
                ? 'border-accent bg-accent text-onaccent'
                : answers[i] !== null
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-line text-muted'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
          <ChevronRight size={16} /> السابق
        </button>
        <button type="button" className="btn btn-ghost" disabled={idx + 1 >= deck.length} onClick={() => setIdx(idx + 1)}>
          التالي <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const left = answers.filter((a) => a === null).length;
            if (left === 0 || window.confirm(`لديك ${left} سؤال دون إجابة. إنهاء الامتحان؟`)) finish(deck, answers);
          }}
        >
          إنهاء
        </button>
      </div>
    </div>
  );
}
