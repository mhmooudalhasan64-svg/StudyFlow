/** Native Android voice I/O through Capacitor, with Web Speech fallback for browsers. */
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

interface RecEvent { results: ArrayLike<ArrayLike<{ transcript: string }>>; error?: string }
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void;
  onresult: ((e: RecEvent) => void) | null; onerror: ((e: RecEvent) => void) | null; onend: (() => void) | null;
}
export type VoiceGender = 'any' | 'female' | 'male';
export type VoiceStyle = 'soft' | 'strong' | 'energetic';
export interface VoiceOptions { gender?: VoiceGender; style?: VoiceStyle }

const isNative = (): boolean => Capacitor.isNativePlatform();
function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export const canListen = (): boolean => isNative() || recognitionCtor() !== null;
export const canSpeak = (): boolean => isNative() || (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');

export async function prepareVoice(): Promise<void> {
  if (isNative()) {
    const availability = await SpeechRecognition.available();
    if (!availability.available) throw new Error('ميزة التعرّف على الكلام غير متاحة على هذا الجهاز. تحقق من تثبيت خدمة Google للصوت.');
    let permission = await SpeechRecognition.checkPermissions();
    if (permission.speechRecognition !== 'granted') permission = await SpeechRecognition.requestPermissions();
    if (permission.speechRecognition !== 'granted') throw new Error('يجب السماح لـ VAYORA باستخدام الميكروفون من إعدادات التطبيق.');
    return;
  }
  if (!recognitionCtor()) throw new Error('التعرّف على الكلام غير مدعوم في هذا المتصفح. افتح المنصة عبر Chrome أو استخدم تطبيق Android.');
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('المتصفح لا يتيح الوصول إلى الميكروفون. استخدم اتصال HTTPS ومتصفحاً حديثاً.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(track => track.stop());
}

export function availableArabicVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak() || isNative()) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('ar'));
}
export function cleanForSpeech(text: string): string {
  return text.replace(/\\bskova\\b/gi, 'سكوفا').replace(/[*#_`>~|]/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 1500);
}
function chooseVoice(gender: VoiceGender = 'any'): SpeechSynthesisVoice | undefined {
  const voices = availableArabicVoices();
  if (!voices.length) return undefined;
  if (gender === 'any') return voices[0];
  const hints = gender === 'female' ? /female|woman|zira|laila|hoda|ar.?female|أنثى|ليلى|هند/i : /male|man|david|hamdan|ar.?male|ذكر|عمر/i;
  return voices.find(v => hints.test(v.name)) ?? voices[0];
}
export function speak(text: string, cb: { onEnd?: () => void; onError?: (msg: string) => void } = {}, options: VoiceOptions = {}): void {
  const cleanText = cleanForSpeech(text);
  const style = options.style ?? 'soft';
  if (isNative()) {
    void TextToSpeech.speak({
      text: cleanText,
      lang: 'ar-SA',
      rate: style === 'energetic' ? 1.12 : style === 'strong' ? 0.94 : 0.88,
      pitch: style === 'energetic' ? 1.12 : style === 'strong' ? 0.86 : 1,
      volume: style === 'soft' ? 0.72 : 1,
    }).then(() => cb.onEnd?.()).catch(() => cb.onError?.('تعذّرت القراءة الصوتية. تحقق من تثبيت محرّك تحويل النص إلى كلام واللغة العربية على جهازك.'));
    return;
  }
  if (!canSpeak()) { cb.onError?.('القراءة الصوتية غير مدعومة في هذا المتصفح.'); return; }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(cleanText);
  u.lang = 'ar-SA';
  const voice = chooseVoice(options.gender);
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  u.rate = style === 'energetic' ? 1.12 : style === 'strong' ? 0.94 : 0.88;
  u.pitch = style === 'energetic' ? 1.12 : style === 'strong' ? 0.86 : 1;
  u.volume = style === 'soft' ? 0.72 : 1;
  u.onend = () => cb.onEnd?.();
  u.onerror = () => cb.onError?.('تعذّرت القراءة الصوتية. تحقق من توفر صوت عربي على جهازك.');
  synth.speak(u);
}
export function stopSpeaking(): void {
  if (isNative()) { void TextToSpeech.stop().catch(() => undefined); return; }
  if (canSpeak()) window.speechSynthesis.cancel();
}

export interface ListenHandlers { onText: (text: string) => void; onEnd: () => void; onError: (message: string) => void; lang?: string }
export function listen(h: ListenHandlers): () => void {
  if (isNative()) {
    let stopped = false;
    let finished = false;
    let partialHandle: { remove: () => Promise<void> } | undefined;
    let stateHandle: { remove: () => Promise<void> } | undefined;
    const finish = () => {
      if (finished) return;
      finished = true;
      void partialHandle?.remove();
      void stateHandle?.remove();
      if (!stopped) h.onEnd();
    };
    void (async () => {
      try {
        partialHandle = await SpeechRecognition.addListener('partialResults', event => {
          const text = event.matches?.[0]?.trim();
          if (text) h.onText(text);
        });
        stateHandle = await SpeechRecognition.addListener('listeningState', event => {
          if (event.status === 'stopped') finish();
        });
        await SpeechRecognition.start({ language: h.lang ?? 'ar-SA', maxResults: 1, partialResults: true, popup: false });
      } catch {
        if (!stopped) {
          h.onError('تعذّر تشغيل التعرّف الصوتي. تحقق من إذن الميكروفون وخدمة Google للصوت على Android.');
          finish();
        }
      }
    })();
    return () => {
      stopped = true;
      void SpeechRecognition.stop().catch(() => undefined);
      void partialHandle?.remove();
      void stateHandle?.remove();
    };
  }

  const Ctor = recognitionCtor();
  if (!Ctor) { h.onError('متصفحك لا يدعم الإملاء الصوتي.'); h.onEnd(); return () => {}; }
  const r = new Ctor();
  r.lang = h.lang ?? 'ar-SA';
  r.interimResults = true;
  r.continuous = false;
  r.onresult = e => { let transcript = ''; for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript; h.onText(transcript.trim()); };
  r.onerror = e => {
    const code = e.error;
    h.onError(code === 'not-allowed' || code === 'service-not-allowed' ? 'اسمح للمتصفح باستخدام الميكروفون من إعدادات الموقع.' : code === 'no-speech' ? 'لم أسمع شيئاً، حاول مرة أخرى.' : 'تعذّر التعرف على الصوت.');
  };
  r.onend = () => h.onEnd();
  try { r.start(); } catch { h.onError('تعذّر تشغيل الميكروفون.'); h.onEnd(); }
  return () => { try { r.stop(); } catch { /* no-op */ } };
}
