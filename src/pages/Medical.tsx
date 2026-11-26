import { useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, BookOpen, Brain, BriefcaseMedical, ChevronDown,
  ClipboardList, FileText, FlaskConical, GraduationCap, Layers3,
  Microscope, Pill, Search, ShieldCheck, Stethoscope, Syringe, Table2, Waves,
} from 'lucide-react';
import { PageTitle } from '../components/ui';

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
  { title: 'الجداول والمخططات', detail: 'مقارنات منظمة ومسارات تشخيص وآليات دوائية.', icon: Table2, tag: 'مراجعة' },
];

export default function Medical() {
  const [college, setCollege] = useState<CollegeId>('medicine');
  const [year, setYear] = useState('1');
  const [track, setTrack] = useState<Track>('systems');
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
            <button key={id} type="button" onClick={() => { setCollege(id); setTrack('systems'); }} aria-pressed={college === id} className={`rounded-2xl border p-3 text-right transition ${college === id ? 'border-accent bg-accent/10 shadow-sm' : 'border-line bg-card hover:border-accent/50'}`}>
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
              <select value={year} onChange={(event) => setYear(event.target.value)} className="min-w-24 appearance-none rounded-xl border border-line bg-base py-2 pe-8 ps-3 text-sm font-bold text-main outline-none focus:border-accent">
                {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>السنة {n}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted"/>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="نمط تنظيم المواد">
          <button type="button" role="tab" aria-selected={track === 'systems'} onClick={() => setTrack('systems')} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${track === 'systems' ? 'bg-accent text-white' : 'border border-line bg-base text-muted'}`}>حسب الأجهزة والمواد</button>
          <button type="button" role="tab" aria-selected={track === 'rotations'} onClick={() => setTrack('rotations')} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${track === 'rotations' ? 'bg-accent text-white' : 'border border-line bg-base text-muted'}`}>الستاجات والتدريب</button>
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

      <section className="space-y-3">
        <div><h2 className="text-lg font-extrabold">أدواتك الطبية</h2><p className="mt-1 text-xs text-muted">الهيكل المعتمد للأدوات المتخصصة التي ستُبنى تباعاً.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ title, detail, icon: Icon, tag }, index) => (
            <article key={title} className="card flex min-h-36 flex-col !p-4">
              <div className="flex items-start justify-between gap-2"><span className="feature-icon feature-icon-blue"><Icon size={21}/></span><span className="rounded-full border border-line px-2 py-1 text-[10px] text-muted">{tag}</span></div>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 flex-1 text-xs leading-6 text-muted">{detail}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">{index === 1 ? 'ابدأ من مكتبتك' : 'ضمن خارطة التطوير'} <ArrowLeft size={13}/></span>
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
      <div className="flex justify-start"><a href="#/university" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-accent"><ArrowLeft size={14}/> العودة إلى مساحة الجامعة</a></div>
    </div>
  );
}
