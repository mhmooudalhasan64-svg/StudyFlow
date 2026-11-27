import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, Loader2, ShieldAlert, Sparkles, Stethoscope, XCircle } from 'lucide-react';
import { db, type MedicalSimulationResult } from '../../db';
import { requestMedicalCase } from '../../lib/chatStore';
import { parseMedicalCase, type MedicalCaseDraft } from '../../lib/medicalCaseSimulator';
import { getMedicalSimulationStats } from '../../lib/medicalSimulationStats';
import { getMedicalDataEpoch } from '../../lib/medicalDataPrivacy';

interface Props {
  college: string;
  year: string;
  subject: string;
  sourceText: string;
  sourceName: string;
}

const STAGE_LABELS = {
  history: 'أخذ القصة',
  examination: 'الفحص والتقييم',
  investigations: 'الاستقصاءات',
  differential: 'الاستدلال التفريقي',
} as const;

export function MedicalSimulator({ college, year, subject, sourceText, sourceName }: Props) {
  const [topic, setTopic] = useState('');
  const [caseData, setCaseData] = useState<MedicalCaseDraft | null>(null);
  const [stationIndex, setStationIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<MedicalSimulationResult[]>([]);
  const contextKey = `${college}|${year}|${subject.trim()}`;
  const activeContext = useRef(contextKey);
  const generationRequestId = useRef(0);

  const refreshHistory = useCallback(async () => {
    const requestContext = contextKey;
    const rows = await db.medicalSimulations.where('college').equals(college).toArray();
    if (activeContext.current !== requestContext) return;
    setHistory(rows.filter((row) => row.year === year && (!subject.trim() || row.subject === subject.trim()))
      .sort((a, b) => b.completedAt - a.completedAt));
  }, [college, year, subject, contextKey]);

  useEffect(() => {
    activeContext.current = contextKey;
    generationRequestId.current += 1;
    setBusy(false);
    setSaving(false);
    setCaseData(null);
    setStationIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setError('');
    setNotice('');
    let alive = true;
    void db.medicalSimulations.where('college').equals(college).toArray().then((rows) => {
      if (alive) setHistory(rows.filter((row) => row.year === year && (!subject.trim() || row.subject === subject.trim()))
        .sort((a, b) => b.completedAt - a.completedAt));
    }).catch(() => { if (alive) setError('تعذّر تحميل سجل المحاكاة المحفوظ.'); });
    return () => { alive = false; generationRequestId.current += 1; };
  }, [college, year, subject, contextKey]);

  const generate = async () => {
    if (!topic.trim() && sourceText.trim().length < 40) {
      setError('اكتب محور الحالة أو أرفق نص محاضرة قابلاً للقراءة.');
      return;
    }
    const requestId = ++generationRequestId.current;
    const dataEpoch = getMedicalDataEpoch();
    const requestContext = { topic, college, year, subject, sourceText, sourceName };
    setBusy(true);
    setError('');
    setNotice('');
    setCaseData(null);
    setFinished(false);
    setSelected(null);
    setScore(0);
    setStationIndex(0);
    try {
      const raw = await requestMedicalCase({
        topic: requestContext.topic, college: requestContext.college,
        year: requestContext.year, subject: requestContext.subject,
        ...(requestContext.sourceText.trim().length >= 40 ? { source: { name: requestContext.sourceName, text: requestContext.sourceText } } : {}),
      });
      if (requestId === generationRequestId.current && dataEpoch === getMedicalDataEpoch()) setCaseData(parseMedicalCase(raw));
    } catch (cause) {
      if (requestId === generationRequestId.current) {
        setError(cause instanceof Error ? cause.message : 'تعذّر إنشاء الحالة السريرية.');
      }
    } finally {
      if (requestId === generationRequestId.current) setBusy(false);
    }
  };

  const submitStation = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
  };

  const continueCase = async () => {
    if (!caseData || selected === null) return;
    const nextScore = score + (selected === caseData.stations[stationIndex].answerIndex ? 1 : 0);
    setScore(nextScore);
    if (stationIndex < caseData.stations.length - 1) {
      setStationIndex((value) => value + 1);
      setSelected(null);
      return;
    }
    const saveContext = contextKey;
    const dataEpoch = getMedicalDataEpoch();
    setFinished(true);
    setSaving(true);
    try {
      if (dataEpoch !== getMedicalDataEpoch()) return;
      const completedAt = Date.now();
      await db.medicalSimulations.add({
        caseTitle: caseData.caseTitle,
        college, year, subject: subject.trim() || topic.trim() || 'موضوع طبي',
        score: nextScore, total: caseData.stations.length,
        createdAt: completedAt, completedAt,
      });
      if (activeContext.current === saveContext) {
        setNotice('حُفظت نتيجة المحاكاة على هذا الجهاز.');
        try {
          await refreshHistory();
        } catch {
          if (activeContext.current === saveContext) setError('حُفظت النتيجة، لكن تعذّر تحديث سجل المحاكاة المعروض.');
        }
      }
    } catch {
      if (activeContext.current === saveContext) setError('اكتملت المحاكاة، لكن تعذّر حفظ النتيجة محلياً.');
    } finally {
      if (activeContext.current === saveContext) setSaving(false);
    }
  };

  const station = caseData?.stations[stationIndex];
  const stats = getMedicalSimulationStats(history);

  return (
    <section className="card space-y-4 !p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <span className="feature-icon feature-icon-blue"><Stethoscope size={21}/></span>
        <div><h3 className="font-extrabold">المحاكي السريري · OSCE</h3><p className="mt-1 text-xs leading-6 text-muted">حالة افتراضية تتقدم عبر أربع محطات: القصة، الفحص، الاستقصاءات، والاستدلال التفريقي.</p></div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">محاكاة مكتملة</p><p className="mt-1 text-xl font-black tabular-nums">{stats.completed}</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">متوسط النتائج</p><p className="mt-1 text-xl font-black tabular-nums">{stats.averagePercent}%</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">أفضل نتيجة</p><p className="mt-1 text-xl font-black tabular-nums">{stats.bestPercent}%</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">آخر نتيجة</p><p className="mt-1 text-xl font-black tabular-nums">{stats.latestPercent}%</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">تحتاج إلى تدريب</p><p className="mt-1 text-xl font-black tabular-nums">{stats.needsPractice}</p></div>
      </div>

      {!caseData && (
        <div className="space-y-3 rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">إنشاء حالة افتراضية</h4><span className="text-[10px] text-muted">{sourceText.trim().length >= 40 ? 'من المحاضرة الحالية' : 'من موضوع تختاره'}</span></div>
          <label className="block space-y-1 text-xs font-semibold text-muted">الموضوع أو المحور
            <input className="input" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={180} placeholder="مثلاً: تقييم تعليمي لحالة فقر الدم"/>
          </label>
          <button type="button" className="btn btn-primary w-full" onClick={() => void generate()} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
            {busy ? 'دليل يبني الحالة والمحطات…' : 'ابدأ محاكاة جديدة'}
          </button>
        </div>
      )}

      {caseData && !finished && station && (
        <div className="space-y-4 rounded-2xl border border-accent/25 bg-accent/5 p-4">
          <div>
            <span className="text-[10px] font-bold text-accent">حالة تعليمية · {caseData.specialty}</span>
            <h4 className="mt-1 text-base font-extrabold">{caseData.caseTitle}</h4>
            {caseData.setting && <p className="mt-1 text-[10px] text-muted">{caseData.setting}</p>}
          </div>
          <p className="rounded-xl bg-base p-3 text-xs leading-7">{caseData.opening}</p>
          <div className="flex flex-wrap gap-1.5">
            {caseData.stations.map((item, index) => <span key={item.stage} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${index === stationIndex ? 'bg-accent text-white' : index < stationIndex ? 'bg-good/10 text-good' : 'bg-base text-muted'}`}>{index + 1}. {STAGE_LABELS[item.stage]}</span>)}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-muted"><span>المحطة {stationIndex + 1} من 4</span><span>النقاط: {score} / {stationIndex}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-base"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(stationIndex / 4) * 100}%` }}/></div>
          </div>
          <div><span className="text-[10px] font-bold text-accent">{STAGE_LABELS[station.stage]}</span><h5 className="mt-1 text-sm font-extrabold leading-7">{station.title}</h5><p className="mt-1 text-xs leading-7 text-muted">{station.prompt}</p></div>
          <div className="space-y-2">
            {station.options.map((option, index) => {
              const correct = index === station.answerIndex;
              const chosen = selected === index;
              const style = selected === null ? 'border-line bg-card hover:border-accent/50' : correct ? 'border-good bg-good/10' : chosen ? 'border-bad bg-bad/10' : 'border-line bg-card opacity-75';
              return <button key={index} type="button" disabled={selected !== null} aria-pressed={selected === index} onClick={() => submitStation(index)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-right text-xs leading-6 ${style}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-base text-[10px] font-black">{['A','B','C','D'][index]}</span><span className="flex-1">{option}</span>
                {selected !== null && correct && <CheckCircle2 size={16} className="shrink-0 text-good"/>}
                {selected !== null && chosen && !correct && <XCircle size={16} className="shrink-0 text-bad"/>}
              </button>;
            })}
          </div>
          {selected !== null && (
            <div role="status" aria-live="polite" className="space-y-2 rounded-xl bg-card p-3">
              <p className={`text-xs font-extrabold ${selected === station.answerIndex ? 'text-good' : 'text-bad'}`}>{selected === station.answerIndex ? 'اختيار مناسب' : `الاختيار الأفضل: ${['A','B','C','D'][station.answerIndex]}`}</p>
              {station.feedback.map((line, index) => <p key={index} className="text-xs leading-6"><strong>{['A','B','C','D'][index]}:</strong> {line}</p>)}
              {station.rationale && <p className="border-t border-line pt-2 text-xs leading-6 text-muted">{station.rationale}</p>}
              {station.scoringCriteria && <p className="rounded-lg bg-accent/10 p-2 text-xs leading-6"><strong>معيار المحطة:</strong> {station.scoringCriteria}</p>}
              <button type="button" className="btn btn-primary w-full" onClick={() => void continueCase()}>{stationIndex === 3 ? 'إنهاء المحاكاة وعرض النتيجة' : 'المحطة التالية'}</button>
            </div>
          )}
        </div>
      )}

      {caseData && finished && (
        <div className="space-y-3 rounded-2xl border border-good/25 bg-good/5 p-4">
          <div className="flex items-center gap-2"><CheckCircle2 size={20} className="text-good"/><h4 className="font-extrabold">اكتملت المحاكاة</h4></div>
          <p className="text-2xl font-black tabular-nums">{score} / 4 <span className="text-sm font-semibold text-muted">({Math.round(score / 4 * 100)}%)</span></p>
          <p className="text-xs leading-7">{caseData.finalSummary}</p>
          {caseData.learningObjectives.length > 0 && <div><h5 className="text-xs font-bold">الأهداف التعليمية</h5><ul className="mt-1 list-disc space-y-1 pe-5 text-xs leading-6 text-muted">{caseData.learningObjectives.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
          {caseData.safetyNote && <p className="rounded-lg bg-base p-2 text-[10px] leading-5 text-muted">{caseData.safetyNote}</p>}
          <button type="button" className="btn btn-primary w-full" disabled={saving} onClick={() => { setCaseData(null); setFinished(false); setSelected(null); setStationIndex(0); setScore(0); setError(''); setNotice(''); }}>
            {saving ? <><Loader2 size={15} className="animate-spin"/> جارٍ حفظ النتيجة…</> : 'إنشاء حالة أخرى'}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-xs font-bold"><ClipboardList size={15}/> سجل المحاكاة</h4>
          {history.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 text-xs"><span className="min-w-0 flex-1 truncate">{item.caseTitle}</span><strong className="shrink-0 tabular-nums">{item.score}/{item.total} · {item.total > 0 ? Math.round(item.score / item.total * 100) : 0}%</strong><span className="shrink-0 text-[10px] text-muted">{new Date(item.completedAt).toLocaleDateString('ar')}</span></div>)}
        </div>
      )}

      {notice && <p role="status" className="rounded-lg bg-base p-3 text-xs text-muted">{notice}</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad/10 p-3 text-xs leading-6 text-bad"><AlertCircle size={15} className="mt-0.5 shrink-0"/>{error}</p>}
      <p className="flex items-start gap-2 rounded-lg bg-bad/5 p-3 text-[10px] leading-5 text-muted"><ShieldAlert size={15} className="mt-0.5 shrink-0"/>محاكاة افتراضية للتعلم الأكاديمي فقط، وليست بروتوكولاً سريرياً أو توجيهاً للتعامل مع مريض حقيقي. تحقق من الإجابات مع مرجعك وإشرافك الأكاديمي.</p>
    </section>
  );
}
