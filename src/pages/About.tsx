import { PageTitle } from '../components/ui';

/** صفحة تعريفية: اسم المتجر وجملة الإهداء */
export default function About() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageTitle title="عن التطبيق" />
      <section className="card flex flex-col items-center gap-4 text-center">
        <img src="/logo.png" alt="شعار متجر سكوڤا" width={160} height={160} className="h-40 w-40 rounded-3xl object-cover" />
        <div>
          <h2 className="text-2xl font-extrabold">متجر سكوڤا</h2>
          <p className="text-xs tracking-[0.3em] text-muted" dir="ltr">
            SKOVA STORE
          </p>
        </div>
        <p className="text-base leading-relaxed">صُمِّم هذا العمل لمساعدة طلابنا في المرحلة الثانوية.</p>
        <p className="text-sm text-muted">نتمنى لكم دراسة ممتعة ونجاحاً وتفوقاً.</p>
      </section>
    </div>
  );
}
