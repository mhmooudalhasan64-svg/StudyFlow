import { useMemo, useState } from 'react';
import { CheckCircle2, Database, RotateCcw, XCircle } from 'lucide-react';
import { useApp } from '../store';
import type { Question } from '../db';
import QuestionBank from '../components/QuestionBank';
import { Empty, PageTitle } from '../components/ui';
import { shuffle } from '../lib/utils';

type Phase = 'menu' | 'play' | 'result' | 'bank';

const COUNTS = [5, 10, 20];

export default function Quiz() {
  const questions = useApp((s) => s.questions);
  const subjects = useApp((s) => s.subjects);
  const recordAttempt = useApp((s) => s.recordAttempt);

  const [phase, setPhase] = useState<Phase>('menu');
  const [subjectId, setSubjectId] = useState<number | 'all'>('all');
  const [count, setCount] = useState(10);
  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<Question[]>([]);

  const pool = useMemo(
    () => (subjectId === 'all' ? questions : questions.filter((q) => q.subjectId === subjectId)),
    [questions, subjectId],
  );

  const begin = (list: Question[]) => {
    if (list.length === 0) return;
    setDeck(list);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setWrong([]);
    setPhase('play');
  };

  const start = () => begin(shuffle(pool).slice(0, count));

  const q = deck[idx];

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const ok = i === q.answerIndex;
    if (ok) setScore((s) => s + 1);
    else setWrong((w) => [...w, q]);
    void recordAttempt(q, ok);
  };

  const next = () => {
    if (idx + 1 >= deck.length) {
      setPhase('result');
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  if (phase === 'bank') {
    return <QuestionBank onBack={() => setPhase('menu')} />;
  }

  if (phase === 'play' && q) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            السؤال {idx + 1} من {deck.length}
          </span>
          <span>الصحيحة: {score}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line/60">
          <div
            className="h-full rounded-full bg-gradient-to-l from-accent to-accent2 transition-all"
            style={{ width: `${(idx / deck.length) * 100}%` }}
          />
        </div>

        <div className="card space-y-4">
          <p className="text-lg font-bold leading-relaxed">{q.text}</p>
          <ul className="space-y-2">
            {q.options.map((opt, i) => {
              const isAnswer = i === q.answerIndex;
              const isPicked = i === picked;
              let style = 'border-line hover:border-accent';
              if (picked !== null) {
                if (isAnswer) style = 'border-ok bg-ok/10';
                else if (isPicked) style = 'border-bad bg-bad/10';
                else style = 'border-line opacity-60';
              }
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => answer(i)}
                    disabled={picked !== null}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start text-sm transition ${style}`}
                  >
                    <span>{opt}</span>
                    {picked !== null && isAnswer && <CheckCircle2 className="shrink-0 text-ok" size={18} />}
                    {picked !== null && isPicked && !isAnswer && <XCircle className="shrink-0 text-bad" size={18} />}
                  </button>
                </li>
              );
            })}
          </ul>
          {picked !== null && (
            <div className="space-y-3" aria-live="polite">
              <p className={`text-sm font-bold ${picked === q.answerIndex ? 'text-ok' : 'text-bad'}`}>
                {picked === q.answerIndex ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
              </p>
              {q.explanation && <p className="text-sm text-muted">{q.explanation}</p>}
              <button type="button" className="btn btn-primary w-full" onClick={next}>
                {idx + 1 >= deck.length ? 'عرض النتيجة' : 'السؤال التالي'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const pct = deck.length ? Math.round((score / deck.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageTitle title="النتيجة" />
        <div className="card text-center">
          <p className="text-5xl font-extrabold">{pct}%</p>
          <p className="mt-1 text-muted">
            {score} من {deck.length} إجابة صحيحة
          </p>
          <p className="mt-3 text-sm">
            {pct >= 80 ? 'ممتاز! مستواك متقدم.' : pct >= 50 ? 'جيد، راجع الأسئلة الخاطئة لترتفع نتيجتك.' : 'لا بأس — الأخطاء أفضل طريقة للتعلّم، أعد المحاولة.'}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn btn-primary" onClick={start}>
              <RotateCcw size={16} /> اختبار جديد
            </button>
            {wrong.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => begin(shuffle(wrong))}>
                أعد الأسئلة الخاطئة ({wrong.length})
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setPhase('menu')}>
              القائمة
            </button>
          </div>
        </div>
        {wrong.length > 0 && (
          <section className="card">
            <h2 className="mb-3 font-bold">أسئلة أخطأت فيها</h2>
            <ul className="space-y-3">
              {wrong.map((w) => (
                <li key={w.id} className="rounded-xl border border-line/70 p-3 text-sm">
                  <p className="font-medium">{w.text}</p>
                  <p className="mt-1 text-ok">الصحيح: {w.options[w.answerIndex]}</p>
                  {w.explanation && <p className="mt-1 text-muted">{w.explanation}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle
        title="بنك الأسئلة والاختبارات"
        subtitle="اختبر نفسك بأسئلة من موادك أو أضف أسئلتك الخاصة"
        action={
          <button type="button" className="btn btn-ghost" onClick={() => setPhase('bank')}>
            <Database size={16} /> إدارة الأسئلة
          </button>
        }
      />
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="quiz-subject">
            المادة
          </label>
          <select
            id="quiz-subject"
            className="input"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">كل المواد ({questions.length})</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({questions.filter((x) => x.subjectId === s.id).length})
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">عدد الأسئلة</span>
          <div className="grid grid-cols-3 gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={count === c}
                onClick={() => setCount(c)}
                className={`btn ${count === c ? 'btn-primary' : 'btn-ghost'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        {pool.length === 0 ? (
          <Empty>لا أسئلة في هذه المادة بعد. أضف بعضها من «إدارة الأسئلة».</Empty>
        ) : (
          <button type="button" className="btn btn-primary w-full !py-3" onClick={start}>
            ابدأ الاختبار ({Math.min(count, pool.length)} أسئلة)
          </button>
        )}
      </div>
    </div>
  );
}
