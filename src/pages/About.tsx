import { PageTitle } from '../components/ui';

const NAME_AR = 'متجر سكوڤا';
const LINE_1 = 'أهلًا بك في StudyFlow، رفيقك في الدراسة.';
const LINE_2 = 'صُمّم هذا التطبيق خصيصًا لمساعدة طلاب المرحلة الثانوية على تنظيم دراستهم ومراجعتها وتحقيق التفوّق.';
const LINE_3 = 'نتمنى لك دوام النجاح والتوفيق.';

function Content() {
  return (
    <section className="flex flex-col items-center gap-4 text-center">
      <img src="/logo.png" alt="شعار متجر سكوڤا" width={176} height={176} className="h-44 w-44 rounded-3xl object-cover shadow-lg" />
      <div>
        <h2 className="text-2xl font-extrabold">{NAME_AR}</h2>
        <p className="text-xs tracking-[0.3em] text-muted" dir="ltr">
          SKOVA STORE
        </p>
      </div>
      <p className="text-lg font-bold">{LINE_1}</p>
      <p className="text-base leading-relaxed">{LINE_2}</p>
      <p className="text-sm text-muted">{LINE_3}</p>
    </section>
  );
}

/** صفحة «عن التطبيق» (من قائمة المزيد) */
export default function About() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageTitle title="عن التطبيق" />
      <div className="card">
        <Content />
      </div>
    </div>
  );
}

/** شاشة الترحيب عند فتح التطبيق */
export function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-base p-6" role="dialog" aria-label="مرحباً بك">
      <div className="w-full max-w-md space-y-6">
        <Content />
        <button type="button" className="btn btn-primary w-full" onClick={onStart}>
          ابدأ الآن
        </button>
      </div>
    </div>
  );
}
