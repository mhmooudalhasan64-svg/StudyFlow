/** Arabic speech I/O: paced sentence playback on Android and browser Web Speech. */
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
let playbackId = 0;
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
  return text
    // Strip emoji graphemes (flags, skin tones, keycaps and joined sequences) from spoken output.
    .replace(/(?:[#*0-9]\uFE0F?\u20E3)|[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0E\uFE0F\u200D\u{E0020}-\u{E007F}]/gu, ' ')
    .replace(/\bskova\b/gi, 'سكوفا')
    .replace(/\bVAYORA\b/gi, 'فايورا')
    .replace(/[*#_`>~|]/g, ' ')
    .replace(/https?:\/\/\S+/gi, 'رابط')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}
function chooseVoice(gender: VoiceGender = 'any'): SpeechSynthesisVoice | undefined {
  const voices = availableArabicVoices();
  if (!voices.length) return undefined;
  const genderHint = gender === 'female' ? /female|woman|zira|laila|hoda|ar.?female|أنثى|ليلى|هند/i
    : gender === 'male' ? /male|man|david|hamdan|ar.?male|ذكر|عمر/i : null;
  const candidates = genderHint ? voices.filter(v => genderHint.test(v.name)) : voices;
  const pool = candidates.length ? candidates : voices;
  // Prefer installed neural/premium voices where the platform exposes that metadata.
  return [...pool].sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) =>
      (/natural|neural|premium|enhanced|google|microsoft/i.test(v.name) ? 4 : 0) +
      (!v.localService ? 1 : 0) +
      (/ar-SA|ar-AE|ar-EG/i.test(v.lang) ? 1 : 0);
    return score(b) - score(a);
  })[0];
}
function sentenceChunks(text: string): string[] {
  const normalized = text.replace(/([.!?؟؛])\s*/g, '$1|').split('|').map(s => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of normalized) {
    if (sentence.length <= 220) { chunks.push(sentence); continue; }
    const words = sentence.split(/\s+/);
    let part = '';
    for (const word of words) {
      if (part && (part + ' ' + word).length > 190) { chunks.push(part); part = word; }
      else part = part ? part + ' ' + word : word;
    }
    if (part) chunks.push(part);
  }
  return chunks;
}
const pauseAfter = (chunk: string) => /[؟?]$/.test(chunk) ? 360 : /[.!؛]$/.test(chunk) ? 290 : 170;

export function speak(text: string, cb: { onEnd?: () => void; onError?: (msg: string) => void } = {}, options: VoiceOptions = {}): void {
  const cleanText = cleanForSpeech(text);
  if (!cleanText) { cb.onEnd?.(); return; }
  const chunks = sentenceChunks(cleanText);
  const style = options.style ?? 'soft';
  const id = ++playbackId;
  const rate = style === 'energetic' ? 1.02 : style === 'strong' ? 0.96 : 0.92;
  const pitch = style === 'energetic' ? 1.04 : style === 'strong' ? 0.98 : 1.02;

  const speakWithDeviceVoice = () => {
    if (id !== playbackId) return;
    if (isNative()) {
      void (async () => {
        try {
          for (let i = 0; i < chunks.length; i++) {
            if (id !== playbackId) return;
            await TextToSpeech.speak({ text: chunks[i], lang: 'ar-SA', rate, pitch, volume: style === 'soft' ? 0.9 : 1 });
            if (id !== playbackId) return;
            if (i < chunks.length - 1) await new Promise(resolve => setTimeout(resolve, pauseAfter(chunks[i])));
          }
          if (id === playbackId) cb.onEnd?.();
        } catch {
          if (id === playbackId) cb.onError?.('تعذّرت القراءة الصوتية. تحقق من تثبيت محرّك تحويل النص إلى كلام وصوت عربي على جهازك.');
        }
      })();
      return;
    }
    if (!canSpeak()) { cb.onError?.('القراءة الصوتية غير مدعومة في هذا المتصفح.'); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const voice = chooseVoice(options.gender);
    let index = 0;
    const next = () => {
      if (id !== playbackId) return;
      if (index >= chunks.length) { cb.onEnd?.(); return; }
      const chunk = chunks[index++];
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = voice?.lang ?? 'ar-SA';
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = style === 'soft' ? 0.9 : 1;
      utterance.onend = () => {
        if (id !== playbackId) return;
        if (index < chunks.length) window.setTimeout(next, pauseAfter(chunk));
        else cb.onEnd?.();
      };
      utterance.onerror = () => { if (id === playbackId) cb.onError?.('تعذّرت القراءة الصوتية. تحقق من توفر صوت عربي على جهازك.'); };
      synth.speak(utterance);
    };
    next();
  };

  // Free on-device speech: no paid API, network request, or external TTS quota.
  speakWithDeviceVoice();
}
export function stopSpeaking(): void {
  playbackId++;
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
