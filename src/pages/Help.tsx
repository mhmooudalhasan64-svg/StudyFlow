import { useMemo, useState } from 'react';
import {
  BookOpen, CalendarCheck, Timer, GraduationCap, MoreHorizontal, Bot, Settings,
  Library, Brain, Repeat, Layers, ClipboardList, FileQuestion, Trophy, BarChart3,
  FileBarChart, Calculator, CalendarClock, HelpCircle, Search, X, ChevronDown,
  SunMoon, ShieldCheck, Download, Sparkles,
} from 'lucide-react';
import { PageTitle } from '../components/ui';

type GuideItem = { title: string; href: string; icon: typeof BookOpen; what: string; how: string };
type GuideGroup = { title: string; intro: string; items: GuideItem[] };

const groups: GuideGroup[] = [
  {
    title: 'ابدأ من هنا',
    intro: 'الأزرار الأساسية التي ستستخدمها كل يوم.',
    items: [
      { title: 'يومي الدراسي', href: '#/today', icon: CalendarCheck, what: 'لوحة واحدة تجمع مهام اليوم والمراجعات ووقت التركيز.', how: 'ابدأ منها لمعرفة ما عليك إنجازه اليوم دون التنقل بين صفحات كثيرة.' },
      { title: 'الرئيسية', href: '#/home', icon: BookOpen, what: 'ملخص سريع لنشاطك وأهم ما تحتاج الوصول إليه.', how: 'افتحها لمتابعة تقدمك والانتقال إلى أدوات الدراسة.' },
      { title: 'الخطة', href: '#/plan', icon: CalendarCheck, what: 'تنظيم مهام الدراسة على أيام الأسبوع.', how: 'اختر اليوم، أضف مهمة وحدد المادة والمدة. ويمكنك طلب خطة أسبوعية ذكية.' },
      { title: 'المؤقت', href: '#/timer', icon: Timer, what: 'جلسات تركيز واستراحات بطريقة بومودورو.', how: 'اختر تركيز أو استراحة، ثم اضغط ابدأ. استخدم الإيقاف المؤقت أو إعادة الضبط عند الحاجة.' },
      { title: 'البكالوريا', href: '#/bac', icon: GraduationCap, what: 'أدوات مرتبطة بمرحلة البكالوريا.', how: 'افتح الصفحة للوصول إلى الأدوات والمحتوى المخصص لهذه المرحلة.' },
      { title: 'كل الميزات / المزيد', href: '#/more', icon: MoreHorizontal, what: 'القائمة التي تجمع بقية صفحات التطبيق.', how: 'إذا لم تجد الزر في الشريط الرئيسي، فابحث عنه هنا.' },
    ],
  },
  {
    title: 'التعلم والمراجعة',
    intro: 'أدوات تساعدك على فهم الدروس وتثبيت المعلومات.',
    items: [
      { title: 'خطة إنهاء المنهاج', href: '#/curriculum', icon: ClipboardList, what: 'تسجيل الدروس ومتابعة ما أنهيته وما بقي عليك.', how: 'أضف الدروس وحدد إنجازها، ثم تابع مواعيد مراجعتها.' },
      { title: 'مكتبة الكتب', href: '#/library', icon: Library, what: 'حفظ كتبك وملفات PDF على جهازك.', how: 'اختر ملف PDF وأضفه إلى المادة والوحدة المناسبة، ثم افتحه من المكتبة.' },
      { title: 'الخرائط الذهنية', href: '#/mindmap', icon: Brain, what: 'ترتيب الأفكار والمفاهيم بصرياً.', how: 'أنشئ خريطة واربط الأفكار الرئيسية بالتفاصيل.' },
      { title: 'المراجعة الذكية', href: '#/review', icon: Repeat, what: 'تذكيرك بمراجعة الدروس وفق فواصل زمنية.', how: 'راجع العناصر المستحقة وسجّل إن كنت تذكرتها.' },
      { title: 'البطاقات التعليمية', href: '#/cards', icon: Layers, what: 'بطاقات سؤال وجواب لحفظ التعريفات والمعلومات.', how: 'أنشئ بطاقة بوجه وسؤال وظهر وإجابة، ثم اختبر تذكرك.' },
    ],
  },
  {
    title: 'الاختبارات والامتحانات',
    intro: 'تدرّب واكتشف مستواك قبل الامتحان.',
    items: [
      { title: 'الامتحانات', href: '#/exams', icon: CalendarClock, what: 'تنظيم مواعيد الامتحانات ومتابعتها.', how: 'أضف موعد الامتحان ومادته لتبقى مواعيدك واضحة.' },
      { title: 'بنك الأسئلة والاختبارات', href: '#/quiz', icon: FileQuestion, what: 'إدارة الأسئلة والتدرب عليها.', how: 'أضف أسئلتك أو اختر اختباراً متاحاً، ثم أجب وتابع نتيجتك.' },
      { title: 'محاكي الامتحان', href: '#/simulator', icon: ClipboardList, what: 'تجربة تدريب أقرب إلى أجواء الامتحان.', how: 'ابدأ المحاكاة واتبع التعليمات وأكمل الأسئلة ضمن الوقت المحدد.' },
      { title: 'حاسبة العلامات', href: '#/calc', icon: Calculator, what: 'حساب العلامات ومتابعة المعدل المتوقع.', how: 'أدخل العلامة والدرجة العظمى لكل مادة لتظهر الحسابات.' },
    ],
  },
  {
    title: 'متابعة التقدم والمساعدة',
    intro: 'اعرف كيف تسير دراستك واضبط تجربتك.',
    items: [
      { title: 'الإحصاءات', href: '#/stats', icon: BarChart3, what: 'عرض أرقام نشاطك ونتائجك، بما فيها تحليل نقاط الضعف.', how: 'راجع المواد أو الوحدات التي تحتاج إلى اهتمام عندما تتوفر إجابات كافية.' },
      { title: 'التقارير', href: '#/reports', icon: FileBarChart, what: 'ملخصات وتقارير عن نشاطك الدراسي.', how: 'افتحها لمراجعة صورة أشمل عن جلساتك وإنجازك.' },
      { title: 'الإنجازات', href: '#/achievements', icon: Trophy, what: 'متابعة الإنجازات والتحفيز على الاستمرار.', how: 'اطّلع على ما حققته مع تقدمك في استخدام التطبيق.' },
      { title: 'المعلّم الذكي', href: '#/assistant', icon: Bot, what: 'مساعدك الدراسي للإجابة والمساعدة في التعلم.', how: 'اكتب سؤالك بوضوح، ويمكنك استخدام خيارات الصوت المتاحة.' },
      { title: 'الإعدادات', href: '#/settings', icon: Settings, what: 'تخصيص المؤقت والصوت والمظهر والمواد والنسخ الاحتياطي.', how: 'عدّل الخيارات بهدوء. استخدم تصدير نسخة احتياطية لحماية بياناتك.' },
    ],
  },
];

function GuideCard({ item }: { item: GuideItem }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  return (
    <article className="rounded-2xl border border-line/70 bg-card/70 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={19} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{item.title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted">{item.what}</p>
        </div>
        <button type="button" className="btn btn-ghost !px-2 !py-2 text-xs" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {open ? 'إخفاء' : 'شرح'} <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
        </button>
      </div>
      {open && (
        <div className="mt-3 border-t border-line/70 pt-3">
          <p className="text-sm leading-7 text-muted">{item.how}</p>
          <a href={item.href} className="btn btn-primary mt-3 w-full">افتح {item.title}</a>
        </div>
      )}
    </article>
  );
}

export default function Help() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => groups.map(group => ({
    ...group,
    items: group.items.filter(item => (item.title + ' ' + item.what + ' ' + item.how).toLowerCase().includes(query.trim().toLowerCase())),
  })).filter(group => group.items.length), [query]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageTitle title="دليل استخدام Study Flow" subtitle="شرح مبسّط للأزرار والصفحات — افتح الشرح عند الحاجة." />
      <section className="card space-y-3 border-accent/30 bg-gradient-to-l from-accent/10 via-card to-card">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><HelpCircle size={21} /></span>
          <div><h2 className="font-extrabold">لا تحتاج إلى استخدام كل شيء دفعة واحدة</h2><p className="text-xs text-muted">استخدم الوضع البسيط لتقليل الأزرار، والبحث للوصول لأي ميزة عند الحاجة.</p></div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <a href="#/home" className="btn btn-ghost">١. الرئيسية</a>
          <a href="#/plan" className="btn btn-ghost">٢. نظّم يومك</a>
          <a href="#/timer" className="btn btn-ghost">٣. ابدأ التركيز</a>
        </div>
      </section>

      <label className="relative block">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pr-10 pl-10" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن زر أو ميزة..." aria-label="ابحث في دليل الاستخدام" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><X size={17} /></button>}
      </label>

      {filtered.length === 0 ? <div className="card text-center text-sm text-muted">لم أجد هذا الزر. جرّب كلمة أقصر أو افتح «كل الميزات».</div> : filtered.map(group => (
        <section key={group.title} className="space-y-3">
          <div><h2 className="font-extrabold">{group.title}</h2><p className="mt-1 text-xs text-muted">{group.intro}</p></div>
          <div className="grid gap-2">{group.items.map(item => <GuideCard key={item.href} item={item} />)}</div>
        </section>
      ))}

      <section className="card space-y-2">
        <h2 className="flex items-center gap-2 font-bold"><Search size={18} className="text-accent" /> أدوات تسهّل التنقل</h2>
        <p className="text-sm leading-7 text-muted">زر البحث في الشريط العلوي يوصلك لأي صفحة، ويمكن فتحه باختصار Ctrl + K. زر الوضع البسيط والمتقدم يبدّل بين عرض الأدوات الأساسية وعرض كل الأدوات. عند أول زيارة لصفحة قد تظهر تلميحة صغيرة تشرحها.</p>
        <p className="text-sm leading-7 text-muted">من زر المعلّم الذكي العائم، إذا فتحته من داخل صفحة أخرى، ينتقل اسم الصفحة إلى المساعد حتى يربط إجابته بها.</p>
      </section>
      <section className="card space-y-2">
        <h2 className="flex items-center gap-2 font-bold"><SunMoon size={18} className="text-accent" /> أزرار عامة مهمة</h2>
        <p className="text-sm leading-7 text-muted">زر الشمس أو القمر يبدّل بين المظهر الفاتح والداكن. زر الترس يفتح الإعدادات. زر المعلّم الذكي العائم يفتح المساعد، ويمكن سحبه إلى مكان يناسبك.</p>
        <p className="flex items-start gap-2 text-sm leading-7 text-muted"><ShieldCheck size={17} className="mt-1 shrink-0 text-accent" /> بياناتك محفوظة على جهازك؛ من الإعدادات صدّر نسخة احتياطية بشكل دوري، خصوصاً قبل تغيير الجهاز أو المتصفح.</p>
      </section>
      <p className="text-center text-xs text-muted">هذا الدليل يشرح الصفحات الحالية، ويمكنك الرجوع إليه في أي وقت من «كل الميزات».</p>
    </div>
  );
}
