import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Bot, Copy, FileText, History, Loader2, Menu, Mic, Paperclip, Pencil, Phone, Plus, RefreshCw, Search, Send, Square, Trash2, Volume2, X } from 'lucide-react';
import { useChat, type ChatStyle } from '../lib/chatStore';
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

export default function Assistant({ onCallOpen }: { onCallOpen: () => void }) {
  const { messages, attachment, loading, error, extraUsagePending, continueWithExtraUsage, cancelExtraUsage, send, setAttachment, useProfile, setUseProfile, subject, setSubject, style, setStyle, regenerate, conversations, activeConversationId, previousSummary, refreshConversations, newConversation, openConversation, deleteConversation, renameConversation } = useChat();
  const [copied, setCopied] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const filteredConversations = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(historySearch.trim().toLowerCase())), [conversations, historySearch]);
  const app = useApp();
  const profile = useMemo(() => buildLearnerProfile(contextFrom(app, toDateKey())), [app]);
  const [listening, setListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const handsFreeRef = useRef(false);
  const handsFreeDraftRef = useRef('');
  const lastHandsFreeSpokenRef = useRef(-1);
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
    void refreshConversations();
  }, []);

  // نوقف القراءة والاستماع عند مغادرة الصفحة
  useEffect(
    () => () => {
      stopSpeaking();
      handsFreeRef.current = false;
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

  const startHandsFreeListening = () => {
    if (!handsFreeRef.current) return;
    handsFreeDraftRef.current = '';
    setListening(true);
    stopListenRef.current = listen({
      onText: (spoken) => { handsFreeDraftRef.current = spoken; },
      onEnd: () => {
        setListening(false);
        const spoken = handsFreeDraftRef.current.trim();
        handsFreeDraftRef.current = '';
        if (spoken && handsFreeRef.current) void contextualSend(spoken);
        else if (handsFreeRef.current) window.setTimeout(() => startHandsFreeListening(), 450);
      },
      onError: (message) => {
        setVoiceError(message);
        handsFreeRef.current = false;
        setHandsFree(false);
        setListening(false);
      },
    });
  };

  const toggleHandsFree = () => {
    if (handsFreeRef.current) {
      handsFreeRef.current = false;
      setHandsFree(false);
      setListening(false);
      stopListenRef.current?.();
      stopListenRef.current = null;
      return;
    }
    setVoiceError(null);
    handsFreeRef.current = true;
    lastHandsFreeSpokenRef.current = messages.length - 1;
    setHandsFree(true);
    startHandsFreeListening();
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
    }, { gender: app.settings.voiceGender ?? 'any', style: app.settings.voiceStyle ?? 'soft', rate: app.settings.voiceRate ?? 1 });
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
    const index = messages.length - 1;
    const latest = messages[index];
    if (!handsFree || loading || !latest || latest.role !== 'assistant' || index <= lastHandsFreeSpokenRef.current) return;
    lastHandsFreeSpokenRef.current = index;
    speak(latest.content, {
      onEnd: () => { if (handsFreeRef.current) startHandsFreeListening(); },
      onError: (message) => {
        setVoiceError(message);
        handsFreeRef.current = false;
        setHandsFree(false);
      },
    }, { gender: app.settings.voiceGender ?? 'any', style: app.settings.voiceStyle ?? 'soft', rate: app.settings.voiceRate ?? 1 });
  }, [messages, handsFree, loading, app.settings.voiceGender, app.settings.voiceStyle, app.settings.voiceRate]);

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
    <div className="masar-chat-shell relative mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-7xl overflow-hidden rounded-2xl border border-line bg-card/70 shadow-xl shadow-black/5">
      {historyOpen && <button type="button" aria-label="إغلاق سجل المحادثات" className="absolute inset-0 z-20 bg-black/45 md:hidden" onClick={() => setHistoryOpen(false)} />}

      <aside className={`masar-chat-sidebar absolute inset-y-0 right-0 z-30 flex w-[min(84vw,19rem)] flex-col border-l border-line bg-base/95 p-3 backdrop-blur-xl transition-transform md:static md:z-auto md:w-72 md:translate-x-0 ${historyOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 font-bold"><Bot size={19} className="text-accent" /><span>دليل</span></div>
          <button type="button" className="rounded-lg p-2 text-muted hover:bg-card md:hidden" onClick={() => setHistoryOpen(false)} aria-label="إغلاق القائمة"><X size={18} /></button>
        </div>
        <button type="button" className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 py-3 text-sm font-semibold transition hover:border-accent hover:bg-card/80 disabled:opacity-40" disabled={loading} onClick={() => { newConversation(); setHistoryOpen(false); }}>
          <Plus size={17} /> محادثة جديدة
        </button>
        <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-card/70 px-3 py-2.5 text-muted">
          <Search size={16} />
          <input className="min-w-0 flex-1 bg-transparent text-sm text-main outline-none placeholder:text-muted" placeholder="ابحث في المحادثات" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
        </label>
        <div className="mb-2 px-2 text-[11px] font-semibold text-muted">سجل المحادثات · محفوظ على هذا الجهاز</div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs leading-6 text-muted">{conversations.length ? 'لا توجد محادثة تطابق البحث.' : 'ستظهر محادثاتك هنا بعد بدء أول محادثة.'}</p>
          ) : filteredConversations.map((conversation) => (
            <div key={conversation.id} className={`group flex items-center gap-1 rounded-xl px-2 py-1.5 transition ${activeConversationId === conversation.id ? 'bg-accent/10 text-main' : 'hover:bg-card'}`}>
              <button type="button" disabled={loading} className="min-w-0 flex-1 py-1 text-start" onClick={() => { void openConversation(conversation.id); setHistoryOpen(false); }}>
                <span className="block truncate text-[13px] font-medium">{conversation.title}</span>
                <span className="mt-1 block text-[10px] text-muted">{conversation.messages.length} رسالة · {new Date(conversation.updatedAt).toLocaleDateString('ar')}</span>
              </button>
              <div className="flex shrink-0 items-center opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <button type="button" className="rounded-lg p-1.5 text-muted hover:bg-base hover:text-main disabled:opacity-40" disabled={loading} title="إعادة تسمية" aria-label={`إعادة تسمية ${conversation.title}`} onClick={() => { const value = window.prompt('اكتب اسماً للمحادثة', conversation.title); if (value?.trim()) void renameConversation(conversation.id, value); }}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="rounded-lg p-1.5 text-muted hover:bg-bad/10 hover:text-bad disabled:opacity-40" disabled={loading} title="حذف المحادثة" aria-label={`حذف ${conversation.title}`} onClick={() => { if (window.confirm('هل تريد حذف هذه المحادثة نهائياً من هذا الجهاز؟')) void deleteConversation(conversation.id); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-line px-2 pt-3 text-[10px] leading-5 text-muted">
          تحفظ المحادثات محلياً على هذا الجهاز. لا تتم مزامنتها بين الأجهزة حالياً.
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" className="rounded-lg p-2 text-muted hover:bg-base md:hidden" onClick={() => setHistoryOpen(true)} aria-label="فتح سجل المحادثات"><Menu size={19} /></button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold">دليل</h1>
              <p className="truncate text-[11px] text-muted">المساعد الذكي لمنصة مسار</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" className="rounded-xl border border-line px-2.5 py-2 text-xs text-muted hover:bg-base" onClick={onCallOpen} aria-label="فتح المعلم الصوتي" title="المعلم الصوتي"><Phone size={15} /></button>
            <button type="button" className="rounded-xl border border-line px-2.5 py-2 text-xs text-muted hover:bg-base" onClick={() => { setHistoryOpen(true); void refreshConversations(); }}><History size={15} className="inline" /> <span className="hidden sm:inline">السجل</span></button>
            <button type="button" className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-onaccent hover:brightness-110 disabled:opacity-40" disabled={loading} onClick={() => newConversation()}><Plus size={15} className="inline" /> جديد</button>
          </div>
        </header>

        {sourcePage && <div className="mx-3 mt-3 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-muted sm:mx-5">سياق المساعدة: فتحت دليل من صفحة <strong className="text-main">{sourcePage}</strong>.</div>}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-3 pb-5 pt-4 sm:px-6" aria-live="polite">
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-[42vh] max-w-2xl flex-col items-center justify-center py-8 text-center">
                <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-base text-accent shadow-sm"><Bot size={29} /></div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{attachment ? 'الملف جاهز للنقاش' : 'بماذا يمكنني مساعدتك؟'}</h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted">{attachment ? 'اسأل دليل عن محتوى الملف أو اطلب تلخيصه وتحويله إلى أسئلة.' : 'اسأل عن دروسك، اطلب شرحاً مفصلاً، أو ابدأ بخطة مراجعة.'}</p>
                {previousSummary && <div className="mt-4 max-w-lg rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-xs leading-6 text-muted"><strong className="text-main">الذاكرة السابقة نشطة.</strong> سيستخدم دليل سياق المحادثة السابقة عند صلته بسؤالك.</div>}
                <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {(attachment ? FILE_SUGGESTIONS : SUGGESTIONS).map((suggestion) => <button key={suggestion} type="button" className="rounded-xl border border-line bg-card/70 px-3 py-3 text-start text-xs leading-6 transition hover:border-accent hover:bg-base" onClick={() => void contextualSend(suggestion)}>{suggestion}</button>)}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-7">
                {messages.map((message, index) => (
                  <article key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-start' : 'justify-start'}`}>
                    {message.role === 'assistant' && <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"><Bot size={17} /></div>}
                    <div className={message.role === 'user' ? 'max-w-[88%]' : 'min-w-0 flex-1'}>
                      <div className={`mb-1 text-xs font-bold ${message.role === 'user' ? 'text-end' : ''}`}>{message.role === 'assistant' ? 'دليل' : 'أنت'}</div>
                      <div className={`chat-message-content text-sm leading-8 ${message.role === 'user' ? 'rounded-2xl bg-base px-4 py-3' : 'px-0 py-1'}`}>
                        <MessageBody content={message.content} />
                      </div>
                      {message.role === 'assistant' && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                          <button type="button" className="inline-flex items-center gap-1 hover:text-main" onClick={() => void copy(index, message.content)}><Copy size={13} />{copied === index ? 'تم النسخ' : 'نسخ'}</button>
                          {index === messages.length - 1 && !loading && <button type="button" className="inline-flex items-center gap-1 hover:text-main" onClick={regenerate}><RefreshCw size={13} />إعادة الإجابة</button>}
                          {canSpeak() && <button type="button" className="inline-flex items-center gap-1 hover:text-main" onClick={() => toggleSpeak(index, message.content)}>{speakingIdx === index ? <Square size={13} /> : <Volume2 size={13} />}{speakingIdx === index ? 'إيقاف الصوت' : 'استمع'}</button>}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-base text-muted"><span className="text-xs font-bold">أنت</span></div>}
                  </article>
                ))}
                {loading && <div className="flex items-center gap-3 text-sm text-muted"><span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent"><Bot size={17} /></span><span className="animate-pulse">دليل يكتب…</span></div>}
                {error && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="border-t border-line bg-card/80 px-3 pb-3 pt-3 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-2">
              <details className="group rounded-xl border border-line bg-base/50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-muted">
                  <span>أدوات التعلّم وإعدادات دليل</span><span className="text-[10px] font-normal">المادة · أسلوب الشرح · مستوى الطالب</span>
                </summary>
                <div className="space-y-3 border-t border-line p-3">
                  <Advisor />
                  <details className="rounded-lg border border-line/70 px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium">ما يعرفه المعلّم عن مستواك</summary>
                    <p className="mt-2 text-xs leading-6 text-muted">{profile || 'لا توجد بيانات كافية بعد. كلما حللت أسئلة وأضفت امتحاناتك، تحسّن تخصيص الشرح.'}</p>
                    <label className="mt-2 flex items-center justify-between gap-3 text-xs"><span>استخدامه لتخصيص الشرح</span><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={useProfile} onChange={(e) => setUseProfile(e.target.checked)} /></label>
                  </details>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="مادة السؤال">
                    <button type="button" aria-pressed={subject === null} className={`chip ${subject === null ? '!border-accent !text-accent' : ''}`} onClick={() => setSubject(null)}>كل المواد</button>
                    {app.subjects.map((item) => <button key={item.id} type="button" aria-pressed={subject === item.name} className={`chip ${subject === item.name ? '!border-accent !text-accent' : ''}`} onClick={() => setSubject(subject === item.name ? null : item.name)}>{item.name}</button>)}
                  </div>
                  <select className="input" aria-label="أسلوب الرد" value={style} onChange={(e) => setStyle(e.target.value as ChatStyle)}>
                    <option value="normal">أسلوب الرد: عادي</option><option value="explain">اشرح ببساطة مع مثال</option><option value="steps">حل خطوة بخطوة</option><option value="summary">لخّص في نقاط</option><option value="coach">درّبني بأسئلة موجِّهة</option><option value="diagnose">شخّص نقطة ضعفي أولاً</option><option value="exam_coach">مدرّب الامتحان</option><option value="mastery">مسار الإتقان التفاعلي</option><option value="problem_solver">مساعد حل المسائل خطوة بخطوة</option><option value="voice_teacher">المدرّس الصوتي</option>
                  </select>
                  {style === 'mastery' && <p className="text-xs leading-6 text-muted">تشخيص سريع، شرح متدرّج، تدريب، ثم تحقق من الإتقان قبل الانتقال.</p>}
                  {style === 'problem_solver' && <p className="text-xs leading-6 text-muted">حل منظم: المعطيات والمطلوب، القانون، التعويض، الحساب، ثم التحقق من النتيجة.</p>}
                </div>
              </details>

              {voiceError && <p role="alert" className="text-xs text-bad">{voiceError}</p>}
              {(attachment || reading || fileError) && <div className="flex items-center gap-2 rounded-xl border border-line bg-base px-3 py-2 text-xs">
                {reading ? <Loader2 size={16} className="animate-spin text-muted" /> : <FileText size={17} className="text-accent" />}
                <div className="min-w-0 flex-1">{reading ? 'جارٍ قراءة الملف…' : fileError || attachment?.name}<p className="truncate text-[10px] text-muted">{attachment ? (attachment.truncated ? 'تم اقتطاع الملف لطوله.' : 'محتوى الملف سيرسل إلى خدمة الذكاء الاصطناعي.') : ''}</p></div>
                {attachment && <button type="button" className="rounded-lg p-1.5 text-muted hover:text-bad" aria-label="إزالة الملف" onClick={() => setAttachment(null)}><X size={15} /></button>}
              </div>}

              <form onSubmit={submit} className="rounded-2xl border border-line bg-base px-2 py-2 shadow-sm focus-within:border-accent/70 focus-within:ring-2 focus-within:ring-accent/10">
                <textarea
                  className="max-h-36 min-h-12 w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 outline-none placeholder:text-muted"
                  placeholder="اكتب رسالتك إلى دليل…"
                  aria-label="رسالتك"
                  rows={2}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  maxLength={2000}
                />
                <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-2">
                  <div className="flex items-center gap-1">
                    <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => void pickFile(e)} />
                    <button type="button" className="rounded-lg p-2 text-muted hover:bg-card hover:text-main" aria-label="إرفاق ملف" title="إرفاق ملف PDF أو Word أو Excel" disabled={reading || loading} onClick={() => fileRef.current?.click()}><Paperclip size={18} /></button>
                    {canListen() && <button type="button" className={`rounded-lg p-2 hover:bg-card ${handsFree ? 'text-accent' : 'text-muted'}`} aria-pressed={handsFree} aria-label={handsFree ? 'إيقاف المحادثة الصوتية المستمرة' : 'بدء المحادثة الصوتية المستمرة'} disabled={loading} onClick={toggleHandsFree}><Phone size={17} /></button>}
                    {canListen() && <button type="button" className={`rounded-lg p-2 hover:bg-card ${listening ? 'text-accent' : 'text-muted'}`} aria-pressed={listening} aria-label={listening ? 'إيقاف الإملاء الصوتي' : 'إملاء السؤال بصوتك'} disabled={loading} onClick={toggleMic}>{listening ? <Square size={17} /> : <Mic size={17} />}</button>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-[10px] text-muted sm:inline">Enter للإرسال · Shift+Enter لسطر جديد</span>
                    <button type="submit" className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-onaccent transition hover:brightness-110 disabled:opacity-40" disabled={!text.trim() || loading} aria-label="إرسال الرسالة"><Send size={17} className="rotate-180" /></button>
                  </div>
                </div>
              </form>
              <p className="text-center text-[10px] leading-5 text-muted">قد يخطئ دليل؛ تحقّق من المعلومات المهمة في مصادرك الدراسية. الملفات الممسوحة ضوئياً كصور لا تُقرأ.</p>
            </div>
          </div>
        </div>
      </section>

      {extraUsagePending && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="avora-extra-title" className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl">
          <div className="mb-3 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Bot size={22} /></span><h2 id="avora-extra-title" className="text-lg font-bold">استمرار استخدام دليل</h2></div>
          <p className="text-sm leading-7 text-muted">انتهى رصيدك المجاني الحالي. هل توافق على تفعيل الاستخدام الإضافي لمتابعة العمل مع دليل؟</p>
          <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-6">قد تترتب تكلفة إضافية على هذا الخيار. لن يتم تفعيله دون موافقتك.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" className="btn btn-primary" onClick={() => void continueWithExtraUsage()}>نعم، أوافق</button><button type="button" className="btn btn-ghost border border-line" onClick={cancelExtraUsage}>لا، سأنتظر</button></div>
        </section>
      </div>}
    </div>
  );
}


function MessageBody({ content }: { content: string }) {
  const segments = content.split(/(```[\s\S]*?```)/g).filter(Boolean);
  return (
    <div className="space-y-3">
      {segments.map((segment, index) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const code = segment.slice(3, -3).replace(/^[\w-]+\n/, '');
          return <pre key={index} dir="ltr" className="chat-code-block overflow-x-auto rounded-xl border border-line bg-base p-3 text-xs leading-6"><code>{code}</code></pre>;
        }
        const lines = segment.split('\n');
        const nodes: ReactNode[] = [];
        let list: string[] = [];
        let listType: 'ul' | 'ol' | null = null;
        const flush = () => {
          if (!listType || !list.length) return;
          const items = list.map((item, i) => <li key={i} className="ps-1">{inlineContent(item)}</li>);
          nodes.push(listType === 'ul' ? <ul key={nodes.length} className="my-2 list-disc space-y-1 pe-6">{items}</ul> : <ol key={nodes.length} className="my-2 list-decimal space-y-1 pe-6">{items}</ol>);
          list = [];
          listType = null;
        };
        lines.forEach((line) => {
          const trimmed = line.trim();
          const bullet = trimmed.match(/^[-*•]\s+(.+)/);
          const numbered = trimmed.match(/^\d+[.)]\s+(.+)/);
          if (bullet || numbered) {
            const nextType = bullet ? 'ul' : 'ol';
            if (listType && listType !== nextType) flush();
            listType = nextType;
            list.push((bullet ?? numbered)![1]);
            return;
          }
          flush();
          if (!trimmed) return;
          const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
          if (heading) {
            const Tag = heading[1].length === 1 ? 'h2' : 'h3';
            nodes.push(<Tag key={nodes.length} className="mt-3 text-base font-bold leading-7">{inlineContent(heading[2])}</Tag>);
          } else if (trimmed.startsWith('> ')) {
            nodes.push(<blockquote key={nodes.length} className="border-r-2 border-accent/50 pe-3 text-muted">{inlineContent(trimmed.slice(2))}</blockquote>);
          } else {
            nodes.push(<p key={nodes.length} className="whitespace-pre-wrap">{inlineContent(line)}</p>);
          }
        });
        flush();
        return <div key={index} className="space-y-1">{nodes}</div>;
      })}
    </div>
  );
}

function inlineContent(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s]+)/g);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`') && token.endsWith('`')) return <code key={index} dir="ltr" className="rounded bg-base px-1.5 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>;
    if (/^https?:\/\//.test(token)) return <a key={index} href={token} target="_blank" rel="noreferrer" className="break-all text-accent underline underline-offset-2">{token}</a>;
    return token;
  });
}
