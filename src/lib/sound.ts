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
