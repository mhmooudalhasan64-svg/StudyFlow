/**
 * الصوت عبر إمكانات المتصفح المجانية (Web Speech API): لا مكتبات ولا مفاتيح.
 * - القراءة بصوت عالٍ تعتمد على أصوات الجهاز (قد لا يتوفر صوت عربي).
 * - الإملاء الصوتي يعمل في متصفحات مثل كروم، وقد يحتاج اتصالاً بالإنترنت.
 */

interface RecEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
  error?: string;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: RecEvent) => void) | null;
  onend: (() => void) | null;
}

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = (): boolean => recognitionCtor() !== null;

export const canSpeak = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** ينظّف رموز التنسيق ويقصّ النص الطويل قبل القراءة */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[*#_`>~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

export function speak(text: string, cb: { onEnd?: () => void; onError?: (msg: string) => void } = {}): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang = 'ar-SA';
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('ar'));
  if (voice) u.voice = voice;
  u.onend = () => cb.onEnd?.();
  u.onerror = () => cb.onError?.('تعذّرت القراءة الصوتية. قد لا يتوفر صوت عربي على جهازك.');
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export interface ListenHandlers {
  onText: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
  lang?: string;
}

/** يبدأ الاستماع ويعيد دالة لإيقافه */
export function listen(h: ListenHandlers): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    h.onError('متصفحك لا يدعم الإملاء الصوتي.');
    h.onEnd();
    return () => {};
  }
  const r = new Ctor();
  r.lang = h.lang ?? 'ar-SA';
  r.interimResults = true;
  r.continuous = false;
  r.onresult = (e) => {
    let t = '';
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    h.onText(t.trim());
  };
  r.onerror = (e) => {
    const code = e.error;
    h.onError(
      code === 'not-allowed' || code === 'service-not-allowed'
        ? 'اسمح للمتصفح باستخدام الميكروفون من إعدادات الموقع.'
        : code === 'no-speech'
          ? 'لم أسمع شيئاً، حاول مرة أخرى.'
          : 'تعذّر التعرف على الصوت.',
    );
  };
  r.onend = () => h.onEnd();
  try {
    r.start();
  } catch {
    h.onError('تعذّر تشغيل الميكروفون.');
    h.onEnd();
  }
  return () => {
    try {
      r.stop();
    } catch {
      /* لا شيء */
    }
  };
}
