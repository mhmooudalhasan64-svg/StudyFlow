import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, HardDrive, Plus, Trash2, Upload, Volume2 } from 'lucide-react';
import { useApp } from '../store';
import { NumberField, PageTitle } from '../components/ui';
import { SUBJECT_COLORS } from '../seed';
import { exportBackup } from '../lib/backup';
import { toDateKey } from '../lib/utils';
import { playSound, primeAudio, SOUNDS, type SoundKind } from '../lib/sound';

export default function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const subjects = useApp((s) => s.subjects);
  const update = useApp((s) => s.updateSettings);
  const addSubject = useApp((s) => s.addSubject);
  const removeSubject = useApp((s) => s.removeSubject);
  const resetAll = useApp((s) => s.resetAll);
  const importBackupText = useApp((s) => s.importBackupText);

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

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [backupMsg, setBackupMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (est?.usage !== undefined && est.quota !== undefined) setStorage({ usage: est.usage, quota: est.quota });
        setPersisted((await navigator.storage?.persisted?.()) ?? null);
      } catch {
        /* غير مدعوم */
      }
    })();
  }, []);

  const mb = (n: number) => `${(n / (1024 * 1024)).toFixed(1)} م.ب`;

  const askPersist = async () => {
    try {
      setPersisted((await navigator.storage?.persist?.()) ?? false);
    } catch {
      setPersisted(false);
    }
  };

  const doExport = async () => {
    const blob = new Blob([await exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-backup-${toDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    void update({ lastBackup: Date.now() });
    setBackupMsg({ kind: 'ok', text: 'تم تنزيل النسخة الاحتياطية' });
  };

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('سيتم استبدال بياناتك الحالية بمحتوى النسخة (الكتب لا تتأثر). متابعة؟')) return;
    try {
      await importBackupText(await file.text());
      setBackupMsg({ kind: 'ok', text: 'تمت استعادة النسخة' });
    } catch (err) {
      setBackupMsg({ kind: 'err', text: err instanceof Error ? err.message : 'تعذّرت الاستعادة' });
    }
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
        {settings.sound && (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sound-kind" className="shrink-0">
              صوت التنبيه
            </label>
            <select
              id="sound-kind"
              className="input"
              value={settings.soundKind ?? 'classic'}
              onChange={(e) => {
                const kind = e.target.value as SoundKind;
                void update({ soundKind: kind });
                primeAudio();
                playSound(kind);
              }}
            >
              {SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost shrink-0 !px-3"
              aria-label="تجربة الصوت"
              onClick={() => {
                primeAudio();
                playSound(settings.soundKind);
              }}
            >
              <Volume2 size={16} />
            </button>
          </div>
        )}
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
        <h2 className="font-bold">البيانات دون إنترنت</h2>
        <p className="text-sm text-muted">
          التطبيق وبياناتك وكتبك المحمّلة تعمل دون إنترنت بعد أول تحميل. لا توجد مزامنة سحابية بعد (لا حسابات)، لذلك استخدم النسخة الاحتياطية لنقل بياناتك بين الأجهزة.
        </p>
        {storage && (
          <p className="flex items-center gap-2 text-sm">
            <HardDrive size={16} className="text-accent" />
            المستخدم {mb(storage.usage)} من {mb(storage.quota)} تقريباً
          </p>
        )}
        {persisted === false && (
          <button type="button" className="btn btn-ghost" onClick={() => void askPersist()}>
            اطلب حماية البيانات من الحذف التلقائي
          </button>
        )}
        {persisted === true && <p className="text-xs text-ok">التخزين محمي من الحذف التلقائي.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => void doExport()}>
            <Download size={16} /> تصدير نسخة احتياطية
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> استعادة نسخة
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
        </div>
        <p className="text-xs text-muted">النسخة لا تتضمن ملفات PDF للكتب؛ أعد إضافتها على الجهاز الجديد.</p>
        {backupMsg && (
          <p role="status" className={`text-sm ${backupMsg.kind === 'ok' ? 'text-ok' : 'text-bad'}`}>
            {backupMsg.text}
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">مسح البيانات</h2>
        <p className="text-sm text-muted">
          حذف بيانات الموقع من المتصفح أو مسح كل البيانات يمحو تقدمك وكتبك.
        </p>
        <button type="button" className="btn btn-danger" onClick={confirmReset}>
          <Trash2 size={16} /> مسح كل البيانات
        </button>
      </section>
    </div>
  );
}
