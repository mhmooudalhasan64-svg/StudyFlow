import { BookOpen, BrainCircuit, Compass, GraduationCap, Layers3, Sparkles, Building2 } from 'lucide-react';
import { PageTitle } from '../components/ui';

const pillars = [
  { Icon: BrainCircuit, title: 'ذكاء يساعدك على الفهم', text: 'مساعد تعليمي ومعلم صوتي لدعم التعلم والإجابة عن الأسئلة.' },
  { Icon: Compass, title: 'تعلم منظم', text: 'خطط دراسية وأدوات تركيز ومتابعة للتقدم والإنجاز.' },
  { Icon: BookOpen, title: 'معرفة في مكان واحد', text: 'مكتبة ومواد تعليمية وبطاقات ومراجعة واختبارات.' },
];

function BrandHero() {
  return (
    <section className="vayora-brand-hero relative isolate overflow-hidden rounded-3xl border p-6 text-center text-white shadow-xl sm:p-9">
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
      <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-sky-100/80" dir="ltr">AN AUREVON PRODUCT</p>
    </section>
  );
}

function ProductIdentity() {
  return (
    <section className="aurevon-ecosystem relative isolate space-y-6 overflow-hidden rounded-3xl border p-5 text-white shadow-2xl sm:p-7">
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="relative text-center">
        <p className="text-[10px] font-black tracking-[0.28em] text-sky-200/80" dir="ltr">AUREVON · PRODUCT FAMILY</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">AUREVON تنتج VAYORA وAVORA</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">AUREVON هي الجهة المنتجة لكلٍّ من VAYORA وAVORA. فايورا هي المنصة التعليمية، وأفورا هو المساعد الذكي والذكاء الاصطناعي المخصص للعمل داخلها.</p>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-center backdrop-blur-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-slate-300/20 bg-slate-200/10 text-slate-100 shadow-lg"><Building2 size={26} /></span>
          <p className="mt-4 text-xl font-black tracking-[0.13em]" dir="ltr">AUREVON</p>
          <p className="mt-1 text-sm font-bold text-slate-200">أوريفون · الشركة المنتجة</p>
          <p className="mt-3 text-xs leading-6 text-slate-300">الجهة المنتجة والمطوّرة لمنتجاتها الرقمية، ومنها VAYORA وAVORA.</p>
          <span className="mt-4 inline-flex rounded-full border border-slate-300/20 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-200">الرؤية والتطوير</span>
        </article>
        <article className="rounded-2xl border border-sky-300/30 bg-gradient-to-b from-sky-400/15 to-sky-950/20 p-4 text-center shadow-xl shadow-sky-950/20">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sky-200/25 bg-sky-100/10 shadow-lg"><img src="/icon.svg" alt="رمز VAYORA" className="h-10 w-10" /></span>
          <p className="mt-4 text-xl font-black tracking-[0.13em]" dir="ltr">VAYORA</p>
          <p className="mt-1 text-sm font-bold text-sky-100">فايورا · المنصة التعليمية</p>
          <p className="mt-3 text-xs leading-6 text-slate-200">المساحة التي تجمع التخطيط الدراسي، التركيز، المكتبة، المراجعة، الاختبارات، وتتبع التقدم في تجربة واحدة.</p>
          <span className="mt-4 inline-flex rounded-full border border-sky-200/25 bg-sky-100/10 px-3 py-1 text-[10px] font-bold text-sky-100">تجربة التعلم</span>
        </article>
        <article className="rounded-2xl border border-violet-300/25 bg-gradient-to-b from-violet-400/15 to-violet-950/20 p-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-violet-200/25 bg-violet-100/10 shadow-lg"><BrainCircuit size={27} /></span>
          <p className="mt-4 text-xl font-black tracking-[0.13em]" dir="ltr">AVORA</p>
          <p className="mt-1 text-sm font-bold text-violet-100">أفورا · المساعد الذكي لفايورا</p>
          <p className="mt-3 text-xs leading-6 text-slate-200">الذكاء الاصطناعي المخصص لمنصة VAYORA؛ يساعد الطالب على فهم الدروس، والإجابة عن الأسئلة، والتفاعل النصي والصوتي ضمن تجربته التعليمية.</p>
          <span className="mt-4 inline-flex rounded-full border border-violet-200/25 bg-violet-100/10 px-3 py-1 text-[10px] font-bold text-violet-100">المساعدة الذكية</span>
        </article>
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold text-sky-100"><Layers3 size={15} /> كيف ترتبط المنتجات؟</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white/[0.06] p-3 text-center"><p className="text-xs font-black text-slate-100">01 · AUREVON</p><p className="mt-1 text-[11px] leading-5 text-slate-300">تنتج وتطوّر المنتجات</p></div>
          <div className="rounded-xl bg-white/[0.06] p-3 text-center"><p className="text-xs font-black text-sky-100">02 · VAYORA</p><p className="mt-1 text-[11px] leading-5 text-slate-300">المنصة التعليمية المتكاملة</p></div>
          <div className="rounded-xl bg-white/[0.06] p-3 text-center"><p className="text-xs font-black text-violet-100">03 · AVORA</p><p className="mt-1 text-[11px] leading-5 text-slate-300">المساعد الذكي المخصص لفايورا</p></div>
        </div>
        <p className="mt-4 text-center text-sm font-extrabold tracking-wide">AUREVON تنتج · VAYORA تعلّم · AVORA تساعد</p>
        <p className="mt-1 text-center text-[10px] text-slate-400">منتجان من AUREVON؛ وتعمل AVORA بوصفها المساعد الذكي المخصص داخل VAYORA.</p>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2">
        <a href="#/assistant" className="group flex items-center gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/[0.07] p-4 transition hover:border-violet-200/50 hover:bg-violet-300/10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-200/10 text-violet-100"><BrainCircuit size={22} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">جرّب AVORA AI</span><span className="mt-1 block text-[11px] text-slate-300">انتقل إلى المساعد الدراسي الذكي</span></span>
          <span className="text-violet-200 transition group-hover:-translate-x-1">←</span>
        </a>
        <a href="#/home" className="group flex items-center gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/[0.07] p-4 transition hover:border-sky-200/50 hover:bg-sky-300/10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-200/10 text-sky-100"><GraduationCap size={22} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">تابع رحلتك مع VAYORA</span><span className="mt-1 block text-[11px] text-slate-300">عد إلى مساحة التعلم والإنجاز</span></span>
          <span className="text-sky-200 transition group-hover:-translate-x-1">←</span>
        </a>
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
        <ProductIdentity />
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
        <p className="text-center text-xs font-semibold text-muted">AUREVON · PRODUCER OF VAYORA & AVORA</p>
      </div>
    </div>
  );
}
