import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Bot, FileText, Loader2, Mic, Paperclip, Send, Square, Trash2, Volume2, X } from 'lucide-react';
import { useChat } from '../lib/chatStore';
import { PageTitle } from '../components/ui';
import Advisor from '../components/Advisor';
import { useApp } from '../store';
import { buildLearnerProfile, contextFrom } from '../lib/advisor';
import { canListen, canSpeak, listen, speak, stopSpeaking } from '../lib/voice';
import { toDateKey } from '../lib/utils';
import { ACCEPT, extractFileText } from '../lib/fileText';

const SUGGESTIONS = [
  'اشرح لي قانون نيوتن الثاني بمثال',
  'كيف أنظّم جدول مراجعة قبل الامتحان بشهر؟',
  'لخّص لي فكرة الاشتقاق ببساطة',
];

const FILE_SUGGESTIONS = [
  'لخّص لي هذا الملف في نقاط',
  'اصنع لي 5 أسئلة اختيار من متعدد من هذا الملف',
  'اشرح لي أهم الأفكار فيه ببساطة',
];

export default function Assistant() {
  const { messages, attachment, loading, error, send, setAttachment, clear, useProfile, setUseProfile } = useChat();
  const app = useApp();
  const profile = useMemo(() => buildLearnerProfile(contextFrom(app, toDateKey())), [app]);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const stopListenRef = useRef<(() => void) | null>(null);
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // نوقف القراءة والاستماع عند مغادرة الصفحة
  useEffect(
    () => () => {
      stopSpeaking();
      stopListenRef.current?.();
    },
    [],
  );

  const toggleMic = () => {
    if (listening) {
      stopListenRef.current?.();
      return;
    }
    setVoiceError(null);
    setListening(true);
    stopListenRef.current = listen({
      onText: (t) => setText(t),
      onEnd: () => setListening(false),
      onError: (m) => setVoiceError(m),
    });
  };

  const toggleSpeak = (i: number, content: string) => {
    if (speakingIdx === i) {
      stopSpeaking();
      setSpeakingIdx(null);
      return;
    }
    setVoiceError(null);
    setSpeakingIdx(i);
    speak(content, {
      onEnd: () => setSpeakingIdx(null),
      onError: (m) => {
        setVoiceError(m);
        setSpeakingIdx(null);
      },
    });
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileError(null);
    setReading(true);
    try {
      const r = await extractFileText(file);
      setAttachment({ name: r.name, text: r.text, truncated: r.truncated });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'تعذّرت قراءة الملف');
    } finally {
      setReading(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading, error]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || loading) return;
    setText('');
    void send(t);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <PageTitle
        title="المساعد الذكي"
        subtitle="خطة مراجعة تلقائية، وأسئلة عن دروسك"
        action={
          messages.length > 0 ? (
            <button type="button" className="btn btn-ghost !py-1.5" onClick={clear} aria-label="مسح المحادثة">
              <Trash2 size={15} /> مسح
            </button>
          ) : undefined
        }
      />

      <Advisor />

      <h2 className="mb-1 font-bold">اسأل عن دروسك</h2>
      <p className="mb-3 text-xs text-muted">
        هذا القسم يحتاج إنترنت، ويعمل فقط بعد أن يفعّله صاحب التطبيق بمفتاح الخدمة.
      </p>

      <details className="card mb-3 !p-3 text-sm">
        <summary className="cursor-pointer font-medium">ما يعرفه المعلّم عن مستواك</summary>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {profile || 'لا توجد بيانات كافية بعد. كلما حللت أسئلة وأضفت امتحاناتك، تحسّن تخصيص الشرح.'}
        </p>
        <label className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span>استخدامه لتخصيص الشرح (يُرسل نص مختصر دون اسمك)</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--accent))]"
            checked={useProfile}
            onChange={(e) => setUseProfile(e.target.checked)}
          />
        </label>
      </details>

      <div className="card mb-3 min-h-[40vh] space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3 py-4 text-center">
            <Bot className="mx-auto text-accent" size={36} />
            <p className="text-sm text-muted">
              {attachment ? 'تم إرفاق الملف. اسأل عنه أو اختر مما يلي:' : 'مرحباً! أنا مساعدك الدراسي. جرّب أحد هذه الأسئلة:'}
            </p>
            <div className="flex flex-col gap-2">
              {(attachment ? FILE_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button key={s} type="button" className="btn btn-ghost !justify-start text-start" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-l from-accent to-accent2 text-onaccent'
                  : 'border border-line bg-base/60'
              }`}
            >
              {m.content}
              {m.role === 'assistant' && canSpeak() && (
                <button
                  type="button"
                  className="mt-2 flex items-center gap-1 text-xs text-muted hover:text-main"
                  aria-label={speakingIdx === i ? 'إيقاف القراءة' : 'قراءة الرد بصوت عالٍ'}
                  onClick={() => toggleSpeak(i, m.content)}
                >
                  {speakingIdx === i ? <Square size={13} /> : <Volume2 size={14} />}
                  {speakingIdx === i ? 'إيقاف' : 'استمع'}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="rounded-2xl border border-line bg-base/60 px-4 py-2.5 text-sm text-muted" role="status">
              يكتب…
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-20 space-y-2 md:bottom-4">
        {voiceError && (
          <p role="alert" className="card !p-2.5 text-sm text-bad">
            {voiceError}
          </p>
        )}
        {(attachment || reading || fileError) && (
          <div className="card !p-2.5 text-sm">
            {reading && (
              <p className="flex items-center gap-2 text-muted" role="status">
                <Loader2 size={16} className="animate-spin" /> جارٍ قراءة الملف…
              </p>
            )}
            {fileError && (
              <p role="alert" className="text-bad">
                {fileError}
              </p>
            )}
            {attachment && !reading && (
              <div className="flex items-center gap-2">
                <FileText size={18} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{attachment.name}</p>
                  <p className="text-[11px] text-muted">
                    {attachment.truncated
                      ? 'الملف طويل: يقرأ المساعد الجزء الأول منه فقط.'
                      : 'يقرأ المساعد الملف كاملاً.'}{' '}
                    محتواه يُرسل إلى خدمة الذكاء الاصطناعي.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="إزالة الملف"
                  className="rounded-lg p-2 text-muted hover:text-bad"
                  onClick={() => setAttachment(null)}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => void pickFile(e)}
        />
        <button
          type="button"
          className="btn btn-ghost shrink-0 !px-3"
          aria-label="إرفاق ملف (PDF أو Word أو Excel)"
          title="إرفاق ملف (PDF أو Word أو Excel)"
          disabled={reading || loading}
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={18} />
        </button>
        {canListen() && (
          <button
            type="button"
            className={`btn shrink-0 !px-3 ${listening ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={listening}
            aria-label={listening ? 'إيقاف الإملاء الصوتي' : 'إملاء السؤال بصوتك'}
            title={listening ? 'إيقاف الإملاء' : 'إملاء السؤال بصوتك'}
            disabled={loading}
            onClick={toggleMic}
          >
            {listening ? <Square size={18} /> : <Mic size={18} />}
          </button>
        )}
        <input
          className="input"
          placeholder="اكتب سؤالك…"
          aria-label="رسالتك"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={!text.trim() || loading} aria-label="إرسال">
          <Send size={18} className="rotate-180" />
        </button>
      </form>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        يقبل PDF وWord (docx) وExcel (xlsx). الملفات الممسوحة ضوئياً كصور لا تُقرأ. قد يخطئ المساعد، فتحقق من المهم في كتابك.
      </p>
    </div>
  );
}
