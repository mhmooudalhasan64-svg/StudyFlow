import { ArrowUpRight, BookOpen, BrainCircuit, Handshake, Layers3, Sparkles } from 'lucide-react';
import { PageTitle } from '../components/ui';

function PartnershipIdentity() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-accent2/15 p-5 text-center shadow-xl shadow-accent2/10 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-accent/15 shadow-[0_0_0_24px_rgb(var(--accent)/0.035),0_0_0_48px_rgb(var(--accent2)/0.025)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full border border-accent2/15" aria-hidden="true" />
      <div className="relative">
        <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">شراكة وتعاون</span>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-white/20 bg-black px-2 py-5 text-white shadow-lg sm:px-4">
            <span className="mb-2 grid h-12 w-12 place-items-center rounded-xl border-2 border-white text-2xl font-black">A</span>
            <p className="text-sm font-black tracking-[0.14em] sm:text-lg" dir="ltr">AUREVON</p>
            <p className="mt-1 text-[10px] text-white/70">TECHNOLOGIES</p>
          </div>
          <span className="text-2xl font-black text-accent sm:text-3xl" aria-label="مع">×</span>
          <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-line/70 bg-card px-2 py-5 shadow-lg sm:px-4">
            <img src="/logo.png" alt="شعار متجر سكوڤا" width={76} height={76} className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14" />
            <p className="mt-2 text-sm font-black tracking-widest sm:text-base" dir="ltr">SKOVA</p>
            <p className="mt-1 text-[10px] text-muted">STORE</p>
          </div>
        </div>
        <h2 className="mt-6 text-xl font-black leading-relaxed sm:text-2xl">فكرتان، وهوية واحدة، وتجربة تتطور.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">AUREVON × SKOVA — تعاون يربط الابتكار التقني بالهوية التجارية، ويمنح Study Flow مساحة لينمو إلى تجربة تعليمية أكثر ترابطاً وفائدة.</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line/70 bg-base/50 px-4 py-2 text-xs font-bold text-main">
          <Sparkles size={14} className="text-accent" />
          معاً نحو تجربة أذكى
        </div>
      </div>
    </section>
  );
}

const pillars = [
  {
    Icon: BrainCircuit,
    title: 'الابتكار والتطوير',
    brand: 'AUREVON',
    description: 'رؤية تقنية تركز على تطوير التجربة الرقمية، وربط الأدوات والخدمات بطريقة واضحة وقابلة للتوسع.',
  },
  {
    Icon: Layers3,
    title: 'الهوية والتجربة',
    brand: 'SKOVA',
    description: 'هوية موحدة وحضور متناسق يقرّب الخدمات من المستخدم، ويجعل تجربة سكوڤا جزءاً واضحاً من المنظومة.',
  },
  {
    Icon: BookOpen,
    title: 'القيمة التعليمية',
    brand: 'STUDY FLOW',
    description: 'تسخير هذا التعاون لخدمة الطالب: تنظيم أفضل، متابعة للتقدم، أدوات مراجعة، ومساعد دراسي في مكان واحد.',
  },
];

function CollaborationPillars() {
  return (
    <section className="space-y-3">
      <div className="text-center">
        <p className="text-xs font-bold tracking-wider text-accent">كيف يلتقي التعاون؟</p>
        <h2 className="mt-1 text-lg font-extrabold">ثلاثة أدوار تكمل بعضها</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {pillars.map(({ Icon, title, brand, description }) => (
          <article key={brand} className="rounded-2xl border border-line/70 bg-card/70 p-4 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
              <Icon size={21} />
            </span>
            <p className="mt-3 text-[10px] font-extrabold tracking-widest text-accent" dir="ltr">{brand}</p>
            <h3 className="mt-1 font-bold">{title}</h3>
            <p className="mt-2 text-xs leading-6 text-muted">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SharedVision() {
  const initiatives = [
    'توحيد الهوية البصرية ورسائل التعاون داخل التطبيق.',
    'تطوير مزايا رقمية مشتركة تخدم الطالب وتبسط استخدامه.',
    'إتاحة مساحة واضحة للتعريف بخدمات ومبادرات سكوڤا.',
    'إضافة تحسينات تدريجية بناءً على احتياجات المستخدمين.',
  ];

  return (
    <section className="rounded-2xl border border-line/70 bg-card/60 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Handshake size={19} className="text-accent" />
        <h2 className="font-extrabold">مسارات التعاون القادمة</h2>
      </div>
      <p className="mt-2 text-sm leading-7 text-muted">التعاون ليس مجرد ظهور اسمين بجانب بعضهما؛ بل مسار تطوير متدرج، يبدأ بهوية مشتركة ويتوسع مع كل ميزة تقدم فائدة فعلية.</p>
      <ul className="mt-3 space-y-2">
        {initiatives.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-base/70 px-3 py-3">
        <div>
          <p className="text-xs font-bold">الهدف المشترك</p>
          <p className="mt-1 text-xs text-muted">تقنية أقرب، تجربة أسهل، وقيمة أكبر للطالب.</p>
        </div>
        <ArrowUpRight size={18} className="shrink-0 text-accent" />
      </div>
    </section>
  );
}

function Content() {
  return (
    <div className="space-y-6">
      <PartnershipIdentity />
      <CollaborationPillars />
      <SharedVision />
      <section className="space-y-3 border-t border-line/70 pt-5 text-center">
        <h2 className="text-lg font-extrabold">عن Study Flow</h2>
        <p className="text-sm leading-7 text-muted">رفيقك في تنظيم الدراسة، ومتابعة الإنجاز، ومراجعة الدروس والاستعداد للامتحانات.</p>
        <p className="text-sm leading-7 text-muted">صُمّم لمساعدة الطلاب على بناء عادات دراسية أفضل، ومتابعة أهدافهم خطوة بخطوة.</p>
        <p className="pt-1 text-sm font-semibold">نتمنى لك دوام النجاح والتوفيق.</p>
      </section>
    </div>
  );
}

/** صفحة «عن التطبيق» (من قائمة المزيد) */
export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="عن التطبيق والتعاون" subtitle="AUREVON × SKOVA × STUDY FLOW" />
      <div className="card">
        <Content />
      </div>
    </div>
  );
}

/** شاشة الترحيب عند فتح التطبيق */
export function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-base p-5 sm:p-6" role="dialog" aria-label="مرحباً بك">
      <div className="w-full max-w-2xl space-y-6">
        <Content />
        <button type="button" className="btn btn-primary w-full" onClick={onStart}>
          ابدأ الآن
        </button>
      </div>
    </div>
  );
}
