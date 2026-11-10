import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Loader2, Play, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import type { CardCategory, Flashcard } from '../db';
import { Empty, PageTitle, SubjectDot, SubjectSelect } from '../components/ui';
import { toDateKey } from '../lib/utils';
import { requestQuiz, useChat } from '../lib/chatStore';

export const CATEGORIES: { id: CardCategory; label: string }[] = [
  { id: 'definition', label: 'تعريف' },
  { id: 'date', label: 'تاريخ' },
  { id: 'term', label: 'مصطلح' },
  { id: 'rule', label: 'قاعدة' },
];

const catLabel = (c: CardCategory) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

export default function Cards() {
  const cards = useApp((s) => s.cards);
  const subjects = useApp((s) => s.subjects);
  const addCard = useApp((s) => s.addCard);
  const removeCard = useApp((s) => s.removeCard);
  const reviewCard = useApp((s) => s.reviewCard);
  const attachment = useChat((s) => s.attachment);
  const [genTopic, setGenTopic] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genNotice, setGenNotice] = useState('');

  const today = toDateKey();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [category, setCategory] = useState<CardCategory>('definition');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [filter, setFilter] = useState<number | 'all'>('all');

  const [queue, setQueue] = useState<number[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [retried, setRetried] = useState<number[]>([]);
  const [missed, setMissed] = useState<number[]>([]);

  const list = useMemo(
    () => (filter === 'all' ? cards : cards.filter((c) => c.subjectId === filter)),
    [cards, filter],
  );
  const dueList = useMemo(() => list.filter((c) => c.due <= today), [list, today]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    void addCard({ subjectId, category, front, back });
    setFront('');
    setBack('');
  };

  const generateCards = async () => {
    const subject = subjects.find((item) => item.id === subjectId);
    if (!attachment && !genTopic.trim()) { setGenError('اكتب موضوعاً أو أرفق ملفاً من صفحة المساعد الذكي أولاً.'); return; }
    setGenerating(true); setGenError(''); setGenNotice('');
    try {
      const raw = await requestQuiz({ topic: genTopic.trim() || 'المحتوى المرفق', count: genCount, ...(subject ? { subject: subject.name } : {}), mode: 'cards' });
      const cleaned = raw.replace(/^\uFEFF/, '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      const parsed: unknown = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('لم يُرجع المعلّم قائمة بطاقات صالحة.');
      const valid = parsed.slice(0, genCount).filter((item): item is { front: string; back: string; category?: string } => !!item && typeof item === 'object' && typeof (item as { front?: unknown }).front === 'string' && typeof (item as { back?: unknown }).back === 'string' && !!(item as { front: string }).front.trim() && !!(item as { back: string }).back.trim());
      if (!valid.length) throw new Error('لم أجد بطاقات مكتملة في النتيجة. جرّب موضوعاً أو ملفاً أوضح.');
      const allowed: CardCategory[] = ['definition', 'date', 'term', 'rule'];
      for (const item of valid) { const category = allowed.includes(item.category as CardCategory) ? item.category as CardCategory : 'definition'; await addCard({ subjectId, category, front: item.front.trim(), back: item.back.trim() }); }
      setGenNotice('تم إنشاء وإضافة ' + valid.length + ' بطاقة إلى مراجعاتك.'); setGenTopic('');
    } catch (error) { setGenError(error instanceof Error ? error.message : 'تعذّر إنشاء البطاقات.'); }
    finally { setGenerating(false); }
  };

  const startStudy = () => {
    if (dueList.length === 0) return;
    setQueue(dueList.map((c) => c.id));
    setFlipped(false);
    setKnown(0);
    setRetried([]);
    setMissed([]);
  };

  // ---------- وضع الدراسة ----------
  if (queue) {
    const current: Flashcard | undefined = cards.find((c) => c.id === queue[0]);
    if (!current || queue.length === 0) {
      return (
        <div className="mx-auto max-w-2xl space-y-4">
          <PageTitle title="انتهت الجلسة" />
          <div className="card text-center">
            <p className="text-4xl font-extrabold">{known}</p>
            <p className="mt-1 text-muted">بطاقة عرفتها في هذه الجلسة</p>
            <div className="mt-3 rounded-xl bg-base/60 p-3 text-sm">
              <p>بطاقات تحتاج إلى مراجعة إضافية: <strong>{missed.length}</strong></p>
              {missed.length > 0 && <p className="mt-1 text-muted">لم تُتقن بعض البطاقات بعد. ستبقى مستحقة ويمكنك العودة إليها لاحقاً.</p>}
              {missed.length === 0 && <p className="mt-1 text-muted">ممتاز! أتقنت جميع البطاقات في هذه الجولة.</p>}
            </div>
            <button type="button" className="btn btn-primary mt-4" onClick={() => setQueue(null)}>
              رجوع للبطاقات
            </button>
          </div>
        </div>
      );
    }

    const answer = (ok: boolean) => {
      void reviewCard(current.id, ok);
      if (ok) {
        setKnown((k) => k + 1);
        setMissed((items) => items.filter((id) => id !== current.id));
        setQueue((q) => (q ? q.slice(1) : q));
      } else {
        setMissed((items) => items.includes(current.id) ? items : [...items, current.id]);
        // تعود البطاقة غير المعروفة مرة واحدة فقط؛ لمنع بقاء الجلسة في حلقة لا تنتهي
        if (!retried.includes(current.id)) {
          setRetried((items) => [...items, current.id]);
          setQueue((q) => (q ? [...q.slice(1), current.id] : q));
        } else {
          setQueue((q) => (q ? q.slice(1) : q));
        }
      }
      setFlipped(false);
    };

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <button type="button" className="btn btn-ghost !py-1.5" onClick={() => setQueue(null)}>
            <ArrowRight size={16} /> إنهاء
          </button>
          <span>المتبقي: {queue.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? 'إظهار السؤال' : 'إظهار الجواب'}
          className="card grid min-h-56 w-full place-items-center text-center transition hover:border-accent"
        >
          <div>
            <p className="mb-3 text-xs text-muted">
              {catLabel(current.category)} · {flipped ? 'الجواب' : 'السؤال (اضغط لإظهار الجواب)'}
            </p>
            <p className="whitespace-pre-wrap text-xl font-bold leading-relaxed">{flipped ? current.back : current.front}</p>
          </div>
        </button>
        {flipped ? (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-ghost !py-3" onClick={() => answer(false)}>
              <RotateCcw size={16} /> لم أعرفها
            </button>
            <button type="button" className="btn btn-primary !py-3" onClick={() => answer(true)}>
              <Check size={16} /> عرفتها
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary w-full !py-3" onClick={() => setFlipped(true)}>
            إظهار الجواب
          </button>
        )}
      </div>
    );
  }

  // ---------- القائمة ----------
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle
        title="البطاقات التعليمية"
        subtitle="سؤال وجواب لحفظ التعريفات والتواريخ والمصطلحات والقواعد"
        action={
          <button type="button" className="btn btn-primary" onClick={startStudy} disabled={dueList.length === 0}>
            <Play size={16} /> ادرس ({dueList.length})
          </button>
        }
      />

      <section className="card space-y-3">
        <div className="flex items-center gap-2"><Sparkles size={18} className="text-accent" /><h2 className="font-bold">إنشاء بطاقات ذكية</h2></div>
        <p className="text-xs leading-6 text-muted">أنشئ بطاقات تلقائياً من موضوع تدرسه أو من ملف أرفقته في صفحة المساعد الذكي. {attachment ? `الملف الجاهز: ${attachment.name}` : "لا يوجد ملف مرفق حالياً."}</p>
        <input className="input" value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder={attachment ? "موضوع اختياري للتركيز داخل الملف" : "مثال: أسباب الحرب العالمية الأولى"} aria-label="موضوع البطاقات الذكية" />
        <div className="flex items-center gap-3"><label className="text-sm text-muted" htmlFor="generated-card-count">عدد البطاقات</label><select id="generated-card-count" className="input flex-1" value={genCount} onChange={(e) => setGenCount(Number(e.target.value))}>{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} بطاقات</option>)}</select></div>
        {genError && <p role="alert" className="text-sm text-bad">{genError}</p>}
        {genNotice && <p role="status" className="text-sm text-ok">{genNotice}</p>}
        <button type="button" className="btn btn-primary w-full" onClick={() => void generateCards()} disabled={generating || (!attachment && !genTopic.trim())}>{generating ? <><Loader2 size={16} className="animate-spin" /> جارٍ إنشاء البطاقات...</> : <><Sparkles size={16} /> أنشئ بطاقات بالذكاء الاصطناعي</>}</button>
      </section>

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-bold">بطاقة جديدة</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="card-subject">
              المادة
            </label>
            <SubjectSelect id="card-subject" value={subjectId} onChange={setSubjectId} />
          </div>
          <div>
            <label className="label" htmlFor="card-cat">
              النوع
            </label>
            <select id="card-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as CardCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="card-front">
            السؤال / المصطلح
          </label>
          <textarea id="card-front" className="input min-h-16" value={front} onChange={(e) => setFront(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="card-back">
            الجواب
          </label>
          <textarea id="card-back" className="input min-h-16" value={back} onChange={(e) => setBack(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={!front.trim() || !back.trim()}>
          <Plus size={16} /> إضافة البطاقة
        </button>
      </form>

      <select
        className="input"
        aria-label="تصفية حسب المادة"
        value={filter}
        onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
      >
        <option value="all">كل المواد ({cards.length})</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({cards.filter((c) => c.subjectId === s.id).length})
          </option>
        ))}
      </select>

      {list.length === 0 ? (
        <Empty>لا بطاقات بعد.</Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id} className="card flex items-start gap-3 !p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.front}</p>
                <p className="mt-1 text-sm text-muted">{c.back}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="chip">{catLabel(c.category)}</span>
                  <SubjectDot subjectId={c.subjectId} />
                  {c.due <= today && <span className="chip text-accent">مستحقة</span>}
                </div>
              </div>
              <button
                type="button"
                aria-label="حذف البطاقة"
                onClick={() => void removeCard(c.id)}
                className="rounded-lg p-2 text-muted transition hover:bg-bad/10 hover:text-bad"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
