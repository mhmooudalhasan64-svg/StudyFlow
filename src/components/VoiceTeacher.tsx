import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, AudioLines, Mic, Volume2 } from 'lucide-react';
import { useChat } from '../lib/chatStore';
import { useApp } from '../store';
import { canListen, canSpeak, listen, speak, stopSpeaking } from '../lib/voice';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function VoiceTeacher() {
  const settings = useApp((s) => s.settings);
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
    startListeningRef.current();
  };

  useEffect(() => () => {
    activeRef.current = false;
    stopListenRef.current?.();
    stopSpeaking();
    if (previousStyleRef.current !== null) useChat.getState().setStyle(previousStyleRef.current);
  }, []);

  const status = phase === 'listening' ? 'يستمع إليك الآن' : phase === 'thinking' ? 'يحضّر إجابة لك' : phase === 'speaking' ? 'يتحدث معك الآن' : 'محادثة صوتية مباشرة مع SKOVA';

  return (
    <section className="mb-4" aria-label="اتصال بالمدرّس الذكي">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">المدرّس الذكي</h2>
          <p className="text-[11px] text-muted">اتصال صوتي تفاعلي</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={active}
          aria-label={active ? 'إنهاء الاتصال بالمدرّس' : 'اتصال بالمدرّس الذكي'}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition active:scale-95 ${active ? 'bg-red-600 shadow-red-600/20' : 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'}`}
        >
          {active ? <PhoneOff size={17} /> : <Phone size={17} />}
          {active ? 'إنهاء المكالمة' : 'اتصال'}
        </button>
      </div>

      <div className={`mt-2 flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${active ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-line bg-card/60'}`}>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-accent/10 text-accent'}`}>
          {active ? <AudioLines size={21} className={phase === 'listening' || phase === 'speaking' ? 'animate-pulse' : ''} /> : <Phone size={19} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{active ? 'SKOVA AI' : 'جاهز للاتصال'}</p>
          <p className={`text-xs ${active ? 'text-emerald-600' : 'text-muted'}`} role="status">{status}</p>
        </div>
        {active && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" aria-label="المكالمة نشطة" />}
      </div>
      {error && <p role="alert" className="mt-2 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">{error}</p>}
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted"><Mic size={12} /> يحتاج إذن الميكروفون وصوتاً عربياً متاحاً في جهازك واتصالاً بالإنترنت.</p>
    </section>
  );
}
