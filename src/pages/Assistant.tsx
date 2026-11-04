import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Bot, FileText, Loader2, Paperclip, Send, Trash2, X } from 'lucide-react';
import { useChat } from '../lib/chatStore';
import { PageTitle } from '../components/ui';
import Advisor from '../components/Advisor';
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
  const { messages, attachment, loading, error, send, setAttachment, clear } = useChat();
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
