import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, AudioLines, Mic, Volume2, X, Radio, Clock3, Sparkles } from 'lucide-react';
import { useChat } from '../lib/chatStore';
import { useApp } from '../store';
import { canListen, canSpeak, listen, prepareVoice, speak, stopSpeaking } from '../lib/voice';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

const PHASE_COPY: Record<Phase, { title: string; hint: string }> = {
  idle: { title: 'جاهز للاتصال', hint: 'ابدأ المحادثة الصوتية مع دليل' },
  listening: { title: 'أستمع إليك', hint: 'تحدث الآن… أنا أتابع كلامك' },
  thinking: { title: 'أرتّب إجابتي', hint: 'لحظة واحدة، أفكر في أفضل رد' },
  speaking: { title: 'دليل يتحدث', hint: 'يمكنك الاستماع، وسأعود إليك بعد انتهاء الرد' },
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return minutes + ':' + remainder;
}

export default function VoiceTeacher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useApp((s) => s.settings);
  const { messages } = useChat();
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const activeRef = useRef(false);
  const transcriptRef = useRef('');
  const callStartedAtRef = useRef<number | null>(null);
  const stopListenRef = useRef<(() => void) | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const previousStyleRef = useRef<ReturnType<typeof useChat.getState>['style'] | null>(null);

  const stopTeacher = () => {
    activeRef.current = false;
    callStartedAtRef.current = null;
    setActive(false);
    setPhase('idle');
    setLiveTranscript('');
    stopListenRef.current?.();
    stopListenRef.current = null;
    stopSpeaking();
    if (previousStyleRef.current !== null) {
      useChat.getState().setStyle(previousStyleRef.current);
      previousStyleRef.current = null;
    }
  };

  const handleTranscript = async (heard: string) => {
    setLastHeard(heard);
    setLiveTranscript('');
    setPhase('thinking');
    const chat = useChat.getState();
    const before = chat.messages.length;
    await chat.send(heard);
    const after = useChat.getState();
    const last = after.messages[after.messages.length - 1];
    if (!activeRef.current) return;
    if (after.messages.length <= before || last?.role !== 'assistant') {
      setError(after.error ?? 'لم يصل رد من دليل. تحقق من اتصال الإنترنت وتفعيل خدمة الذكاء الاصطناعي.');
      stopTeacher();
      return;
    }
    setPhase('speaking');
    speak(last.content, {
      onEnd: () => { if (activeRef.current) startListeningRef.current(); else setPhase('idle'); },
      onError: (message) => { setError(message); stopTeacher(); },
    }, { gender: settings.voiceGender ?? 'any', style: settings.voiceStyle ?? 'soft' });
  };

  const startListening = () => {
    if (!activeRef.current) return;
    transcriptRef.current = '';
    setLiveTranscript('');
    setError(null);
    setPhase('listening');
    stopListenRef.current = listen({
      onText: text => {
        transcriptRef.current = text;
        setLiveTranscript(text);
      },
      onEnd: () => {
        stopListenRef.current = null;
        if (!activeRef.current) return;
        const heard = transcriptRef.current.trim();
        if (!heard) {
          setError('لم ألتقط كلامك. اضغط بدء الاستماع للمحاولة من جديد.');
          setPhase('idle');
          return;
        }
        void handleTranscript(heard);
      },
      onError: message => setError(message),
    });
  };
  startListeningRef.current = startListening;

  const closeCall = () => { stopTeacher(); onClose(); };

  const toggle = async () => {
    if (activeRef.current) { stopTeacher(); return; }
    if (!canListen() || !canSpeak()) {
      setError('الصوت غير مدعوم في هذه البيئة. حدّث التطبيق أو افتح المنصة بمتصفح Chrome حديث.');
      return;
    }
    try {
      setError(null);
      setLastHeard('');
      setElapsed(0);
      await prepareVoice();
      previousStyleRef.current = useChat.getState().style;
      useChat.getState().setStyle('voice_teacher');
      activeRef.current = true;
      callStartedAtRef.current = Date.now();
      setActive(true);
      setPhase('speaking');
      speak('أنا دليل، مساعدك الذكي. تفضل، أنا أستمع إليك.', {
        onEnd: () => { if (activeRef.current) startListeningRef.current(); },
        onError: message => { setError(message); stopTeacher(); },
      }, { gender: settings.voiceGender ?? 'any', style: settings.voiceStyle ?? 'soft' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر تهيئة الميكروفون والصوت. تحقق من أذونات التطبيق.');
    }
  };

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (callStartedAtRef.current !== null) {
        setElapsed(Math.floor((Date.now() - callStartedAtRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => () => {
    activeRef.current = false;
    callStartedAtRef.current = null;
    stopListenRef.current?.();
    stopSpeaking();
    if (previousStyleRef.current !== null) useChat.getState().setStyle(previousStyleRef.current);
  }, []);

  if (!open) return null;
  const latestMessages = messages.slice(-3);
  const phaseCopy = PHASE_COPY[phase];
  const bars = Array.from({ length: 30 }, (_, index) => index);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#061426] px-4 py-5 text-white" role="dialog" aria-modal="true" aria-label="مكالمة صوتية مباشرة مع دليل">
      <style>{`
        @keyframes dalil-live-wave { 0%,100% { transform: scaleY(.24); opacity:.42 } 50% { transform: scaleY(1); opacity:1 } }
        @keyframes dalil-live-orbit { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes dalil-live-breathe { 0%,100% { transform: scale(.96); opacity:.56 } 50% { transform: scale(1.045); opacity:1 } }
        @media (prefers-reduced-motion: reduce) { .dalil-live-motion { animation:none !important } }
      `}</style>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-[-8rem] h-80 w-80 rounded-full bg-sky-500/15 blur-[100px]" />
        <div className="absolute -right-24 bottom-[-7rem] h-96 w-96 rounded-full bg-blue-700/20 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(148,205,255,.28) 1px, transparent 1px), linear-gradient(90deg, rgba(148,205,255,.28) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
      </div>

      <section className="relative flex h-full max-h-[900px] w-full max-w-lg flex-col">
        <header className="flex items-center justify-between">
          <button type="button" onClick={closeCall} aria-label="إغلاق شاشة المكالمة" className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/75 transition hover:bg-white/10">
            <X size={19} />
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,.9)]" />
              <p className="text-sm font-extrabold tracking-[.22em]">DALIL AI</p>
            </div>
            <p className="mt-1 text-[10px] text-sky-100/45">مساعدك الصوتي في مسار</p>
          </div>
          <div className="flex h-11 min-w-[76px] items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs tabular-nums text-white/75" dir="ltr">
            <Clock3 size={13} className="text-sky-300" />
            {formatDuration(elapsed)}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center py-5">
          <div className="relative mb-7 grid h-56 w-56 shrink-0 place-items-center">
            {active && (
              <>
                <span className="dalil-live-motion absolute inset-0 rounded-full border border-sky-300/20" style={{ animation: 'dalil-live-breathe 3s ease-in-out infinite' }} />
                <span className="absolute inset-3 rounded-full border border-sky-200/15" />
                <span className="dalil-live-motion absolute inset-0 rounded-full border border-dashed border-sky-200/20" style={{ animation: 'dalil-live-orbit 24s linear infinite' }} />
                <span className={`absolute inset-5 rounded-full blur-2xl transition-all duration-700 ${phase === 'listening' ? 'bg-cyan-400/25' : phase === 'speaking' ? 'bg-blue-400/25' : 'bg-sky-300/15'}`} />
              </>
            )}
            <div className={`relative grid h-36 w-36 place-items-center rounded-full border border-sky-100/20 bg-gradient-to-br from-[#1d5686] via-[#123b66] to-[#0b2342] shadow-[0_20px_70px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.2)] transition-transform duration-700 ${active && (phase === 'listening' || phase === 'speaking') ? 'scale-[1.04]' : 'scale-100'}`}>
              <div className="absolute inset-2 rounded-full border border-white/10" />
              <AudioLines size={54} strokeWidth={1.35} className={phase === 'speaking' ? 'text-sky-100' : 'text-sky-200/90'} />
              <span className="absolute bottom-[-5px] right-2 grid h-8 w-8 place-items-center rounded-full border-2 border-[#0a1d34] bg-sky-400 text-[#061426]">
                <Sparkles size={14} />
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">دليل</h1>
          <p className="mt-2 text-sm text-sky-100/55">مساعدك الذكي، صوتاً وصورةً للحالة</p>

          <div className="mt-5 flex items-center gap-2 rounded-full border border-sky-200/15 bg-sky-200/[0.07] px-4 py-2.5" role="status" aria-live="polite">
            {active ? <Radio size={15} className="text-sky-300" /> : <span className="h-2 w-2 rounded-full bg-white/30" />}
            <span className="text-sm font-semibold text-sky-50">{active ? phaseCopy.title : 'جاهز لبدء المكالمة'}</span>
          </div>
          <p className="mt-2 min-h-5 text-center text-xs text-sky-100/45">{active ? phaseCopy.hint : 'اضغط زر الاتصال لبدء الحديث'}</p>

          <div className="mt-7 flex h-12 items-center justify-center gap-[3px]" aria-label={phase === 'listening' ? 'مؤشر الاستماع' : phase === 'speaking' ? 'مؤشر التحدث' : 'مؤشر الصوت'}>
            {bars.map((bar) => {
              const height = 8 + ((bar * 13) % 25);
              const isMoving = active && (phase === 'listening' || phase === 'speaking');
              return <span key={bar} className="w-[3px] rounded-full bg-gradient-to-t from-blue-500 to-cyan-200" style={{ height, opacity: isMoving ? 0.9 : 0.25, transformOrigin: 'center', animation: isMoving ? `dalil-live-wave ${phase === 'speaking' ? 0.48 + (bar % 5) * 0.09 : 0.8 + (bar % 6) * 0.12}s ease-in-out ${(bar % 9) * -0.11}s infinite` : 'none' }} />;
            })}
          </div>
          <p className="mt-1 text-[10px] text-sky-100/35">{phase === 'listening' ? 'استقبال صوتك' : phase === 'speaking' ? 'إخراج صوت دليل' : phase === 'thinking' ? 'معالجة الرد' : 'الصوت التفاعلي'}</p>

          <div className="mt-6 w-full space-y-3">
            {phase === 'listening' && (
              <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.07] p-4 text-right">
                <p className="mb-2 text-[10px] font-bold text-cyan-200/75">ما أسمعه الآن</p>
                <p className="min-h-6 text-sm leading-7 text-white/90">{liveTranscript || 'بانتظار كلامك…'}</p>
              </div>
            )}
            {lastHeard && phase !== 'listening' && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-right">
                <p className="mb-1 text-[10px] text-white/40">آخر ما قلته</p>
                <p className="line-clamp-2 text-xs leading-6 text-white/75">{lastHeard}</p>
              </div>
            )}
            {latestMessages.length > 0 && (
              <div className="max-h-28 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/10 p-3">
                {latestMessages.map((message, index) => (
                  <p key={index} className={`text-right text-xs leading-6 ${message.role === 'user' ? 'text-sky-100/60' : 'text-white/85'}`}>
                    <span className="ml-2 text-[10px] font-bold text-sky-300/70">{message.role === 'user' ? 'أنت' : 'دليل'}</span>
                    {message.content}
                  </p>
                ))}
              </div>
            )}
          </div>
        </main>

        <footer className="w-full pb-2 pt-3">
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2.5 text-center text-xs leading-6 text-red-100">{error}</p>}
          {active && phase === 'idle' && <button type="button" onClick={() => startListeningRef.current()} className="mb-4 w-full rounded-xl border border-sky-200/20 bg-sky-300/10 px-4 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-300/15">إعادة الاستماع</button>}
          <div className="flex items-center justify-center gap-8">
            <div className="flex min-w-[64px] flex-col items-center gap-2 text-sky-100/65">
              <span className={`grid h-12 w-12 place-items-center rounded-full border ${phase === 'listening' ? 'border-cyan-200/35 bg-cyan-300/15 text-cyan-100' : 'border-white/10 bg-white/[0.06]'}`}>
                <Mic size={19} />
              </span>
              <span className="text-[10px]">الميكروفون</span>
            </div>
            <button type="button" onClick={active ? stopTeacher : () => void toggle()} className={`grid h-[76px] w-[76px] place-items-center rounded-full border-4 border-white/10 text-white shadow-[0_12px_36px_rgba(0,0,0,.32)] transition active:scale-95 ${active ? 'bg-rose-500 shadow-rose-500/25 hover:bg-rose-600' : 'bg-sky-500 shadow-sky-500/30 hover:bg-sky-400'}`} aria-label={active ? 'إنهاء المكالمة' : 'بدء المكالمة'}>
              {active ? <PhoneOff size={28} /> : <Phone size={28} />}
            </button>
            <div className="flex min-w-[64px] flex-col items-center gap-2 text-sky-100/65">
              <span className={`grid h-12 w-12 place-items-center rounded-full border ${phase === 'speaking' ? 'border-blue-200/35 bg-blue-300/15 text-blue-100' : 'border-white/10 bg-white/[0.06]'}`}>
                <Volume2 size={19} />
              </span>
              <span className="text-[10px]">الصوت</span>
            </div>
          </div>
          <p className="mt-5 text-center text-[10px] leading-5 text-sky-100/35">تحتاج المكالمة إلى إذن الميكروفون واتصال بالإنترنت. تتم معالجة الصوت عبر خدمات الجهاز والمتصفح المتاحة.</p>
        </footer>
      </section>
    </div>
  );
}
