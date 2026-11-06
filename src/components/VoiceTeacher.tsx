import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, Square, Volume2 } from 'lucide-react';
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
          setError('لم ألتقط كلامك. اضغط بدء الدرس الصوتي للمحاولة من جديد.');
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

  const status = phase === 'listening' ? 'أستمع إليك…' : phase === 'thinking' ? 'أحضّر الشرح…' : phase === 'speaking' ? 'المعلّم يتحدث…' : 'جاهز لبدء درس تفاعلي';

  return (
    <section className="card mb-4 overflow-hidden border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-base">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Headphones size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">المدرّس الصوتي</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">تحدّث مع SKOVA AI؛ يستمع لسؤالك، يشرح بصوت مسموع، ثم يعود للاستماع لإجابتك.</p>
          <p className="mt-2 text-xs font-medium text-accent" role="status">{status}</p>
        </div>
        <button type="button" onClick={toggle} className={`btn shrink-0 !px-3 !py-2 ${active ? 'btn-ghost' : 'btn-primary'}`} aria-pressed={active}>
          {active ? <><Square size={15} /> إيقاف</> : <><Mic size={15} /> ابدأ</>}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">{error}</p>}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><Volume2 size={13} /> يستخدم صوت العربية المتاح في جهازك، ويتطلب اتصالاً بالإنترنت وخدمة SKOVA AI مفعّلة.</p>
    </section>
  );
}
