import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Save, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../store';
import { PageTitle, ProgressRing, SubjectSelect } from '../components/ui';
import { MODE_LABEL, modeMs, type TimerMode } from '../lib/timer';
import { formatClock, formatMinutes, toDateKey } from '../lib/utils';
import { minutesByDay } from '../lib/stats';
import { playSound, primeAudio, SOUNDS, type SoundKind } from '../lib/sound';
import Alarms from '../components/Alarms';

function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

const MODES: TimerMode[] = ['focus', 'short', 'long'];

export default function TimerPage() {
  const timer = useApp((s) => s.timer);
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const sessions = useApp((s) => s.sessions);
  const setMode = useApp((s) => s.setMode);
  const startTimer = useApp((s) => s.startTimer);
  const pauseTimer = useApp((s) => s.pauseTimer);
  const resetTimer = useApp((s) => s.resetTimer);
  const finishEarly = useApp((s) => s.finishEarly);
  const setSubject = useApp((s) => s.setTimerSubject);

  const now = useNow(timer.running);
  const remaining = timer.running && timer.endAt !== null ? Math.max(0, timer.endAt - now) : timer.remainingMs;
  const total = modeMs(timer.mode, settings);
  const pct = total > 0 ? 1 - remaining / total : 0;
  const todayMin = minutesByDay(sessions)[toDateKey()] ?? 0;
  const clock = formatClock(remaining);

  useEffect(() => {
    if (!timer.running) return;
    const previous = document.title;
    document.title = `${clock} • ${MODE_LABEL[timer.mode]}`;
    return () => {
      document.title = previous;
    };
  }, [clock, timer.running, timer.mode]);

  const canSave = timer.mode === 'focus' && total - remaining >= 60_000;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageTitle title="مؤقت التركيز" subtitle="تقنية بومودورو: جلسات تركيز تتخللها استراحات" />

      <div className="card space-y-5">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line p-1" role="tablist" aria-label="وضع المؤقت">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={timer.mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                timer.mode === m ? 'bg-gradient-to-l from-accent to-accent2 text-onaccent' : 'text-muted hover:text-main'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <ProgressRing pct={pct} size={240} stroke={14} gradientId="ring-timer">
            <div>
              <div
                className="text-5xl font-extrabold tabular-nums tracking-wider"
                dir="ltr"
                role="timer"
                aria-live="off"
              >
                {clock}
              </div>
              <div className="mt-1 text-sm text-muted">{MODE_LABEL[timer.mode]}</div>
            </div>
          </ProgressRing>
        </div>

        {timer.mode === 'focus' && (
          <div>
            <label className="label" htmlFor="timer-subject">
              المادة الدراسية
            </label>
            <SubjectSelect id="timer-subject" value={timer.subjectId} onChange={setSubject} />
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn btn-ghost !px-3.5" onClick={resetTimer} aria-label="إعادة ضبط المؤقت">
            <RotateCcw size={18} />
          </button>
          {timer.running ? (
            <button type="button" className="btn btn-primary min-w-36 !py-3 text-base" onClick={pauseTimer}>
              <Pause size={18} /> إيقاف مؤقت
            </button>
          ) : (
            <button type="button" className="btn btn-primary min-w-36 !py-3 text-base" onClick={startTimer}>
              <Play size={18} /> {remaining < total ? 'متابعة' : 'ابدأ'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost !px-3.5"
            onClick={() => void finishEarly()}
            disabled={!canSave}
            aria-label="حفظ الوقت المنقضي وإنهاء الجلسة"
            title="حفظ الوقت المنقضي وإنهاء الجلسة"
          >
            <Save size={18} />
          </button>
        </div>

        <div className="flex justify-between border-t border-line pt-3 text-sm text-muted">
          <span>جلسات مكتملة: {timer.cycles}</span>
          <span>وقت الدراسة اليوم: {formatMinutes(todayMin)}</span>
        </div>
      </div>

      <div className="card space-y-3">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            {settings.sound ? <Volume2 size={16} className="text-accent" /> : <VolumeX size={16} className="text-muted" />}
            تنبيه صوتي عند انتهاء الجلسة
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--accent))]"
            checked={settings.sound}
            onChange={(e) => void updateSettings({ sound: e.target.checked })}
          />
        </label>
        {settings.sound && (
          <div className="flex items-center gap-2">
            <select
              className="input"
              aria-label="نغمة التنبيه"
              value={settings.soundKind ?? 'classic'}
              onChange={(e) => {
                const kind = e.target.value as SoundKind;
                void updateSettings({ soundKind: kind });
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
      </div>

      <Alarms />

      <p className="px-2 text-center text-xs text-muted">
        بعد كل أربع جلسات تركيز، تحصل على استراحة طويلة. يمكنك تعديل مدة الجلسات والاستراحات من الإعدادات.
      </p>
    </div>
  );
}
