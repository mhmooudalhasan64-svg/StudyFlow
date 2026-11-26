import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookCheck, CheckCircle2, ClipboardList, Loader2, Sparkles, XCircle } from 'lucide-react';
import { db, type MedicalQuestion } from '../../db';
import { requestMedicalQuiz } from '../../lib/chatStore';
import { parseMedicalQuestions, recordMedicalAnswer, saveMedicalQuestions } from '../../lib/medicalQuestionBank';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAll, setShowAll] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await db.medicalQuestions.where('college').equals(college).toArray();
    const filtered = rows.filter((q) => q.year === year && (!subject.trim() || q.subject === subject.trim()))
      .sort((a, b) => (a.attempts - b.attempts) || (b.createdAt - a.createdAt));
    setQuestions(filtered);
    setActiveIndex(0);
    setSelected(null);
  }, [college, year, subject]);

  useEffect(() => {
    let alive = true;
    void db.medicalQuestions.where('college').equals(college).toArray().then((rows) => {
      if (!alive) return;
      setQuestions(rows.filter((q) => q.year === year && (!subject.trim() || q.subject === subject.trim()))
        .sort((a, b) => (a.attempts - b.attempts) || (b.createdAt - a.createdAt)));
    }).catch(() => { if (alive) setError('تعذّر تحميل بنك الأسئلة المحفوظ.'); });
    return () => { alive = false; };
  }, [college, year, subject]);

  const active = questions[activeIndex] ?? null;
  const correctTotal = useMemo(() => questions.reduce((sum, q) => sum + q.correctAttempts, 0), [questions]);
  const attemptsTotal = useMemo(() => questions.reduce((sum, q) => sum + q.attempts, 0), [questions]);
  const accuracy = attemptsTotal ? Math.round((correctTotal / attemptsTotal) * 100) : 0;

  const generate = async () => {
    if (!topic.trim() && sourceText.trim().length < 40) {
      setError('اكتب موضوعاً طبياً أو حمّل محاضرة نصية أولاً.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const raw = await requestMedicalQuiz({
        topic, count, college, year, subject,
        ...(sourceText.trim().length >= 40 ? { source: { name: sourceName, text: sourceText } } : {}),
      });
      const drafts = parseMedicalQuestions(raw);
      const added = await saveMedicalQuestions({
        drafts, college, year, subject: subject.trim() || topic.trim() || 'موضوع طبي',
        sourceName: sourceText.trim().length >= 40 ? sourceName : 'توليد موضوعي',
      });
      await refresh();
      setNotice(added ? `أُضيفت ${added} أسئلة جديدة إلى بنكك. الأسئلة المكررة لم تُحفظ ثانية.` : 'الأسئلة الناتجة محفوظة مسبقاً؛ لم تتم إضافة نسخ مكررة.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر إنشاء بنك الأسئلة.');
    } finally {
      setBusy(false);
    }
  };

  const answer = async (index: number) => {
    if (!active || selected !== null) return;
    setSelected(index);
    try {
      await recordMedicalAnswer(active, index);
      await refresh();
      setSelected(index);
      // Keep the just-answered question visible; refresh preserves the list but reorders by attempts.
      const refreshed = await db.medicalQuestions.where('college').equals(college).toArray();
      const filtered = refreshed.filter((q) => q.year === year && (!subject.trim() || q.subject === subject.trim()));
      const answered = filtered.find((q) => q.id === active.id);
      const others = filtered.filter((q) => q.id !== active.id).sort((a, b) => a.attempts - b.attempts);
      setQuestions([...(answered ? [answered] : []), ...others]);
      setActiveIndex(0);
    } catch {
      setError('تعذّر تسجيل المحاولة محلياً.');
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
                <button key={index} type="button" disabled={selected !== null} onClick={() => void answer(index)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-right text-xs leading-6 transition ${style}`}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-base text-[10px] font-black">{['A','B','C','D'][index]}</span>
                  <span className="flex-1">{option}</span>
                  {selected !== null && isCorrect && <CheckCircle2 size={17} className="shrink-0 text-good"/>}
                  {selected !== null && chosen && !isCorrect && <XCircle size={17} className="shrink-0 text-bad"/>}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div className="space-y-3 rounded-xl bg-card p-3">
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
      {showAll && <div className="space-y-2">{questions.map((q, index) => <button type="button" key={q.id} onClick={() => { setActiveIndex(index); setSelected(null); }} className="flex w-full items-center justify-between gap-3 rounded-lg border border-line p-3 text-right text-xs"><span className="line-clamp-2">{q.stem}</span><span className="shrink-0 text-muted">{q.attempts ? `${Math.round(q.correctAttempts / q.attempts * 100)}%` : 'جديد'}</span></button>)}</div>}
      {notice && <p role="status" className="rounded-lg bg-base p-3 text-xs leading-6 text-muted">{notice}</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad/10 p-3 text-xs leading-6 text-bad"><AlertCircle size={15} className="mt-0.5 shrink-0"/>{error}</p>}
      <p className="text-[10px] leading-5 text-muted">الأسئلة سيناريوهات افتراضية للتدريب الأكاديمي فقط. قد يخطئ النموذج؛ تحقق من الإجابات بمراجع تخصصك. لا تستخدمها لاتخاذ قرارات تخص مرضى حقيقيين.</p>
    </section>
  );
}
