import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, BellRing, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { dueAlarms, formatAlarmTime, isValidTime, notify, type Alarm } from '../lib/alarm';
import { playSound, primeAudio } from '../lib/sound';
import { toDateKey } from '../lib/utils';

const SNOOZE_MS = 5 * 60_000;
const MAX_ALARMS = 8;

/** بطاقة إدارة المنبهات (في صفحة المؤقت) */
export default function Alarms() {
  const alarms = useApp((s) => s.settings.alarms) ?? [];
  const updateSettings = useApp((s) => s.updateSettings);
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('');
  const [perm, setPerm] = useState<NotificationPermission | 'none'>(() =>
    typeof Notification === 'undefined' ? 'none' : Notification.permission,
  );

  const save = (next: Alarm[]) => void updateSettings({ alarms: next });

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidTime(time) || alarms.length >= MAX_ALARMS) return;
    primeAudio();
    save([...alarms, { id: `${Date.now()}`, time, label: label.trim().slice(0, 40) || 'وقت الدراسة', enabled: true }]);
    setLabel('');
  };

  const askPermission = async () => {
    try {
      setPerm(await Notification.requestPermission());
    } catch {
      /* غير مدعوم */
    }
  };

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-bold">
        <Bell size={18} className="text-accent" /> منبّه الدراسة
      </h2>
      <p className="text-xs text-muted">
        يرنّ يومياً في الوقت المحدد بالصوت المختار. يعمل والتطبيق مفتوح (أو في الخلفية)، ولا يرنّ إن أُغلق التطبيق تماماً.
      </p>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor="alarm-time">
            الوقت
          </label>
          <input id="alarm-time" type="time" className="input !w-auto" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="min-w-[8rem] flex-1">
          <label className="label" htmlFor="alarm-label">
            الاسم
          </label>
          <input
            id="alarm-label"
            className="input"
            placeholder="مثال: مراجعة الفيزياء"
            maxLength={40}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={!isValidTime(time) || alarms.length >= MAX_ALARMS}>
          <Plus size={16} /> أضف
        </button>
      </form>

      {alarms.length > 0 && (
        <ul className="space-y-2">
          {alarms.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line/70 px-3 py-2.5">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-[rgb(var(--accent))]"
                aria-label={`تفعيل منبه ${a.label}`}
                checked={a.enabled}
                onChange={(e) => save(alarms.map((x) => (x.id === a.id ? { ...x, enabled: e.target.checked } : x)))}
              />
              <div className={`min-w-0 flex-1 ${a.enabled ? '' : 'text-muted'}`}>
                <p className="text-lg font-bold leading-tight">{formatAlarmTime(a.time)}</p>
                <p className="truncate text-xs text-muted">{a.label}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:text-bad"
                aria-label={`حذف منبه ${a.label}`}
                onClick={() => save(alarms.filter((x) => x.id !== a.id))}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {perm === 'default' && (
        <button type="button" className="btn btn-ghost w-full text-xs" onClick={() => void askPermission()}>
          فعّل إشعارات المتصفح ليصلك التنبيه حتى لو كان التطبيق في الخلفية
        </button>
      )}
      {perm === 'denied' && <p className="text-xs text-muted">إشعارات المتصفح محظورة. يمكنك السماح بها من إعدادات الموقع.</p>}
    </div>
  );
}

/** يراقب المنبهات ويُظهر شاشة الرنين. يُركَّب مرة واحدة في التطبيق. */
export function AlarmRinger() {
  const alarms = useApp((s) => s.settings.alarms);
  const soundKind = useApp((s) => s.settings.soundKind);
  const updateSettings = useApp((s) => s.updateSettings);
  const [ringing, setRinging] = useState<Alarm | null>(null);
  const alarmsRef = useRef(alarms);
  alarmsRef.current = alarms;
  const snoozeTimer = useRef<number | null>(null);

  // فحص كل 5 ثوانٍ
  useEffect(() => {
    const id = window.setInterval(() => {
      const list = alarmsRef.current ?? [];
      const today = toDateKey();
      const due = dueAlarms(list, new Date(), today);
      if (due.length === 0) return;
      void updateSettings({ alarms: list.map((a) => (due.some((d) => d.id === a.id) ? { ...a, lastFired: today } : a)) });
      setRinging(due[0]);
      void notify('حان وقت الدراسة', due[0].label);
    }, 5000);
    return () => window.clearInterval(id);
  }, [updateSettings]);

  // الصوت يتكرر حتى الإيقاف، ويتوقف تلقائياً بعد دقيقة
  useEffect(() => {
    if (!ringing) return;
    playSound(soundKind);
    const every = window.setInterval(() => playSound(soundKind), 3500);
    const stop = window.setTimeout(() => setRinging(null), 60_000);
    return () => {
      window.clearInterval(every);
      window.clearTimeout(stop);
    };
  }, [ringing, soundKind]);

  useEffect(
    () => () => {
      if (snoozeTimer.current) window.clearTimeout(snoozeTimer.current);
    },
    [],
  );

  if (!ringing) return null;

  const snooze = () => {
    const a = ringing;
    setRinging(null);
    if (snoozeTimer.current) window.clearTimeout(snoozeTimer.current);
    snoozeTimer.current = window.setTimeout(() => setRinging(a), SNOOZE_MS);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-base/90 p-6 backdrop-blur" role="alertdialog" aria-label="المنبه">
      <div className="card w-full max-w-sm space-y-5 text-center">
        <BellRing size={44} className="mx-auto animate-pulse text-accent" />
        <div>
          <p className="text-3xl font-extrabold">{formatAlarmTime(ringing.time)}</p>
          <p className="mt-1 text-lg">{ringing.label}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-ghost" onClick={snooze}>
            غفوة 5 دقائق
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setRinging(null)}>
            إيقاف
          </button>
        </div>
      </div>
    </div>
  );
}
