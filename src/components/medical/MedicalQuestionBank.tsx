import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookCheck, CheckCircle2, ClipboardList, Loader2, Sparkles, XCircle } from 'lucide-react';
import { db, type MedicalQuestion } from '../../db';
import { requestMedicalQuiz } from '../../lib/chatStore';
import { filterMedicalQuestions, parseMedicalQuestions, recordMedicalAnswer, saveMedicalQuestions } from '../../lib/medicalQuestionBank';

interface Props {
  college: string;
  year: string;
  subject: string;
  sourceText: string;
  sourceName: string;
}

export function MedicalQuestionBank({ college, year, subject, sourceText, sourceName }: Props) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<MedicalQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerBusy, setAnswerBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'weak' | 'new'>('all');
  const generationRequestId = useRef(0);
  const contextKey = `${college}|${year}|${subject.trim()}`;
  const activeContext = useRef(contextKey);

  const refresh = useCallback(async () => {
    const requestContext = contextKey;
    const rows = await db.medicalQuestions.where('college').equals(college).toArray();
    if (activeContext.current !== requestContext) return;
    const filtered = rows.filter((q) => q.year === year && (!subject.trim() || q.subject === subject.trim()))
      .sort((a, b) => (a.attempts - b.attempts) || (b.createdAt - a.createdAt));
    setQuestions(filtered);
    setActiveIndex(0);
    setSelected(null);
  }, [college, year, subject, contextKey]);

  useEffect(() => {
    activeContext.current = contextKey;
    generationRequestId.current += 1;
    setBusy(false);
    setAnswerBusy(false);
    setSelected(null);
    setActiveIndex(0);
    let alive = true;
    void db.medicalQuestions.where('college').equals(college).toArray().then((rows) => {
      if (!alive) return;
      setQuestions(rows.filter((q) => q.year === year && (!subject.trim() || q.subject === subject.trim()))
        .sort((a, b) => (a.attempts - b.attempts) || (b.createdAt - a.createdAt)));
    }).catch(() => { if (alive) setError('تعذّر تحميل بنك الأسئلة المحفوظ.'); });
    return () => { alive = false; };
  }, [college, year, subject, contextKey]);

  const active = questions[activeIndex] ?? null;
  const correctTotal = useMemo(() => questions.reduce((sum, q) => sum + q.correctAttempts, 0), [questions]);
  const attemptsTotal = useMemo(() => questions.reduce((sum, q) => sum + q.attempts, 0), [questions]);
  const accuracy = attemptsTotal ? Math.round((correctTotal / attemptsTotal) * 100) : 0;
  const historyQuestions = useMemo(
    () => filterMedicalQuestions(questions, historyFilter),
    [questions, historyFilter],
  );

  const generate = async () => {
    if (!topic.trim() && sourceText.trim().length < 40) {
      setError('اكتب موضوعاً طبياً أو حمّل محاضرة نصية أولاً.');
      return;
    }
    const requestId = ++generationRequestId.current;
    const requestContext = { college, year, subject, sourceText, sourceName, topic, count };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const raw = await requestMedicalQuiz({
        topic: requestContext.topic, count: requestContext.count,
        college: requestContext.college, year: requestContext.year, subject: requestContext.subject,
        ...(requestContext.sourceText.trim().length >= 40 ? { source: { name: requestContext.sourceName, text: requestContext.sourceText } } : {}),
      });
      if (requestId !== generationRequestId.current) return;
      const drafts = parseMedicalQuestions(raw);
      const added = await saveMedicalQuestions({
        drafts, college: requestContext.college, year: requestContext.year,
        subject: requestContext.subject.trim() || requestContext.topic.trim() || 'موضوع طبي',
        sourceName: requestContext.sourceText.trim().length >= 40 ? requestContext.sourceName : 'توليد موضوعي',
      });
      if (requestId !== generationRequestId.current) return;
      await refresh();
      if (requestId === generationRequestId.current) {
        setNotice(added ? `أُضيفت ${added} أسئلة جديدة إلى بنكك. الأسئلة المكررة لم تُحفظ ثانية.` : 'الأسئلة الناتجة محفوظة مسبقاً؛ لم تتم إضافة نسخ مكررة.');
      }
    } catch (cause) {
      if (requestId === generationRequestId.current) setError(cause instanceof Error ? cause.message : 'تعذّر إنشاء بنك الأسئلة.');
    } finally {
      if (requestId === generationRequestId.current) setBusy(false);
    }
  };

  const answer = async (index: number) => {
    if (!active || selected !== null || answerBusy) return;
    setAnswerBusy(true);
    setError('');
    const answerContext = contextKey;
    try {
      await recordMedicalAnswer(active, index);
    } catch {
      if (activeContext.current === answerContext) {
        setError('تعذّر تسجيل المحاولة محلياً؛ لم يتم اعتماد الإجابة. يمكنك المحاولة مجدداً.');
        setAnswerBusy(false);
      }
      return;
    }
    if (activeContext.current !== answerContext) return;
    setSelected(index);
    try {
      // Keep the answered question visible without resetting its feedback state.
      const refreshed = await db.medicalQuestions.where('college').equals(college).toArray();
      if (activeContext.current !== answerContext) return;
      const filtered = refreshed.filter((q) => q.year === year && (!subject.trim() || q.subject === subject.trim()));
      const answered = filtered.find((q) => q.id === active.id);
      const others = filtered.filter((q) => q.id !== active.id).sort((a, b) => a.attempts - b.attempts);
      setQuestions([...(answered ? [answered] : []), ...others]);
      setActiveIndex(0);
    } catch {
      setError('تم تسجيل الإجابة، لكن تعذّر تحديث ترتيب سجل الأسئلة. أعد تحميل القسم لمتابعة المراجعة.');
    } finally {
      setAnswerBusy(false);
    }
  };

  const next = () => {
    setSelected(null);
    setActiveIndex((current) => (current + 1) % Math.max(questions.length, 1));
  };

  return (
    <section className="card space-y-4 !p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <span className="feature-icon feature-icon-blue"><ClipboardList size={21}/></span>
        <div><h3 className="font-extrabold">بنك الأسئلة الطبية</h3><p className="mt-1 text-xs leading-6 text-muted">أسئلة تطبيقية بأربعة خيارات، مع تفسير كل بديل وتسجيل محاولاتك محلياً.</p></div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">الأسئلة المحفوظة</p><p className="mt-1 text-xl font-black tabular-nums">{questions.length}</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">المحاولات</p><p className="mt-1 text-xl font-black tabular-nums">{attemptsTotal}</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">الدقة الإجمالية</p><p className="mt-1 text-xl font-black tabular-nums">{accuracy}%</p></div>
      </div>

      <div className="space-y-3 rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">إنشاء مجموعة أسئلة</h4><span className="text-[10px] text-muted">{sourceText.trim().length >= 40 ? 'سيُستخدم نص المحاضرة الحالية' : 'توليد من موضوع محدد'}</span></div>
        <label className="block space-y-1 text-xs font-semibold text-muted">الموضوع أو الجهاز أو المحور
          <input className="input" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={180} placeholder="مثلاً: فيزيولوجيا القلب، أو آليات عمل المضادات الحيوية"/>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">عدد الأسئلة
            <select className="input !w-auto !py-2" value={count} onChange={(event) => setCount(Number(event.target.value))}>
              <option value={5}>5 أسئلة</option><option value={10}>10 أسئلة</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary ms-auto" onClick={() => void generate()} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin"/> : <Sparkles size={15}/>} {busy ? 'جارٍ إنشاء الأسئلة…' : 'إنشاء الأسئلة'}
          </button>
        </div>
      </div>

      {active && (
        <div className="space-y-3 rounded-2xl border border-accent/25 bg-accent/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
            <span>السؤال {activeIndex + 1} من {questions.length}</span>
            <span>{active.subject} · السنة {active.year}</span>
          </div>
          {active.vignette && <p className="rounded-xl bg-base/80 p-3 text-xs leading-7">{active.vignette}</p>}
          <h4 className="text-sm font-extrabold leading-7">{active.stem}</h4>
          <div className="space-y-2">
            {active.options.map((option, index) => {
              const isCorrect = index === active.answerIndex;
              const chosen = selected === index;
              const style = selected === null ? 'border-line bg-card hover:border-accent/50' : isCorrect ? 'border-good bg-good/10' : chosen ? 'border-bad bg-bad/10' : 'border-line bg-card opacity-75';
              return (
                <button key={index} type="button" disabled={selected !== null || answerBusy} aria-pressed={selected === index} onClick={() => void answer(index)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-right text-xs leading-6 transition ${style}`}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-base text-[10px] font-black">{['A','B','C','D'][index]}</span>
                  <span className="flex-1">{option}</span>
                  {selected !== null && isCorrect && <CheckCircle2 size={17} className="shrink-0 text-good"/>}
                  {selected !== null && chosen && !isCorrect && <XCircle size={17} className="shrink-0 text-bad"/>}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div role="status" aria-live="polite" className="space-y-3 rounded-xl bg-card p-3">
              <p className={`text-sm font-extrabold ${selected === active.answerIndex ? 'text-good' : 'text-bad'}`}>{selected === active.answerIndex ? 'إجابة صحيحة' : `الإجابة الصحيحة: ${['A','B','C','D'][active.answerIndex]}`}</p>
              <div className="space-y-2">{active.explanations.map((explanation, index) => <p key={index} className="text-xs leading-6"><strong>{['A','B','C','D'][index]}:</strong> {explanation}</p>)}</div>
              {active.rationale && <p className="border-t border-line pt-2 text-xs leading-6 text-muted">{active.rationale}</p>}
              {active.learningPoint && <p className="rounded-lg bg-accent/10 p-2 text-xs leading-6"><strong>نقطة التعلم:</strong> {active.learningPoint}</p>}
              {active.sourceQuote && <p className="text-[10px] leading-5 text-muted">من المحاضرة: «{active.sourceQuote}»</p>}
              <button type="button" className="btn btn-primary w-full" onClick={next}>السؤال التالي</button>
            </div>
          )}
        </div>
      )}

      {!active && <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs leading-6 text-muted">لا توجد أسئلة محفوظة لهذه الكلية والسنة. أنشئ مجموعة أسئلة لتبدأ التدريب.</div>}
      {questions.length > 0 && <button type="button" className="inline-flex items-center gap-2 text-xs font-semibold text-accent" onClick={() => setShowAll((v) => !v)}><BookCheck size={14}/>{showAll ? 'إخفاء سجل الأسئلة' : 'عرض سجل الأسئلة'}</button>}
      {showAll && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية سجل الأسئلة">
            {([
              { value: 'all', label: 'كل الأسئلة' },
              { value: 'weak', label: 'تحتاج مراجعة' },
              { value: 'new', label: 'لم تُحل بعد' },
            ] as const).map((filter) => (
              <button key={filter.value} type="button" aria-pressed={historyFilter === filter.value}
                onClick={() => setHistoryFilter(filter.value)}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${historyFilter === filter.value ? 'bg-accent text-white' : 'border border-line bg-base text-muted'}`}>
                {filter.label}
              </button>
            ))}
          </div>
          {historyQuestions.length ? (
            <div className="space-y-2">{historyQuestions.map((q) => {
              const index = questions.findIndex((item) => item.id === q.id);
              return <button type="button" key={q.id} onClick={() => { setActiveIndex(index); setSelected(null); }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-right text-xs transition ${active?.id === q.id ? 'border-accent bg-accent/5' : 'border-line'}`}>
                <span className="line-clamp-2">{q.stem}</span>
                <span className="shrink-0 text-muted">{q.attempts ? `${Math.round(q.correctAttempts / q.attempts * 100)}%` : 'جديد'}</span>
              </button>;
            })}</div>
          ) : <p className="rounded-lg bg-base p-3 text-xs text-muted">لا توجد أسئلة ضمن هذا التصنيف حالياً.</p>}
        </div>
      )}
      {notice && <p role="status" className="rounded-lg bg-base p-3 text-xs leading-6 text-muted">{notice}</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad/10 p-3 text-xs leading-6 text-bad"><AlertCircle size={15} className="mt-0.5 shrink-0"/>{error}</p>}
      <p className="text-[10px] leading-5 text-muted">الأسئلة سيناريوهات افتراضية للتدريب الأكاديمي فقط. قد يخطئ النموذج؛ تحقق من الإجابات بمراجع تخصصك. لا تستخدمها لاتخاذ قرارات تخص مرضى حقيقيين.</p>
    </section>
  );
}
