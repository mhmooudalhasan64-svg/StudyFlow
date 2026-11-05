let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** يُستدعى عند نقرة المستخدم لتفعيل الصوت لاحقاً (سياسة المتصفحات). */
export function primeAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

/** ثلاث نغمات قصيرة */
export function beep(): void {
  const c = getCtx();
  if (!c) return;
  try {
    for (let i = 0; i < 3; i++) {
      const t0 = c.currentTime + i * 0.35;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    }
  } catch {
    /* الصوت اختياري */
  }
}

export type SoundKind = 'classic' | 'bell' | 'chime' | 'marimba' | 'digital' | 'zen' | 'harp';

interface Note {
  /** التردد بالهرتز */
  f: number;
  /** وقت البدء بالثواني */
  at: number;
  /** مدة الخفوت */
  dur: number;
  type: OscillatorType;
  gain: number;
}

const seq = (freqs: number[], step: number, dur: number, type: OscillatorType, gain: number): Note[] =>
  freqs.map((f, i) => ({ f, at: i * step, dur, type, gain }));

/** أصوات التنبيه: مولَّدة بالكامل في المتصفح، لا ملفات ولا إنترنت */
export const SOUNDS: { id: SoundKind; label: string; notes: Note[] }[] = [
  { id: 'classic', label: 'كلاسيكي (3 نغمات)', notes: seq([880, 880, 880], 0.35, 0.28, 'sine', 0.25) },
  {
    id: 'bell',
    label: 'جرس',
    // نغمة أساسية مع توافقيات غير منتظمة تعطي رنين المعدن
    notes: [1, 2.76, 5.4].flatMap((m, i) => [
      { f: 659 * m, at: 0, dur: 1.8 / (i + 1), type: 'sine' as const, gain: 0.22 / (i + 1) },
      { f: 659 * m, at: 0.9, dur: 1.4 / (i + 1), type: 'sine' as const, gain: 0.16 / (i + 1) },
    ]),
  },
  { id: 'chime', label: 'رنين صاعد', notes: seq([523, 659, 784, 1047], 0.18, 0.9, 'sine', 0.22) },
  { id: 'marimba', label: 'ماريمبا', notes: seq([392, 523, 659, 523, 784], 0.16, 0.35, 'triangle', 0.3) },
  { id: 'digital', label: 'رقمي', notes: seq([1200, 1200, 1600], 0.14, 0.09, 'square', 0.1) },
  {
    id: 'zen',
    label: 'هادئ (وعاء غناء)',
    notes: [
      { f: 220, at: 0, dur: 3, type: 'sine', gain: 0.3 },
      { f: 440.8, at: 0, dur: 2.6, type: 'sine', gain: 0.14 },
      { f: 662, at: 0, dur: 2, type: 'sine', gain: 0.06 },
    ],
  },
  { id: 'harp', label: 'قيثارة', notes: seq([1047, 784, 659, 523, 392], 0.13, 0.7, 'triangle', 0.22) },
];

export function soundLabel(kind: SoundKind | undefined): string {
  return SOUNDS.find((s) => s.id === kind)?.label ?? SOUNDS[0].label;
}

/** يشغّل الصوت المختار (يرجع للكلاسيكي إن كان الاسم غير معروف) */
export function playSound(kind: SoundKind | undefined): void {
  const c = getCtx();
  if (!c) return;
  const def = SOUNDS.find((s) => s.id === kind) ?? SOUNDS[0];
  try {
    for (const n of def.notes) {
      const t0 = c.currentTime + n.at;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = n.type;
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(n.gain, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.05);
    }
  } catch {
    /* الصوت اختياري */
  }
}
