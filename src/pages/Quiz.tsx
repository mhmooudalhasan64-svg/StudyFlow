import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, Database, Flame, Target, Loader2, MessageCircleQuestion, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { useApp } from '../store';
import type { Question } from '../db';
import QuestionBank from '../components/QuestionBank';
import BookQuiz from '../components/BookQuiz';
import { Empty, PageTitle } from '../components/ui';
import { shuffle, toDateKey } from '../lib/utils';
import { requestQuiz, useChat } from '../lib/chatStore';
import { parseGeneratedQuiz } from '../lib/questionsIO';
import { currentMistakes, dailyResult, mistakesBySubject, mistakesPrompt, pickDaily, weakUnits } from '../lib/practice';
import { XP_RULES } from '../lib/xp';

type Phase = 'menu' | 'play' | 'result' | 'bank';

const COUNTS = [5, 10, 20];

export default function Quiz() {
  const questions = useApp((s) => s.questions);
  const subjects = useApp((s) => s.subjects);
  const recordAttempt = useApp((s) => s.recordAttempt);
  const saveResult = useApp((s) => s.saveResult);
  const attempts = useApp((s) => s.attempts);
  const results = useApp((s) => s.results);
  const importQuestions = useApp((s) => s.importQuestions);
  const chatFile = useChat((s) => s.attachment);

  const [phase, setPhase] = useState<Phase>('menu');
  const [subjectId, setSubjectId] = useState<number | 'all'>('all');
  const [count, setCount] = useState(10);
  const [deck, setDeck] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<Question[]>([]);
  const [unit, setUnit] = useState('all');
  const [year, setYear] = useState('all');
  const startedAt = useRef(Date.now());
  const [mode, setMode] = useState<'normal' | 'daily'>('normal');
  const [dailyFirst, setDailyFirst] = useState(false);
  const [topic, setTopic] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const today = toDateKey();
  const mistakes = useMemo(() => currentMistakes(attempts, questions), [attempts, questions]);
  const weak = useMemo(() => weakUnits(attempts, questions), [attempts, questions]);
  const mistakeStats = useMemo(
    () =>
      [...mistakesBySubject(mistakes)]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n]) => `${subjects.find((s) => s.id === id)?.name ?? '—'} (${n})`),
    [mistakes, subjects],
  );
  const dailyDeck = useMemo(() => pickDaily(questions, attempts, today, 5), [questions, attempts, today]);
  const dailyDone = dailyResult(results, today);

  const bySubject = useMemo(
    () => (subjectId === 'all' ? questions : questions.filter((q) => q.subjectId === subjectId)),
    [questions, subjectId],
  );
  const units = useMemo(() => [...new Set(bySubject.map((q) => q.unit).filter(Boolean))] as string[], [bySubject]);
  const years = useMemo(
    () => [...new Set(bySubject.map((q) => q.year).filter((y): y is number => typeof y === 'number'))].sort((a, b) => b - a),
    [bySubject],
  );
  const pool = useMemo(
    () =>
      bySubject.filter(
        (q) => (unit === 'all' || q.unit === unit) && (year === 'all' || String(q.year) === year),
      ),
    [bySubject, unit, year],
  );

  const begin = (list: Question[], m: 'normal' | 'daily' = 'normal') => {
    if (list.length === 0) return;
    setMode(m);
    setDeck(list);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setWrong([]);
    startedAt.current = Date.now();
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
      const sameSubject = deck.every((d) => d.subjectId === deck[0].subjectId);
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      if (mode === 'daily') {
        // المكافأة مرة واحدة يومياً؛ إعادة المحاولة لا تُسجَّل كنتيجة جديدة
        const first = !dailyResult(results, today);
        setDailyFirst(first);
        if (first) void saveResult({ kind: 'daily', subjectId: null, score, total: deck.length, seconds });
      } else {
        void saveResult({
          kind: 'quiz',
          subjectId: sameSubject ? deck[0].subjectId : null,
          score,
          total: deck.length,
          seconds,
        });
      }
      setPhase('result');
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  const generate = async () => {
    const subject = subjects.find((x) => x.id === subjectId);
    if (!subject) return;
    setGenError('');
    setGenerating(true);
    try {
      const raw = await requestQuiz({ topic: topic.trim(), count: genCount, subject: subject.name });
      const parsed = parseGeneratedQuiz(raw, subject.name);
      await importQuestions(parsed);
      const texts = new Set(parsed.map((x) => x.text));
      const fresh = useApp.getState().questions.filter((x) => x.subjectId === subject.id && texts.has(x.text));
      begin(shuffle(fresh));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'تعذّر إنشاء الاختبار');
    } finally {
      setGenerating(false);
    }
  };

  /** يطلب من المعلّم الذكي شرح سؤال أخطأ فيه الطالب (ينتقل إلى صفحة المساعد) */
  const explainWithTutor = (w: Question) => {
    const prompt = `أخطأت في هذا السؤال، اشرح لي بإيجاز لماذا الإجابة الصحيحة هي ما يلي:\nالسؤال: ${w.text}\nالخيارات: ${w.options.join(' / ')}\nالإجابة الصحيحة: ${w.options[w.answerIndex]}`;
    void useChat.getState().send(prompt);
    window.location.hash = '#/assistant';
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
          {mode === 'daily' && (
            <p className="mt-2 text-sm text-accent">
              {dailyFirst
                ? `تحدي اليوم: +${XP_RULES.perExamResult} نقطة مكافأة، إضافة إلى نقاط كل إجابة.`
                : 'حللت تحدي اليوم من قبل. المكافأة تُمنح مرة واحدة يومياً.'}
            </p>
          )}
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
                  {w.explanation ? (
                    <p className="mt-1 text-muted">{w.explanation}</p>
                  ) : (
                    <button type="button" className="btn btn-ghost mt-2 !py-1.5 text-xs" onClick={() => explainWithTutor(w)}>
                      <MessageCircleQuestion size={14} /> اطلب شرحاً من المعلّم
                    </button>
                  )}
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
      <section className="card space-y-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Flame size={18} className="text-accent" /> تحدي اليوم
        </h2>
        {dailyDeck.length === 0 ? (
          <p className="text-sm text-muted">أضف أسئلة إلى البنك ليظهر لك تحدي يومي.</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {dailyDone
                ? `أنجزته اليوم: ${dailyDone.score} من ${dailyDone.total}. عُد غداً لتحدٍّ جديد.`
                : `${dailyDeck.length} أسئلة بعضها من أخطائك السابقة. تكسب نقاطاً إضافية عند إكماله.`}
            </p>
            <button type="button" className="btn btn-primary w-full" onClick={() => begin(dailyDeck, 'daily')}>
              {dailyDone ? 'أعد المحاولة (بدون مكافأة)' : 'ابدأ تحدي اليوم'}
            </button>
          </>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="flex items-center gap-2 font-bold">
          <ClipboardList size={18} className="text-accent" /> دفتر أخطائي
        </h2>
        {mistakes.length === 0 ? (
          <p className="text-sm text-muted">لا أخطاء حالية. أي سؤال تخطئ فيه يظهر هنا حتى تجيب عنه صحيحاً.</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              عندك {mistakes.length} سؤالاً لم تُتقنه بعد. الأكثر: {mistakeStats.join('، ')}.
            </p>
            <button type="button" className="btn btn-primary w-full" onClick={() => begin(shuffle(mistakes).slice(0, 20))}>
              راجع أخطائي ({Math.min(mistakes.length, 20)})
            </button>
            {mistakes.length >= 2 && (
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => {
                  const name = (id: number) => subjects.find((s) => s.id === id)?.name ?? 'مادة';
                  void useChat.getState().send(mistakesPrompt(mistakes, name));
                  window.location.hash = '#/assistant';
                }}
              >
                <MessageCircleQuestion size={16} /> حلّل أخطائي مع المعلّم
              </button>
            )}
          </>
        )}
      </section>

      {weak.length > 0 && (
        <section className="card space-y-2">
          <h2 className="flex items-center gap-2 font-bold">
            <Target size={18} className="text-accent" /> أضعف وحداتك
          </h2>
          <p className="text-xs text-muted">وحدات دقتك فيها أقل من 70%. تدرّب عليها مباشرة:</p>
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={`${w.subjectId}-${w.unit}`} className="flex items-center gap-2 rounded-xl border border-line/70 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{w.unit}</span>
                  <span className="text-xs text-muted">
                    {subjects.find((s) => s.id === w.subjectId)?.name} • دقتك {Math.round(w.accuracy * 100)}% ({w.attempts} محاولات)
                  </span>
                </span>
                <button type="button" className="btn btn-primary shrink-0 !py-1.5 text-xs" onClick={() => begin(shuffle(w.questions).slice(0, 15))}>
                  تدرّب
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Sparkles size={18} className="text-accent" /> اختبار ذكي بالمساعد
        </h2>
        <p className="text-xs text-muted">
          يكتب المساعد أسئلة بأربعة خيارات ويحفظها في بنكك. اختر المادة من الأسفل، واكتب الموضوع.
          {chatFile ? ` سيُستخدم أيضاً الملف المرفق في المساعد (${chatFile.name}).` : ''}
        </p>
        <input
          className="input"
          placeholder="الموضوع، مثل: الاشتقاق، أو قانون نيوتن الثاني"
          aria-label="موضوع الاختبار الذكي"
          value={topic}
          maxLength={120}
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className="flex gap-2">
          {[5, 8, 10].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={genCount === c}
              onClick={() => setGenCount(c)}
              className={`btn flex-1 ${genCount === c ? 'btn-primary' : 'btn-ghost'}`}
            >
              {c}
            </button>
          ))}
        </div>
        {subjectId === 'all' && <p className="text-xs text-bad">اختر مادة محددة من القائمة بالأسفل أولاً.</p>}
        {genError && (
          <p role="alert" className="text-sm text-bad">
            {genError}
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={generating || subjectId === 'all' || (!topic.trim() && !chatFile)}
          onClick={() => void generate()}
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? 'جارٍ إنشاء الأسئلة…' : 'أنشئ اختباراً'}
        </button>
      </section>

      <BookQuiz onStart={(list) => begin(list)} />

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="quiz-subject">
            المادة
          </label>
          <select
            id="quiz-subject"
            className="input"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value === 'all' ? 'all' : Number(e.target.value));
              setUnit('all');
              setYear('all');
            }}
          >
            <option value="all">كل المواد ({questions.length})</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({questions.filter((x) => x.subjectId === s.id).length})
              </option>
            ))}
          </select>
        </div>
        {(units.length > 0 || years.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="quiz-unit">
                الوحدة
              </label>
              <select id="quiz-unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="all">كل الوحدات</option>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="quiz-year">
                سنة الدورة
              </label>
              <select id="quiz-year" className="input" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="all">كل السنوات</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
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
