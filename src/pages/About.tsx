import { PageTitle } from '../components/ui';

function PartnershipIdentity() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-accent2/15 p-5 text-center shadow-xl shadow-accent2/10 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-accent/15 shadow-[0_0_0_24px_rgb(var(--accent)/0.035),0_0_0_48px_rgb(var(--accent2)/0.025)]" aria-hidden="true" />
      <div className="relative">
        <span className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">شراكة وتعاون</span>
        <div className="mt-5 flex items-center justify-center gap-3 sm:gap-5">
          <div className="min-w-0">
            <p className="text-lg font-black tracking-tight sm:text-2xl">STUDY FLOW</p>
            <p className="mt-1 text-[10px] text-muted">منصة تنظيم الدراسة</p>
          </div>
          <span className="text-2xl font-black text-accent sm:text-3xl" aria-label="مع">×</span>
          <div className="flex min-w-0 flex-col items-center">
            <img src="/logo.png" alt="شعار متجر سكوڤا" width={76} height={76} className="h-[4.5rem] w-[4.5rem] rounded-2xl object-cover shadow-lg" />
            <p className="mt-2 text-sm font-black tracking-widest sm:text-base" dir="ltr">SKOVA</p>
          </div>
        </div>
        <h2 className="mt-6 text-xl font-black leading-relaxed sm:text-2xl">نتعلّم اليوم، ونصنع الغد.</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted">يجمع هذا التعاون بين Study Flow ومتجر سكوڤا في هوية واحدة، لدعم تجربة دراسية منظمة وطموحة.</p>
      </div>
    </section>
  );
}

function Content() {
  return (
    <div className="space-y-6">
      <PartnershipIdentity />
      <section className="space-y-3 text-center">
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
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle title="عن التطبيق والتعاون" />
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
      <div className="w-full max-w-md space-y-6">
        <Content />
        <button type="button" className="btn btn-primary w-full" onClick={onStart}>
          ابدأ الآن
        </button>
      </div>
    </div>
  );
}
