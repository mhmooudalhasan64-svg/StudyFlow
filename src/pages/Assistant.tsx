import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Bot, Copy, FileText, Loader2, Mic, Paperclip, RefreshCw, Send, Square, Trash2, Volume2, X } from 'lucide-react';
import { useChat, type ChatStyle } from '../lib/chatStore';
import { PageTitle } from '../components/ui';
import Advisor from '../components/Advisor';
import { useApp } from '../store';
import { buildLearnerProfile, contextFrom } from '../lib/advisor';
import { canListen, canSpeak, listen, speak, stopSpeaking } from '../lib/voice';
import { toDateKey } from '../lib/utils';
import { ACCEPT, extractFileText } from '../lib/fileText';

const SUGGESTIONS = [
  'اشرح لي فكرة الاشتقاق ببساطة مع مثال',
  'لخّص لي أسباب الحرب العالمية الأولى',
  'كيف أحلل نصاً أدبياً في مادة العربية؟',
  'كيف أنظّم جدول مراجعة قبل الامتحان بشهر؟',
];

const FILE_SUGGESTIONS = [
  'لخّص لي هذا الملف في نقاط',
  'اصنع لي 5 أسئلة اختيار من متعدد من هذا الملف',
  'اشرح لي أهم الأفكار فيه ببساطة',
];

export default function Assistant() {
  const { messages, attachment, loading, error, send, setAttachment, clear, useProfile, setUseProfile, subject, setSubject, style, setStyle, regenerate } = useChat();
  const [copied, setCopied] = useState<number | null>(null);
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
  const sourceRoute = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('from');
  const pageNames: Record<string, string> = {
    home: 'الرئيسية', today: 'يومي الدراسي', plan: 'الخطة', timer: 'مؤقت التركيز',
    bac: 'البكالوريا', more: 'كل الميزات', library: 'مكتبة الكتب', mindmap: 'الخرائط الذهنية',
    review: 'المراجعة الذكية', cards: 'البطاقات التعليمية', exams: 'الامتحانات',
    quiz: 'بنك الأسئلة', simulator: 'محاكي الامتحان', calc: 'حاسبة العلامات',
    stats: 'الإحصاءات', reports: 'التقارير', achievements: 'الإنجازات',
    settings: 'الإعدادات', curriculum: 'خطة إنهاء المنهاج',
  };
  const sourcePage = sourceRoute ? pageNames[sourceRoute] : undefined;
  const contextualSend = (message: string) => send(sourcePage
    ? `سياق الصفحة الحالية: أنا أستخدم صفحة «${sourcePage}» في تطبيق Study Flow. اجعل مساعدتك مرتبطة بهذه الصفحة وأزرارها ووظيفتها، ولا تفترض بيانات غير ظاهرة.

سؤالي: ${message}`
    : message);

  useEffect(() => {
    void useChat.getState().load();
  }, []);

  // نوقف القراءة والاستماع عند مغادرة الصفحة
  useEffect(
    () => () => {
      stopSpeaking();
      stopListenRef.current?.();
    },
    [],
  );

  const copy = async (i: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(i);
      window.setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
    } catch {
      /* النسخ غير متاح في هذا المتصفح */
    }
  };

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
    }, { gender: app.settings.voiceGender ?? 'any', style: app.settings.voiceStyle ?? 'soft' });
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
    void contextualSend(t);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <PageTitle
        title="AVORA AI"
        subtitle="خطة مراجعة تلقائية، وأسئلة عن دروسك"
        action={
          messages.length > 0 ? (
            <button type="button" className="btn btn-ghost !py-1.5" onClick={clear} aria-label="مسح المحادثة">
              <Trash2 size={15} /> مسح
            </button>
          ) : undefined
        }
      />

      {sourcePage && <div className="mb-3 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-muted">سياق المساعدة: فتحت AVORA AI من صفحة <strong className="text-main">{sourcePage}</strong>، لذلك ستكون الإجابات مرتبطة بها.</div>}

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

      <div className="mb-3 space-y-2">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="مادة السؤال">
          <button type="button" aria-pressed={subject === null} className={`chip shrink-0 ${subject === null ? '!border-accent !text-accent' : ''}`} onClick={() => setSubject(null)}>
            كل المواد
          </button>
          {app.subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={subject === s.name}
              className={`chip shrink-0 ${subject === s.name ? '!border-accent !text-accent' : ''}`}
              onClick={() => setSubject(subject === s.name ? null : s.name)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <select className="input" aria-label="أسلوب الرد" value={style} onChange={(e) => setStyle(e.target.value as ChatStyle)}>
          <option value="normal">أسلوب الرد: عادي</option>
          <option value="explain">اشرح ببساطة مع مثال</option>
          <option value="steps">حل خطوة بخطوة</option>
          <option value="summary">لخّص في نقاط</option>
          <option value="coach">درّبني بأسئلة موجِّهة</option>
          <option value="diagnose">شخّص نقطة ضعفي أولاً</option>
          <option value="exam_coach">مدرّب الامتحان</option>
          <option value="mastery">مسار الإتقان التفاعلي</option>
          <option value="voice_teacher">المدرّس الصوتي</option>
        </select>
        {style === 'mastery' && <p className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs leading-6 text-muted">سيعمل AVORA معك بهدف واحد في كل مرة: تشخيص سريع، شرح متدرّج، تدريب، ثم تحقق من الإتقان قبل الانتقال.</p>}
      </div>

      <div className="card mb-3 min-h-[40vh] space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3 py-4 text-center">
            <Bot className="mx-auto text-accent" size={36} />
            <p className="text-sm text-muted">
              {attachment ? 'تم إرفاق الملف. اسأل عنه أو اختر مما يلي:' : 'مرحباً! أنا AVORA AI، مساعدك الدراسي. جرّب أحد هذه الأسئلة:'}
            </p>
            <div className="flex flex-col gap-2">
              {(attachment ? FILE_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button key={s} type="button" className="btn btn-ghost !justify-start text-start" onClick={() => void contextualSend(s)}>
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
              {m.role === 'assistant' && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-line/50 pt-2 text-xs text-muted">
                  <button type="button" className="flex items-center gap-1 hover:text-main" onClick={() => void copy(i, m.content)}>
                    <Copy size={13} /> {copied === i ? 'تم النسخ' : 'نسخ'}
                  </button>
                  {i === messages.length - 1 && !loading && (
                    <button type="button" className="flex items-center gap-1 hover:text-main" onClick={regenerate}>
                      <RefreshCw size={13} /> أعد الإجابة
                    </button>
                  )}
                </div>
              )}
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
