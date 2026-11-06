import { speak } from './voice';

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

/** تنبيه منطوق بدلاً من النغمات الإلكترونية. */
export function beep(): void {
  speak('تنبيه.');
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

/** يعلن التنبيه بصوت بشري بدلاً من النغمة الاصطناعية القديمة. */
export function playSound(_kind: SoundKind | undefined): void {
  speak('حان وقت الدراسة.');
}
