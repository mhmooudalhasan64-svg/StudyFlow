import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../store';
import { PageTitle, ProgressRing, SubjectSelect } from '../components/ui';
import { MODE_LABEL, modeMs, type TimerMode } from '../lib/timer';
import { formatClock, formatMinutes, toDateKey } from '../lib/utils';
import { minutesByDay } from '../lib/stats';

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
      <PageTitle title="مؤقت التركيز" subtitle="تقنية بومودورو: تركيز ثم استراحة" />

      <div className="card space-y-5">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line p-1" role="tablist" aria-label="نمط المؤقت">
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
              المادة التي تدرسها
            </label>
            <SubjectSelect id="timer-subject" value={timer.subjectId} onChange={setSubject} />
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn btn-ghost !px-3.5" onClick={resetTimer} aria-label="إعادة ضبط">
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
          <span>درست اليوم: {formatMinutes(todayMin)}</span>
        </div>
      </div>

      <p className="px-2 text-center text-xs text-muted">
        بعد كل 4 جلسات تركيز تأتي استراحة طويلة. يمكنك تعديل المدد من الإعدادات.
      </p>
    </div>
  );
}
