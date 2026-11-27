import { PageTitle } from '../components/ui';
import {
  BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LibraryBig,
  Calculator, BriefcaseBusiness, FileText, Bot, BarChart3, Clock3,
} from 'lucide-react';

const groups = [
  {
    title: 'الحياة الأكاديمية',
    description: 'تنظيم الدراسة الجامعية ومتابعة متطلبات كل فصل.',
    items: [
      { title: 'المواد والمحاضرات', detail: 'اجمع ملفات المقررات والمراجع والمحاضرات في مكتبتك.', icon: BookOpen, href: '#/library', tag: 'المقررات' },
      { title: 'الجدول والمهام الجامعية', detail: 'نظّم مواعيد الدراسة والتسليمات وجلسات العمل.', icon: CalendarDays, href: '#/plan', tag: 'التنظيم' },
      { title: 'الواجبات والتكليفات', detail: 'تابع التقارير والأبحاث والعروض ومواعيد تسليمها ضمن خطتك.', icon: ClipboardCheck, href: '#/plan', tag: 'التكليفات' },
    ],
  },
  {
    title: 'الاختبارات والتقييم',
    description: 'استعد للامتحانات وتابع مستواك خلال الفصل.',
    items: [
      { title: 'الامتحانات الفصلية والنهائية', detail: 'رتّب مواعيد الامتحانات وخطة المراجعة قبل كل اختبار.', icon: GraduationCap, href: '#/exams', tag: 'الامتحانات' },
      { title: 'المعدل والعلامات', detail: 'استخدم حاسبة العلامات لمتابعة نتائجك وتقدير معدلك.', icon: Calculator, href: '#/calc', tag: 'المعدل' },
      { title: 'التقدم الأكاديمي', detail: 'راجع إحصاءات جلساتك وتقارير إنجازك الدراسي.', icon: BarChart3, href: '#/stats', tag: 'المتابعة' },
    ],
  },
  {
    title: 'المهارات والمسار المهني',
    description: 'اربط التعلم الجامعي بالمهارات والمستقبل المهني.',
    items: [
      { title: 'المشاريع والأبحاث', detail: 'خطط لمراحل البحث والمشروع الجامعي واحفظ المراجع والملفات.', icon: FileText, href: '#/library', tag: 'المشاريع' },
      { title: 'التدريب والاستعداد المهني', detail: 'أنشئ مهاماً لمتابعة فرص التدريب والسيرة الذاتية ومتطلبات التخرج.', icon: BriefcaseBusiness, href: '#/plan', tag: 'المهنة' },
      { title: 'مساعد الجامعة — دليل', detail: 'اطلب شرح المفاهيم وتلخيص المحاضرات والتحضير للمناقشات.', icon: Bot, href: '#/assistant', tag: 'دليل AI' },
    ],
  },
];

export default function University() {
  return (
    <div className="mx-auto max-w-4xl space-y-7" dir="rtl">
      <PageTitle title="مساحة طلاب الجامعة" subtitle="أدوات ومساحات مخصصة لتنظيم الحياة الجامعية، من المحاضرات والتكليفات إلى الامتحانات والمعدل والاستعداد المهني." />
      <section className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-l from-accent/15 via-card to-accent2/10 p-5 sm:p-7">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-base/70 px-3 py-1 text-xs font-semibold text-accent"><GraduationCap size={15}/> MASAR · UNIVERSITY</span>
          <h2 className="mt-4 text-2xl font-black sm:text-3xl">جامعتك، بتنظيم أوضح.</h2>
          <p className="mt-2 text-sm leading-7 text-muted">مساحة تجمع الأدوات التي تحتاجها خلال الفصل الجامعي، مع الحفاظ على أدوات مسار الحالية دون استبدالها.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#/plan" className="btn btn-primary inline-flex items-center gap-2"><CalendarDays size={16}/> افتح خطتي</a>
            <a href="#/library" className="btn btn-secondary inline-flex items-center gap-2"><LibraryBig size={16}/> مكتبتي الجامعية</a>
            <a href="#/medical" className="btn btn-secondary inline-flex items-center gap-2"><GraduationCap size={16}/> القسم الطبي</a>
          </div>
        </div>
        <GraduationCap className="pointer-events-none absolute -left-5 -bottom-8 h-44 w-44 text-accent/10" strokeWidth={1}/>
      </section>
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <div>
            <h2 className="text-lg font-extrabold">{group.title}</h2>
            <p className="mt-1 text-xs text-muted">{group.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(({title,detail,icon:Icon,href,tag}) => (
              <a key={title} href={href} className="card group flex min-h-44 flex-col !p-4 transition hover:-translate-y-0.5 hover:border-accent/60">
                <div className="flex items-start justify-between gap-2">
                  <span className="feature-icon feature-icon-blue"><Icon size={21}/></span>
                  <span className="rounded-full border border-line px-2 py-1 text-[10px] text-muted">{tag}</span>
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{detail}</p>
                <span className="mt-3 text-xs font-semibold text-accent group-hover:translate-x-[-2px] transition">فتح القسم ←</span>
              </a>
            ))}
          </div>
        </section>
      ))}
      <section className="card flex items-start gap-3 !p-4">
        <Clock3 className="mt-1 shrink-0 text-accent" size={20}/>
        <div><h2 className="font-bold">ملاحظة حول الأقسام</h2><p className="mt-1 text-xs leading-6 text-muted">هذه المساحة تربطك حالياً بأدوات مسار الموجودة فعلاً. لا تنشئ جدولاً جامعياً أو معدلاً تلقائياً ولا تحفظ بيانات أكاديمية جديدة قبل إضافة نماذج إدخال وتخزين مخصصة لها.</p></div>
      </section>
    </div>
  );
}
