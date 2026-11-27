import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Activity, ArrowLeft, BookOpen, Brain, BriefcaseMedical, ChevronDown, History, Save, Trash2,
  ClipboardList, FileText, FlaskConical, GraduationCap, Layers3,
  Microscope, Pill, Search, ShieldCheck, Stethoscope, Syringe, Table2, Waves, FileUp, Loader2, AlertCircle,
} from 'lucide-react';
import { PageTitle } from '../components/ui';
import { extractFileText } from '../lib/fileText';
import { requestMedicalAnalysis } from '../lib/chatStore';
import { parseMedicalAnalysis, type MedicalAnalysisResult } from '../lib/medicalAnalysis';
import { sanitizeMedicalSourceText } from '../lib/medicalDataSanitization';
import { deleteMedicalAnalysis, listMedicalAnalyses, saveMedicalAnalysis } from '../lib/medicalAnalysisHistory';
import { clearMedicalData, getMedicalDataEpoch, isMedicalDataClearing } from '../lib/medicalDataPrivacy';
import type { MedicalAnalysisRecord } from '../db';
import { MedicalFlashcards } from '../components/medical/MedicalFlashcards';
import { MedicalQuestionBank } from '../components/medical/MedicalQuestionBank';
import { MedicalSimulator } from '../components/medical/MedicalSimulator';
import { MedicalVisuals } from '../components/medical/MedicalVisuals';

type CollegeId = 'medicine' | 'dentistry' | 'pharmacy' | 'nursing';
type Track = 'systems' | 'rotations';

const colleges = [
  { id: 'medicine' as const, label: 'الطب البشري', short: 'طب بشري', icon: Stethoscope, description: 'العلوم الأساسية، الأجهزة الحيوية، ثم التدريب السريري.' },
  { id: 'dentistry' as const, label: 'طب الأسنان', short: 'طب الأسنان', icon: Activity, description: 'علوم الفم والأسنان، التشخيص، والتخصصات السريرية.' },
  { id: 'pharmacy' as const, label: 'الصيدلة', short: 'الصيدلة', icon: Pill, description: 'الأدوية، الكيمياء الدوائية، العلاجيات والممارسة الصيدلانية.' },
  { id: 'nursing' as const, label: 'التمريض', short: 'التمريض', icon: BriefcaseMedical, description: 'أساسيات التمريض، رعاية المرضى، والتدريب السريري.' },
];

const systems = [
  { title: 'القلب والأوعية', detail: 'التشريح والفيزيولوجيا والأمراض والأدوية', icon: Activity },
  { title: 'الجهاز التنفسي', detail: 'الوظائف، الاضطرابات، الفحوصات والعلاج', icon: Waves },
  { title: 'الجهاز العصبي', detail: 'المسارات العصبية والفحص السريري', icon: Brain },
  { title: 'الهضمي والكبد', detail: 'الأعضاء، الأمراض، والاستقصاءات', icon: Microscope },
  { title: 'الكلى والبولية', detail: 'الوظائف، الشوارد، والاضطرابات', icon: FlaskConical },
  { title: 'الغدد والاستقلاب', detail: 'الهرمونات والسكري والاستقلاب', icon: Activity },
];

const clinicalTracks: Record<CollegeId, { title: string; detail: string; icon: typeof Stethoscope }[]> = {
  medicine: [
    { title: 'الباطنة', detail: 'التقييم السريري والتشخيص التفريقي', icon: Stethoscope },
    { title: 'الجراحة', detail: 'التقييم قبل وبعد العمل الجراحي', icon: Syringe },
    { title: 'طب الأطفال', detail: 'النمو والتقييم والرعاية', icon: Activity },
    { title: 'النسائية والتوليد', detail: 'صحة المرأة ورعاية الحمل', icon: BriefcaseMedical },
  ],
  dentistry: [
    { title: 'المعالجة السنية', detail: 'التقييم وخيارات المعالجة', icon: Stethoscope },
    { title: 'جراحة الفم', detail: 'التقييم الجراحي والتدبير الأكاديمي', icon: Syringe },
    { title: 'تقويم الأسنان', detail: 'التشخيص وتخطيط المعالجة', icon: Activity },
    { title: 'طب أسنان الأطفال', detail: 'تقييم ورعاية الأطفال', icon: BriefcaseMedical },
  ],
  pharmacy: [
    { title: 'الصيدلة السريرية', detail: 'مراجعة العلاج ومتابعة الاستجابة', icon: Pill },
    { title: 'صيدلة المستشفيات', detail: 'سلامة الدواء وممارسات المستشفى', icon: BriefcaseMedical },
    { title: 'معلومات الأدوية', detail: 'تقييم الأدلة والمراجع الدوائية', icon: ClipboardList },
    { title: 'الرعاية الصيدلانية', detail: 'التثقيف الدوائي والمتابعة', icon: Activity },
  ],
  nursing: [
    { title: 'تمريض الباطنة والجراحة', detail: 'التقييم وخطط الرعاية', icon: Stethoscope },
    { title: 'تمريض الأطفال', detail: 'رعاية الطفل ومتابعة النمو', icon: Activity },
    { title: 'تمريض الأمومة', detail: 'رعاية الأم والوليد', icon: BriefcaseMedical },
    { title: 'تمريض الطوارئ', detail: 'التقييم الأولي والاستجابة', icon: Syringe },
  ],
};

const tools = [
  { title: 'المصطلحات الطبية', detail: 'تفكيك Prefix وRoot وSuffix مع شرح سياقي.', icon: Search, tag: 'مصطلحات' },
  { title: 'تحليل المحاضرات', detail: 'استخراج المفاهيم والتعاريف والنقاط عالية الأهمية.', icon: FileText, tag: 'محاضرات' },
  { title: 'بطاقات الحفظ الذكي', detail: 'بطاقات مراجعة وجدولة تكرار متباعد.', icon: Layers3, tag: 'حفظ' },
  { title: 'بنك الأسئلة الطبية', detail: 'أسئلة سريرية متعددة الخيارات مع تفسير البدائل.', icon: ClipboardList, tag: 'اختبارات' },
  { title: 'المحاكي السريري', detail: 'حالات افتراضية وتقييم خطوات التفكير السريري.', icon: Stethoscope, tag: 'تدريب' },
  { title: 'الجداول والمخططات', detail: 'مقارنات تفاعلية ومسارات خطوة بخطوة من المحاضرات.', icon: Table2, tag: 'مراجعة' },
];

export default function Medical() {
  const [college, setCollege] = useState<CollegeId>('medicine');
  const [year, setYear] = useState('1');
  const [track, setTrack] = useState<Track>('systems');
  const [lectureText, setLectureText] = useState('');
  const [lectureName, setLectureName] = useState('نص المحاضرة');
  const [lectureSubject, setLectureSubject] = useState('');
  const [analysis, setAnalysis] = useState<MedicalAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [extractBusy, setExtractBusy] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<MedicalAnalysisRecord[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [medicalDataRevision, setMedicalDataRevision] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const analysisRequestId = useRef(0);
  const extractRequestId = useRef(0);
  useEffect(() => {
    let active = true;
    const dataEpoch = getMedicalDataEpoch();
    void listMedicalAnalyses().then((items) => {
      if (active && dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) {
        setAnalysisHistory(items);
      }
    }).catch(() => {
      if (active && dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) {
        setHistoryError('تعذّر تحميل سجل التحليلات المحفوظ محلياً.');
      }
    });
    return () => { active = false; };
  }, []);

  const saveCurrentAnalysis = async () => {
    if (!analysis || historyBusy) return;
    const dataEpoch = getMedicalDataEpoch();
    setHistoryBusy(true);
    setHistoryError('');
    try {
      await saveMedicalAnalysis({
        college: selectedCollege.label,
        year,
        subject: lectureSubject,
        sourceName: lectureName,
        analysis,
      });
      if (dataEpoch !== getMedicalDataEpoch() || isMedicalDataClearing()) return;
      try {
        const items = await listMedicalAnalyses();
        if (dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) setAnalysisHistory(items);
      } catch {
        if (dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) {
          setHistoryError('حُفظ التحليل، لكن تعذّر تحديث قائمة السجل المعروضة. أعد تحميل القسم.');
        }
      }
    } catch {
      if (dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) {
        setHistoryError('تعذّر حفظ التحليل على هذا الجهاز. تحقق من مساحة التخزين.');
      }
    } finally {
      setHistoryBusy(false);
    }
  };

  const removeHistoryItem = async (id: number) => {
    const dataEpoch = getMedicalDataEpoch();
    try {
      await deleteMedicalAnalysis(id);
      if (dataEpoch !== getMedicalDataEpoch() || isMedicalDataClearing()) return;
      setAnalysisHistory((items) => items.filter((item) => item.id !== id));
      try {
        const items = await listMedicalAnalyses();
        if (dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) setAnalysisHistory(items);
      } catch {
        if (dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) {
          setHistoryError('حُذف التحليل، لكن تعذّر تحديث قائمة السجل المعروضة. أعد تحميل القسم.');
        }
      }
    } catch {
      if (dataEpoch === getMedicalDataEpoch() && !isMedicalDataClearing()) {
        setHistoryError('تعذّر حذف هذا التحليل من السجل المحلي.');
      }
    }
  };
  const clearAllMedicalData = async () => {
    if (privacyBusy || !window.confirm('سيتم حذف جميع التحليلات والأسئلة والبطاقات ونتائج المحاكاة الطبية المحفوظة على هذا الجهاز. لن تتأثر بيانات الدراسة الأخرى. هل تريد المتابعة؟')) return;
    setPrivacyBusy(true);
    setPrivacyMessage('');
    // Invalidate pending extraction/analysis before clearing persisted records.
    analysisRequestId.current += 1;
    extractRequestId.current += 1;
    setAnalysisBusy(false);
    setExtractBusy(false);
    try {
      await clearMedicalData();
      setAnalysisHistory([]);
      setAnalysis(null);
      setLectureText('');
      setLectureName('نص المحاضرة');
      setLectureSubject('');
      setAnalysisError('');
      setHistoryError('');
      if (fileInput.current) fileInput.current.value = '';
      setPrivacyMessage('حُذفت جميع بيانات MASAR MEDICAL المحلية من هذا الجهاز.');
      setMedicalDataRevision((value) => value + 1);
    } catch {
      setPrivacyMessage('تعذّر حذف البيانات الطبية. لم نؤكد اكتمال الحذف؛ أعد المحاولة.');
    } finally {
      setPrivacyBusy(false);
    }
  };

  const invalidateAnalysis = () => {
    analysisRequestId.current += 1;
    extractRequestId.current += 1;
    setAnalysis(null);
    setAnalysisError('');
    setAnalysisBusy(false);
    setExtractBusy(false);
  };
  const selectedCollege = colleges.find((item) => item.id === college)!;
  const modules = useMemo(() => {
    if (track === 'rotations') return clinicalTracks[college];
    if (college === 'medicine') return systems;
    if (college === 'dentistry') return [
      { title: 'علوم الفم والأسنان', detail: 'التشريح والأنسجة والتطور', icon: Activity },
      { title: 'المعالجة الترميمية', detail: 'المواد السنية وتقنيات الترميم', icon: FlaskConical },
      { title: 'أمراض الفم', detail: 'التشخيص والآفات الفموية', icon: Microscope },
      { title: 'التعويضات السنية', detail: 'التخطيط والتصميم والتطبيق', icon: BriefcaseMedical },
    ];
    if (college === 'pharmacy') return [
      { title: 'علم الأدوية', detail: 'الآليات والتأثيرات والتداخلات', icon: Pill },
      { title: 'الكيمياء الدوائية', detail: 'البنية والعلاقة بالنشاط الدوائي', icon: FlaskConical },
      { title: 'العلاجيات', detail: 'اختيار العلاج ومتابعة الاستجابة', icon: ClipboardList },
      { title: 'علم السموم', detail: 'التعرض والتأثيرات والتدبير الأكاديمي', icon: Microscope },
    ];
    return [
      { title: 'أساسيات التمريض', detail: 'المبادئ والمهارات الأساسية', icon: BriefcaseMedical },
      { title: 'التقييم الصحي', detail: 'جمع البيانات والعلامات الحيوية', icon: Activity },
      { title: 'رعاية البالغين', detail: 'خطط الرعاية والمتابعة', icon: Stethoscope },
      { title: 'الأدوية وسلامة المريض', detail: 'مبادئ الإعطاء والسلامة الدوائية', icon: Pill },
    ];
  }, [college, track]);

  const handleLectureFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    invalidateAnalysis();
    const requestId = ++extractRequestId.current;
    setExtractBusy(true);
    try {
      const extracted = await extractFileText(file);
      if (requestId !== extractRequestId.current) return;
      setLectureName(extracted.name);
      setLectureText(extracted.text);
      if (extracted.truncated) setAnalysisError('تم اقتطاع النص إلى 8000 حرف بسبب حد الإرسال. راجعه قبل التحليل.');
    } catch (error) {
      if (requestId === extractRequestId.current) {
        setAnalysisError(error instanceof Error ? error.message : 'تعذّر استخراج نص المحاضرة.');
      }
    } finally {
      if (requestId === extractRequestId.current) setExtractBusy(false);
    }
  };

  const analyzeLecture = async () => {
    if (lectureText.trim().length < 40 || analysisBusy) return;
    const requestId = ++analysisRequestId.current;
    const requestContext = {
      name: lectureName,
      text: lectureText,
      college: selectedCollege.label,
      year,
      subject: lectureSubject,
    };
    setAnalysisBusy(true);
    setAnalysisError('');
    setAnalysis(null);
    try {
      const raw = await requestMedicalAnalysis(requestContext);
      if (requestId === analysisRequestId.current) setAnalysis(parseMedicalAnalysis(raw, sanitizeMedicalSourceText(requestContext.text.slice(0, 8_000))));
    } catch (error) {
      if (requestId === analysisRequestId.current) {
        setAnalysisError(error instanceof Error ? error.message : 'تعذّر تحليل المحاضرة.');
      }
    } finally {
      if (requestId === analysisRequestId.current) setAnalysisBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      <PageTitle title="MASAR MEDICAL" subtitle="مساحة تعليمية متخصصة لطلاب الكليات الطبية، تجمع المحاضرات والمراجعة والتدريب في مكان واحد." />

      <section className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-l from-accent/20 via-card to-accent2/10 p-5 sm:p-7">
        <div className="pointer-events-none absolute -left-8 -bottom-10 opacity-[0.08]"><GraduationCap size={190} strokeWidth={1}/></div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-base/70 px-3 py-1 text-xs font-bold text-accent"><ShieldCheck size={14}/> MASAR · MEDICAL</span>
          <h2 className="mt-4 text-2xl font-black sm:text-3xl">تعلّم طبي أعمق. مراجعة أذكى.</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted">اختر كليتك وسنتك الدراسية، ثم نظّم تعلمك حول المواد والمحاضرات والمصطلحات والأسئلة والتدريب السريري.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#/library" className="btn btn-primary inline-flex items-center gap-2"><BookOpen size={16}/> محاضراتي وملفاتي</a>
            <a href="#/assistant" className="btn btn-secondary inline-flex items-center gap-2"><Brain size={16}/> اسأل دليل</a>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-lg font-extrabold">اختر الكلية</h2><p className="mt-1 text-xs text-muted">تتغير المساحة المعروضة بحسب تخصصك.</p></div>
          <span className="text-xs text-muted">الكلية الحالية: {selectedCollege.short}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {colleges.map(({ id, label, icon: Icon, description }) => (
            <button key={id} type="button" onClick={() => { setCollege(id); setTrack('systems'); invalidateAnalysis(); }} aria-pressed={college === id} className={`rounded-2xl border p-3 text-right transition ${college === id ? 'border-accent bg-accent/10 shadow-sm' : 'border-line bg-card hover:border-accent/50'}`}>
              <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${college === id ? 'bg-accent text-white' : 'bg-base text-accent'}`}><Icon size={21}/></span>
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-1 block text-[11px] leading-5 text-muted">{description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-4 !p-4 sm:!p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-extrabold">مسارك الأكاديمي</h2><p className="mt-1 text-xs text-muted">{selectedCollege.short} · السنة {year} · اختر نمط تنظيم المحتوى.</p></div>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted">السنة الدراسية
            <span className="relative">
              <select value={year} onChange={(event) => { setYear(event.target.value); invalidateAnalysis(); }} className="min-w-24 appearance-none rounded-xl border border-line bg-base py-2 pe-8 ps-3 text-sm font-bold text-main outline-none focus:border-accent">
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>السنة {n}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted"/>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="نمط تنظيم المواد">
          <button type="button" aria-pressed={track === 'systems'} onClick={() => setTrack('systems')} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${track === 'systems' ? 'bg-accent text-white' : 'border border-line bg-base text-muted'}`}>حسب الأجهزة والمواد</button>
          <button type="button" aria-pressed={track === 'rotations'} onClick={() => setTrack('rotations')} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${track === 'rotations' ? 'bg-accent text-white' : 'border border-line bg-base text-muted'}`}>الستاجات والتدريب</button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ title, detail, icon: Icon }) => (
            <article key={title} className="flex items-start gap-3 rounded-xl border border-line bg-base/60 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Icon size={18}/></span>
              <div className="min-w-0"><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{detail}</p></div>
            </article>
          ))}
        </div>
        <p className="text-[11px] leading-5 text-muted">هذا تنظيم أولي قابل للتخصيص؛ تختلف الخطط الدراسية وعدد السنوات والستاجات بين الجامعات، لذلك لا يفترض هذا النموذج منهجاً رسمياً موحداً.</p>
      </section>

      <section className="card space-y-4 !p-4 sm:!p-5">
        <div className="flex items-start gap-3">
          <span className="feature-icon feature-icon-blue"><FileText size={21}/></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold">حلّل محاضرتك مع دليل</h2>
            <p className="mt-1 text-xs leading-6 text-muted">استخرج المصطلحات والنقاط عالية الأهمية والجداول والأسئلة من محاضرتك. تتم قراءة الملف على جهازك، ويُرسل النص المستخرج فقط إلى خدمة دليل لإجراء التحليل. لا ترفع سجلات مرضى حقيقيين أو أسماءهم أو أرقامهم أو أي بيانات صحية تعرّف بشخص؛ استخدم مواد دراسية وحالات منزوعة الهوية فقط.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold text-muted">اسم المادة
            <input className="input" value={lectureSubject} onChange={(event) => { setLectureSubject(event.target.value); invalidateAnalysis(); }} maxLength={80} placeholder="مثلاً: علم الأدوية"/>
          </label>
          <div className="flex items-end">
            <input ref={fileInput} type="file" accept=".pdf,.docx,.xlsx,.txt,.csv" className="hidden" onChange={(event) => void handleLectureFile(event)}/>
            <button type="button" className="btn btn-secondary w-full" onClick={() => fileInput.current?.click()} disabled={extractBusy || analysisBusy}>
              {extractBusy ? <Loader2 size={16} className="animate-spin"/> : <FileUp size={16}/>}
              {extractBusy ? 'جارٍ استخراج النص…' : 'اختيار ملف محاضرة'}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2"><label htmlFor="medical-lecture-text" className="text-xs font-semibold text-muted">نص المحاضرة</label><span className="text-[10px] text-muted">{lectureText.length.toLocaleString('ar')} / 8000</span></div>
          <textarea id="medical-lecture-text" className="input min-h-40 resize-y leading-7" value={lectureText} onChange={(event) => { setLectureText(event.target.value.slice(0, 8000)); invalidateAnalysis(); }} maxLength={8000} placeholder="يمكنك لصق نص المحاضرة هنا، أو اختيار ملف لاستخراج نصه تلقائياً."/>
          <p className="text-[11px] text-muted">الملفات المدعومة: PDF وDOCX وXLSX وTXT وCSV. الحد الأقصى للنص المرسل 8000 حرف. ملفات PDF المصوّرة التي لا تحتوي نصاً قابلاً للاستخراج تحتاج إلى OCR، وهو غير متاح في هذه المرحلة.</p>
          <p className="rounded-xl border border-line bg-base/70 p-3 text-[11px] leading-6 text-muted">الخصوصية: يُرسل النص المستخرج الذي تختاره للتحليل أو توليد الأسئلة والمحاكاة إلى مزوّد الذكاء الاصطناعي عبر خادم مسار. تُحذف أنماط شائعة من بيانات التعريف قبل الإرسال، لكن ذلك لا يضمن إخفاء كل البيانات الشخصية. لا ترفع سجلات مرضى حقيقيين أو بيانات صحية تكشف الهوية. لا يُحفظ الملف الأصلي هنا؛ أما التحليلات والأسئلة والبطاقات ونتائج المحاكاة فتُحفظ محلياً على هذا الجهاز فقط، ولا تدخل النسخة الاحتياطية العامة.</p>
        </div>
        <button type="button" className="btn btn-primary w-full" onClick={() => void analyzeLecture()} disabled={lectureText.trim().length < 40 || analysisBusy || extractBusy}>
          {analysisBusy ? <Loader2 size={16} className="animate-spin"/> : <Brain size={16}/>}
          {analysisBusy ? 'دليل يحلل المحاضرة…' : 'ابدأ التحليل الطبي'}
        </button>
        {analysisError && <p role="alert" className="flex items-start gap-2 rounded-xl bg-bad/10 p-3 text-xs leading-6 text-bad"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{analysisError}</p>}
        {analysis && (
          <div className="space-y-4 border-t border-line pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1"><span className="text-[10px] font-bold text-accent">نتائج التحليل</span><h3 className="mt-1 text-lg font-extrabold">{analysis.title || lectureName}</h3><p className="mt-2 text-sm leading-7 text-muted">{analysis.summary}{analysis.summaryEvidenceQuote ? <span className="mt-2 block text-[10px] leading-5 text-muted"><strong>دليل الملخص:</strong> «{analysis.summaryEvidenceQuote}»</span> : analysis.summary && <span className="mt-2 block text-[10px] leading-5 text-muted">ملخص محفوظ دون اقتباس حرفي قابل للتحقق.</span>}</p></div>
              <button type="button" className="btn btn-secondary shrink-0" onClick={() => void saveCurrentAnalysis()} disabled={historyBusy || privacyBusy}>
                {historyBusy ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
                {historyBusy ? 'جارٍ الحفظ…' : 'حفظ التحليل محلياً'}
              </button>
            </div>
            {!!analysis.learningObjectives?.length && <div><h4 className="mb-2 text-sm font-bold">الأهداف التعليمية</h4><ul className="list-disc space-y-1 pe-5 text-xs leading-6 text-muted">{analysis.learningObjectives.map((item, i) => <li key={i}>{typeof item === 'string' ? item : <>{item.text}<p className="text-[10px] text-muted">دليل: «{item.evidenceQuote}»</p></>}</li>)}</ul></div>}
            {!!analysis.keyPoints?.length && <div><h4 className="mb-2 text-sm font-bold">النقاط الأساسية</h4><ul className="space-y-2">{analysis.keyPoints.map((item, i) => <li key={i} className="rounded-lg bg-base/70 p-3 text-xs leading-6">{typeof item === 'string' ? <>{item}<p className="mt-1 text-[10px] text-muted">سجل قديم: لا يتوفر اقتباس داعم محفوظ.</p></> : <>{item.text}<p className="mt-1 text-[10px] text-muted">دليل من المحاضرة: «{item.evidenceQuote}»</p></>}</li>)}</ul></div>}
            {!!analysis.terminology?.length && <div className="space-y-2"><h4 className="text-sm font-bold">المصطلحات الطبية</h4>{analysis.terminology.map((item, i) => <article key={i} className="rounded-xl border border-line p-3"><h5 className="font-bold text-sm" dir="auto">{item.term}</h5><p className="mt-1 text-xs leading-6 text-muted">{item.meaning}</p><div className="mt-2 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded-md bg-accent/10 px-2 py-1">Prefix: {item.prefix}</span><span className="rounded-md bg-accent/10 px-2 py-1">Root: {item.root}</span><span className="rounded-md bg-accent/10 px-2 py-1">Suffix: {item.suffix}</span></div><p className="mt-2 border-s-2 border-line pe-2 text-[10px] leading-5 text-muted">من المصدر: «{item.evidenceQuote}»</p></article>)}</div>}
            {!!analysis.highYield?.length && <div className="space-y-2"><h4 className="text-sm font-bold">نقاط عالية الأهمية</h4>{analysis.highYield.map((item, i) => <article key={i} className="rounded-xl bg-accent/5 p-3"><p className="text-xs font-semibold leading-6">{item.fact}</p><p className="mt-1 text-xs leading-5 text-muted">{item.why}</p><p className="mt-2 text-[10px] text-muted">«{item.evidenceQuote}»</p></article>)}</div>}
            {!!analysis.reviewQuestions?.length && <div className="space-y-2"><h4 className="text-sm font-bold">أسئلة مراجعة</h4>{analysis.reviewQuestions.map((item, i) => <details key={i} className="rounded-xl border border-line p-3"><summary className="cursor-pointer text-xs font-semibold leading-6">{item.question}</summary><p className="mt-2 text-xs leading-6"><strong>الإجابة:</strong> {item.answer}</p><p className="mt-1 text-xs leading-6 text-muted">{item.explanation}</p><p className="mt-2 border-s-2 border-accent/40 pe-2 text-[10px] leading-5 text-muted"><strong>دليل من المحاضرة:</strong> «{item.evidenceQuote}»</p></details>)}</div>}
            {!!analysis.limitations?.length && <div className="rounded-xl bg-bad/5 p-3"><h4 className="text-xs font-bold">ملاحظات على المصدر</h4><ul className="mt-1 list-disc space-y-1 pe-5 text-xs leading-5 text-muted">{analysis.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
            <p className="text-[10px] leading-5 text-muted">راجع المصطلحات والاشتقاقات مع مرجعك الدراسي؛ قد يخطئ النموذج في تحليل بعض الجذور أو اللواحق. هذا التحليل تعليمي ولا يقدم تشخيصاً أو توصية علاجية.</p>
          </div>
        )}
      </section>

      <section className="card space-y-3 !p-4 sm:!p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><History size={18} className="text-accent"/><div><h2 className="font-extrabold">سجل تحليلات المحاضرات</h2><p className="mt-1 text-[11px] text-muted">آخر 30 تحليلاً محفوظاً على هذا الجهاز فقط.</p></div></div>
          <span className="rounded-full bg-base px-2.5 py-1 text-xs font-bold tabular-nums">{analysisHistory.length}</span>
        </div>
        {historyError && <p role="alert" className="text-xs text-bad">{historyError}</p>}
        {analysisHistory.length === 0 ? (
          <p className="rounded-xl bg-base/70 p-3 text-xs leading-6 text-muted">لا توجد تحليلات محفوظة بعد. استخدم زر «حفظ التحليل محلياً» بعد انتهاء التحليل للاحتفاظ بنسخة منه.</p>
        ) : (
          <div className="space-y-2">
            {analysisHistory.map((item) => (
              <details key={item.id} className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold">{item.analysis.title || item.sourceName}</h3>
                      <p className="mt-1 text-[11px] text-muted">{item.college} · السنة {item.year}{item.subject ? ` · ${item.subject}` : ''}</p>
                      <p className="mt-1 text-[10px] text-muted">{new Date(item.createdAt).toLocaleString('ar')}</p>
                    </div>
                    <span className="text-[11px] text-accent">عرض الملخص</span>
                  </div>
                </summary>
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-xs leading-6 text-muted">{item.analysis.summary || 'لا يوجد ملخص محفوظ.'}</p>
                  {!!item.analysis.keyPoints?.length && <ul className="mt-2 list-disc space-y-1 pe-5 text-xs leading-5">{item.analysis.keyPoints.map((point, index) => <li key={index}>{typeof point === 'string' ? point : <>{point.text}<span className="block text-[10px] text-muted">دليل: «{point.evidenceQuote}»</span></>}</li>)}</ul>}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted">المصدر: {item.sourceName} · لم يُحفظ نص المحاضرة</span>
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-bad hover:bg-bad/10" onClick={() => item.id != null && void removeHistoryItem(item.id)}><Trash2 size={13}/> حذف</button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {analysis && (analysis.pathways?.length || analysis.comparisonTables?.length) ? (
        <MedicalVisuals pathways={analysis.pathways} comparisonTables={analysis.comparisonTables} />
      ) : null}

      <MedicalFlashcards key={medicalDataRevision}
        analysis={analysis}
        college={selectedCollege.label}
        year={year}
        subject={lectureSubject}
        sourceName={lectureName}
      />

      <MedicalQuestionBank key={medicalDataRevision}
        college={selectedCollege.label}
        year={year}
        subject={lectureSubject}
        sourceText={lectureText}
        sourceName={lectureName}
      />

      <MedicalSimulator key={medicalDataRevision}
        college={selectedCollege.label}
        year={year}
        subject={lectureSubject}
        sourceText={lectureText}
        sourceName={lectureName}
      />

      <section className="space-y-3">
        <div><h2 className="text-lg font-extrabold">أدواتك الطبية</h2><p className="mt-1 text-xs text-muted">أدوات متخصصة للمراجعة والتحليل والتدريب الطبي.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ title, detail, icon: Icon, tag }, index) => (
            <article key={title} className="card flex min-h-36 flex-col !p-4">
              <div className="flex items-start justify-between gap-2"><span className="feature-icon feature-icon-blue"><Icon size={21}/></span><span className="rounded-full border border-line px-2 py-1 text-[10px] text-muted">{tag}</span></div>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 flex-1 text-xs leading-6 text-muted">{detail}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">{index === 1 ? 'ابدأ من مكتبتك' : 'متاحة ضمن مساحة الطب'} <ArrowLeft size={13}/></span>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-accent"/>
          <div><h2 className="text-sm font-bold">تنبيه أكاديمي وسريري</h2><p className="mt-1 text-xs leading-6 text-muted">محتوى MASAR MEDICAL مخصص للتعلم والتدريب الأكاديمي باستخدام مواد وحالات افتراضية. لا يُعد تشخيصاً أو وصفة علاجية أو بديلاً عن إشراف المختصين والمراجع الطبية المعتمدة، ولا يجوز استخدام المحاكاة لاتخاذ قرارات تخص مرضى حقيقيين.</p></div>
        </div>
      </section>
      <section className="rounded-2xl border border-bad/20 bg-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold">إدارة البيانات الطبية المحلية</h2>
          <p className="mt-1 text-xs leading-6 text-muted">يمكنك حذف كل ما حفظته مساحة الطب على هذا الجهاز: سجل التحليلات، بنك الأسئلة ومحاولاته، بطاقات المراجعة، ونتائج المحاكاة. هذا الإجراء لا يحذف بيانات الدراسة أو ملفات المكتبة الأخرى.</p>
        </div>
        {privacyMessage && <p role="status" aria-live="polite" className="text-xs leading-5 text-muted">{privacyMessage}</p>}
        <button type="button" className="btn btn-secondary text-bad" onClick={() => void clearAllMedicalData()} disabled={privacyBusy}>
          {privacyBusy ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
          {privacyBusy ? 'جارٍ حذف البيانات…' : 'حذف جميع البيانات الطبية المحلية'}
        </button>
      </section>
      <div className="flex justify-start"><a href="#/university" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-accent"><ArrowLeft size={14}/> العودة إلى مساحة الجامعة</a></div>
    </div>
  );
}
