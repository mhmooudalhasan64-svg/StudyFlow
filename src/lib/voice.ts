/** القراءة والاستماع عبر Web Speech API وأصوات الجهاز المتاحة. */
interface RecEvent { results: ArrayLike<ArrayLike<{ transcript: string }>>; error?: string }
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void;
  onresult: ((e: RecEvent) => void) | null; onerror: ((e: RecEvent) => void) | null; onend: (() => void) | null;
}
export type VoiceGender = 'any' | 'female' | 'male';
export type VoiceStyle = 'soft' | 'strong' | 'energetic';
export interface VoiceOptions { gender?: VoiceGender; style?: VoiceStyle }
function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export const canListen = (): boolean => recognitionCtor() !== null;
export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
export function availableArabicVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('ar'));
}
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[*#_`>~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}
function chooseVoice(gender: VoiceGender = 'any'): SpeechSynthesisVoice | undefined {
  const voices = availableArabicVoices();
  if (!voices.length) return undefined;
  if (gender === 'any') return voices[0];
  const hints = gender === 'female' ? /female|woman|zira|laila|hoda|ar.?female|أنثى|ليلى|هند/i : /male|man|david|hamdan|ar.?male|ذكر|عمر/i;
  return voices.find(v => hints.test(v.name)) ?? voices[0];
}
export function speak(text: string, cb: { onEnd?: () => void; onError?: (msg: string) => void } = {}, options: VoiceOptions = {}): void {
  if (!canSpeak()) { cb.onError?.('القراءة الصوتية غير مدعومة في هذا المتصفح.'); return; }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang = 'ar-SA';
  const voice = chooseVoice(options.gender);
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  const style = options.style ?? 'soft';
  u.rate = style === 'energetic' ? 1.12 : style === 'strong' ? 0.94 : 0.88;
  u.pitch = style === 'energetic' ? 1.12 : style === 'strong' ? 0.86 : 1;
  u.volume = style === 'soft' ? 0.72 : 1;
  u.onend = () => cb.onEnd?.();
  u.onerror = () => cb.onError?.('تعذّرت القراءة الصوتية. تحقق من توفر صوت عربي على جهازك.');
  synth.speak(u);
}
export function stopSpeaking(): void { if (canSpeak()) window.speechSynthesis.cancel(); }
export interface ListenHandlers { onText: (text: string) => void; onEnd: () => void; onError: (message: string) => void; lang?: string }
export function listen(h: ListenHandlers): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) { h.onError('متصفحك لا يدعم الإملاء الصوتي.'); h.onEnd(); return () => {}; }
  const r = new Ctor(); r.lang = h.lang ?? 'ar-SA'; r.interimResults = true; r.continuous = false;
  r.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; h.onText(t.trim()); };
  r.onerror = e => { const code = e.error; h.onError(code === 'not-allowed' || code === 'service-not-allowed' ? 'اسمح للمتصفح باستخدام الميكروفون من إعدادات الموقع.' : code === 'no-speech' ? 'لم أسمع شيئاً، حاول مرة أخرى.' : 'تعذّر التعرف على الصوت.'); };
  r.onend = () => h.onEnd();
  try { r.start(); } catch { h.onError('تعذّر تشغيل الميكروفون.'); h.onEnd(); }
  return () => { try { r.stop(); } catch { /* لا شيء */ } };
}
