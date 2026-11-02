import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { NumberField, PageTitle } from '../components/ui';
import { SUBJECT_COLORS } from '../seed';

export default function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const subjects = useApp((s) => s.subjects);
  const update = useApp((s) => s.updateSettings);
  const addSubject = useApp((s) => s.addSubject);
  const removeSubject = useApp((s) => s.removeSubject);
  const resetAll = useApp((s) => s.resetAll);

  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void addSubject(name, color);
    setName('');
  };

  const confirmRemove = (id: number, subjectName: string) => {
    if (window.confirm(`حذف «${subjectName}»؟ سيتم حذف أسئلتها ونتائجها أيضاً.`)) void removeSubject(id);
  };

  const confirmReset = () => {
    if (window.confirm('سيتم حذف كل بياناتك (المهام والجلسات والامتحانات والأسئلة). هل أنت متأكد؟')) void resetAll();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="الإعدادات" subtitle="كل بياناتك محفوظة على جهازك فقط" />

      <section className="card space-y-4">
        <h2 className="font-bold">المؤقت والهدف</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="مدة التركيز" unit="دقيقة" value={settings.focusMin} min={1} max={120} onCommit={(n) => void update({ focusMin: n })} />
          <NumberField label="استراحة قصيرة" unit="دقيقة" value={settings.shortMin} min={1} max={60} onCommit={(n) => void update({ shortMin: n })} />
          <NumberField label="استراحة طويلة" unit="دقيقة" value={settings.longMin} min={1} max={60} onCommit={(n) => void update({ longMin: n })} />
          <NumberField label="هدف الدراسة اليومي" unit="دقيقة" value={settings.dailyGoalMin} min={10} max={720} onCommit={(n) => void update({ dailyGoalMin: n })} />
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>تنبيه صوتي عند انتهاء الجلسة</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--accent))]"
            checked={settings.sound}
            onChange={(e) => void update({ sound: e.target.checked })}
          />
        </label>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>المظهر</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line p-1">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={settings.theme === t}
                onClick={() => void update({ theme: t })}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                  settings.theme === t ? 'bg-gradient-to-l from-accent to-accent2 text-onaccent' : 'text-muted'
                }`}
              >
                {t === 'dark' ? 'داكن' : 'فاتح'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">المواد الدراسية</h2>
        <ul className="space-y-2">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-base/40 px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
              <button
                type="button"
                aria-label={`حذف ${s.name}`}
                onClick={() => confirmRemove(s.id, s.name)}
                className="rounded-lg p-2 text-muted transition hover:bg-bad/10 hover:text-bad"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="space-y-3 border-t border-line pt-3">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="اسم مادة جديدة"
              aria-label="اسم المادة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
            <button type="submit" className="btn btn-primary shrink-0" disabled={!name.trim()}>
              <Plus size={16} /> إضافة
            </button>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="لون المادة">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`لون ${c}`}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition ${color === c ? 'border-main scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">البيانات</h2>
        <p className="text-sm text-muted">
          لا يوجد خادم ولا حساب: كل شيء مخزّن في متصفحك. حذف بيانات الموقع من المتصفح يمسح تقدمك.
        </p>
        <button type="button" className="btn btn-danger" onClick={confirmReset}>
          <Trash2 size={16} /> مسح كل البيانات
        </button>
      </section>
    </div>
  );
}
