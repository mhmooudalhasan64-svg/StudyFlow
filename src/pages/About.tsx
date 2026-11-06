import { BookOpen, BrainCircuit, Compass, GraduationCap, Layers3, Sparkles, Store, Building2 } from 'lucide-react';
import { PageTitle } from '../components/ui';

const pillars = [
  { Icon: BrainCircuit, title: 'ذكاء يساعدك على الفهم', text: 'مساعد تعليمي ومعلم صوتي لدعم التعلم والإجابة عن الأسئلة.' },
  { Icon: Compass, title: 'تعلم منظم', text: 'خطط دراسية وأدوات تركيز ومتابعة للتقدم والإنجاز.' },
  { Icon: BookOpen, title: 'معرفة في مكان واحد', text: 'مكتبة ومواد تعليمية وبطاقات ومراجعة واختبارات.' },
];

function BrandHero() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-[#10233D] via-[#172E50] to-[#263D68] p-6 text-center text-white shadow-xl sm:p-9">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-sky-200/15 shadow-[0_0_0_24px_rgb(125_211_252/0.035),0_0_0_48px_rgb(165_180_252/0.025)]" />
      <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-[1.6rem] border border-white/20 bg-white/10 shadow-lg backdrop-blur">
        <img src="/icon.svg" alt="رمز VAYORA الهندسي" className="h-14 w-14" />
      </div>
      <p className="mt-5 text-3xl font-black tracking-[0.12em]" dir="ltr">VAYORA</p>
      <p className="mt-1 text-lg font-bold text-sky-100">فايورا</p>
      <p className="mt-4 text-sm font-semibold text-white/90">منصة تعليمية ذكية متكاملة</p>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-200">تجربة تعليمية تجمع أدوات الدراسة والمعرفة والمساعدة الذكية في منظومة واحدة، لتجعل رحلة التعلم أوضح وأكثر ترابطاً.</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-sky-100">
        <Sparkles size={14} /> تعلّم بذكاء. تطوّر بثقة.
      </div>
      <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-sky-100/80" dir="ltr">AN AUREVON COMPANY</p>
    </section>
  );
}

function PartnershipIdentity() {
  return (
    <section className="space-y-4 rounded-3xl border border-line/80 bg-card/70 p-4 sm:p-6">
      <div className="text-center">
        <p className="text-xs font-bold tracking-wider text-accent">منظومة واحدة، أدوار متكاملة</p>
        <h2 className="mt-2 text-xl font-black">تعرّف على عائلة العلامات</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">ثلاث هويات متمايزة تعمل معاً: شركة تقود التطوير، ومنصة تصنع تجربة التعلم، وعلامة تقدم أدوات وخدمات تعليمية ذكية.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-400/25 bg-gradient-to-br from-[#111827] to-[#263449] p-4 text-center text-white">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/10"><Building2 size={23} /></span>
          <p className="mt-3 text-lg font-black tracking-[0.12em]" dir="ltr">AUREVON</p>
          <p className="mt-1 text-sm font-bold text-slate-200">أوريفون</p>
          <p className="mt-3 text-xs leading-6 text-slate-300">الشركة الأم والجهة المطوّرة للمنظومة، تقود الابتكار وتطوير الحلول الرقمية.</p>
          <span className="mt-3 inline-block rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold text-slate-200">الشركة الأم</span>
        </article>
        <article className="rounded-2xl border border-sky-400/30 bg-gradient-to-br from-[#10233D] to-[#245078] p-4 text-center text-white shadow-lg shadow-sky-900/10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/10"><img src="/icon.svg" alt="" className="h-8 w-8" /></span>
          <p className="mt-3 text-lg font-black tracking-[0.12em]" dir="ltr">VAYORA</p>
          <p className="mt-1 text-sm font-bold text-sky-100">فايورا</p>
          <p className="mt-3 text-xs leading-6 text-slate-200">المنصة التعليمية الذكية التي تجمع التخطيط والتركيز والمراجعة والاختبارات والمساعدة.</p>
          <span className="mt-3 inline-block rounded-full border border-sky-200/25 px-3 py-1 text-[10px] font-bold text-sky-100">المنصة التعليمية</span>
        </article>
        <article className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-[#21183E] to-[#49336D] p-4 text-center text-white">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/25 bg-white/10"><Store size={23} /></span>
          <p className="mt-3 text-lg font-black tracking-[0.12em]" dir="ltr">SKOVA</p>
          <p className="mt-1 text-sm font-bold text-violet-100">سكوڤا</p>
          <p className="mt-3 text-xs leading-6 text-violet-100/90">المعلم الذكي والعلامة المرتبطة بالخدمات والمنتجات التعليمية ضمن تجربة فايورا.</p>
          <span className="mt-3 inline-block rounded-full border border-violet-200/25 px-3 py-1 text-[10px] font-bold text-violet-100">المعلم والمتجر</span>
        </article>
      </div>
      <div className="rounded-2xl border border-line/70 bg-base/60 px-4 py-3 text-center">
        <p className="text-sm font-extrabold">AUREVON تقود · VAYORA تجمع · SKOVA تساعد</p>
        <p className="mt-1 text-xs text-muted">تكامل في التجربة، مع الحفاظ على استقلالية وهوية كل علامة.</p>
      </div>
    </section>
  );
}

export default function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageTitle title="عن VAYORA" subtitle="تعرّف على المنصة والمنظومة التي تقف خلفها" />
      <div className="card space-y-6">
        <BrandHero />
        <PartnershipIdentity />
        <section className="grid gap-3 sm:grid-cols-3">
          {pillars.map(({ Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-line/70 bg-card/70 p-4 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={21} /></span>
              <h2 className="mt-3 font-bold">{title}</h2>
              <p className="mt-2 text-xs leading-6 text-muted">{text}</p>
            </article>
          ))}
        </section>
        <section className="rounded-2xl border border-line/70 bg-base/50 p-5 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><GraduationCap size={22} /></div>
          <h2 className="mt-3 text-lg font-extrabold">مساحة واحدة لرحلتك التعليمية</h2>
          <p className="mt-2 text-sm leading-7 text-muted">من تنظيم الوقت إلى فهم الدروس، ومن التدريب إلى قياس التقدم؛ صُممت VAYORA لتجمع احتياجات التعلم اليومية ضمن تجربة سهلة ومتناسقة.</p>
        </section>
        <p className="text-center text-xs font-semibold text-muted">AUREVON × VAYORA × SKOVA</p>
      </div>
    </div>
  );
}

/** شاشة الترحيب عند فتح التطبيق */
export function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-base p-5 sm:p-6" role="dialog" aria-label="مرحباً بك في فايورا">
      <div className="w-full max-w-2xl space-y-6">
        <div className="card"><BrandHero /></div>
        <button type="button" className="btn btn-primary w-full" onClick={onStart}>ابدأ رحلتك مع فايورا</button>
      </div>
    </div>
  );
}
