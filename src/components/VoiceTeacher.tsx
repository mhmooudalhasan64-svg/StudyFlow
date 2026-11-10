import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, AudioLines, Mic, Volume2 } from 'lucide-react';
import { useChat } from '../lib/chatStore';
import { useApp } from '../store';
import { canListen, canSpeak, listen, speak, stopSpeaking } from '../lib/voice';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function VoiceTeacher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useApp((s) => s.settings);
  const { messages } = useChat();
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(false);
  const transcriptRef = useRef('');
  const stopListenRef = useRef<(() => void) | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const previousStyleRef = useRef<ReturnType<typeof useChat.getState>['style'] | null>(null);

  const stopTeacher = () => {
    activeRef.current = false;
    setActive(false);
    setPhase('idle');
    stopListenRef.current?.();
    stopListenRef.current = null;
    stopSpeaking();
    if (previousStyleRef.current !== null) {
      useChat.getState().setStyle(previousStyleRef.current);
      previousStyleRef.current = null;
    }
  };

  const handleTranscript = async (heard: string) => {
    setPhase('thinking');
    const chat = useChat.getState();
    const before = chat.messages.length;
    await chat.send(heard);
    const after = useChat.getState();
    const last = after.messages[after.messages.length - 1];
    if (!activeRef.current) return;
    if (after.messages.length <= before || last?.role !== 'assistant') {
      setError(after.error ?? 'لم يصل رد من المعلّم. تحقق من اتصال الإنترنت وتفعيل خدمة الذكاء الاصطناعي.');
      stopTeacher();
      return;
    }
    setPhase('speaking');
    speak(last.content, {
      onEnd: () => {
        if (activeRef.current) startListeningRef.current();
        else setPhase('idle');
      },
      onError: (message) => {
        setError(message);
        stopTeacher();
      },
    }, { gender: settings.voiceGender ?? 'any', style: settings.voiceStyle ?? 'soft' });
  };

  const startListening = () => {
    if (!activeRef.current) return;
    transcriptRef.current = '';
    setError(null);
    setPhase('listening');
    stopListenRef.current = listen({
      onText: (text) => { transcriptRef.current = text; },
      onEnd: () => {
        stopListenRef.current = null;
        if (!activeRef.current) return;
        const heard = transcriptRef.current.trim();
        if (!heard) {
          setError('لم ألتقط كلامك. اضغط اتصال بالمدرّس للمحاولة من جديد.');
          stopTeacher();
          return;
        }
        void handleTranscript(heard);
      },
      onError: (message) => setError(message),
    });
  };
  startListeningRef.current = startListening;

  const closeCall = () => {
    stopTeacher();
    onClose();
  };

  const toggle = () => {
    if (activeRef.current) {
      stopTeacher();
      return;
    }
    if (!canListen() || !canSpeak()) {
      setError('المدرّس الصوتي يحتاج متصفحاً يدعم الميكروفون والقراءة الصوتية.');
      return;
    }
    previousStyleRef.current = useChat.getState().style;
    useChat.getState().setStyle('voice_teacher');
    activeRef.current = true;
    setActive(true);
    setError(null);
    setPhase('speaking');
    speak('أنا المعلّم الذكي في فايورا', {
      onEnd: () => {
        if (activeRef.current) startListeningRef.current();
      },
      onError: (message) => {
        setError(message);
        stopTeacher();
      },
    }, { gender: settings.voiceGender ?? 'any', style: settings.voiceStyle ?? 'soft' });
  };

  useEffect(() => () => {
    activeRef.current = false;
    stopListenRef.current?.();
    stopSpeaking();
    if (previousStyleRef.current !== null) useChat.getState().setStyle(previousStyleRef.current);
  }, []);

  const status = phase === 'listening' ? 'يستمع إليك الآن' : phase === 'thinking' ? 'يحضّر إجابة لك' : phase === 'speaking' ? 'يتحدث معك الآن' : 'محادثة صوتية مباشرة مع المعلّم الذكي';

  if (!open) return null;

  const latestMessages = messages.slice(-4);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#070910]/95 px-4 py-6 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="مكالمة صوتية مع المعلّم الذكي">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-700 ${active ? 'bg-emerald-500/15 opacity-100' : 'bg-violet-500/15 opacity-70'}`} />
      </div>
      <section className="relative flex max-h-full w-full max-w-md flex-col items-center">
        <header className="flex w-full items-center justify-between">
          <button type="button" onClick={closeCall} aria-label="إغلاق شاشة المكالمة" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10">×</button>
          <div className="text-center">
            <p className="text-sm font-bold tracking-wide">المعلّم الذكي</p>
            <p className="mt-0.5 text-[11px] text-white/45">أنا المعلم الذكي SKOVA</p>
          </div>
          <span className="h-10 w-10" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <div className="relative mb-8 grid h-44 w-44 place-items-center">
            {active && <span className={`absolute inset-0 rounded-full border border-emerald-400/30 ${phase === 'listening' ? 'animate-ping' : 'animate-pulse'}`} />}
            <span className={`absolute inset-3 rounded-full border border-white/10 ${active ? 'bg-emerald-400/10 shadow-[0_0_70px_rgba(16,185,129,0.16)]' : 'bg-violet-400/10 shadow-[0_0_70px_rgba(139,92,246,0.16)]'}`} />
            <span className={`relative grid h-28 w-28 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-[#342052] to-[#142f43] shadow-2xl ${active && (phase === 'listening' || phase === 'speaking') ? 'scale-105' : ''} transition-transform duration-500`}>
              <AudioLines size={44} className={active ? 'text-emerald-300' : 'text-violet-200'} />
            </span>
          </div>

          <h2 className="text-2xl font-bold">SKOVA AI</h2>
          <p className={`mt-3 rounded-full border px-4 py-2 text-sm ${active ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-white/60'}`} role="status">
            {active ? status : 'جاهز لبدء المكالمة'}
          </p>

          {latestMessages.length > 0 && (
            <div className="mt-7 max-h-36 w-full space-y-2 overflow-y-auto px-1">
              {latestMessages.map((message, index) => (
                <p key={index} className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${message.role === 'user' ? 'bg-white/10 text-white/80' : 'bg-emerald-400/10 text-emerald-100'}`}>
                  <span className="mb-1 block text-[10px] opacity-55">{message.role === 'user' ? 'أنت' : 'المعلّم'}</span>
                  {message.content}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="w-full pb-5">
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-center text-xs text-red-200">{error}</p>}
          <div className="flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/70"><Mic size={19} /></span>
              <span className="text-[10px] text-white/45">الميكروفون</span>
            </div>
            <button type="button" onClick={active ? stopTeacher : toggle} className={`grid h-[76px] w-[76px] place-items-center rounded-full text-white shadow-xl transition active:scale-95 ${active ? 'bg-red-500 shadow-red-500/25 hover:bg-red-600' : 'bg-emerald-500 shadow-emerald-500/25 hover:bg-emerald-600'}`} aria-label={active ? 'إنهاء المكالمة' : 'بدء المكالمة'}>
              {active ? <PhoneOff size={29} /> : <Phone size={29} />}
            </button>
            <div className="flex flex-col items-center gap-2">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/70"><Volume2 size={19} /></span>
              <span className="text-[10px] text-white/45">الصوت</span>
            </div>
          </div>
          <p className="mt-5 text-center text-[10px] leading-5 text-white/35">تحتاج المكالمة إلى إذن الميكروفون، ودعم الصوت العربي في جهازك، واتصال بالإنترنت.</p>
        </div>
      </section>
    </div>
  );
}
