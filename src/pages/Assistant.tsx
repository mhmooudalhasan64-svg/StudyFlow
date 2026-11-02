import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, Trash2 } from 'lucide-react';
import { useChat } from '../lib/chatStore';
import { PageTitle } from '../components/ui';
import Advisor from '../components/Advisor';

const SUGGESTIONS = [
  'اشرح لي قانون نيوتن الثاني بمثال',
  'كيف أنظّم جدول مراجعة قبل الامتحان بشهر؟',
  'لخّص لي فكرة الاشتقاق ببساطة',
];

export default function Assistant() {
  const { messages, loading, error, send, clear } = useChat();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

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
            <p className="text-sm text-muted">مرحباً! أنا مساعدك الدراسي. جرّب أحد هذه الأسئلة:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
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

      <form onSubmit={submit} className="sticky bottom-20 flex gap-2 md:bottom-4">
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
      <p className="mt-2 text-center text-[11px] text-muted">
        قد يخطئ المساعد، تحقق من المعلومات المهمة في كتابك المدرسي.
      </p>
    </div>
  );
}
