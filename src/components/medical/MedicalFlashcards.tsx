import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenCheck, Clock3, Layers3, RotateCcw, Sparkles } from 'lucide-react';
import { db, type MedicalFlashcard } from '../../db';
import { buildMedicalFlashcards, saveMedicalFlashcards, scheduleMedicalReview, type MedicalCardSource, type MedicalCardRating } from '../../lib/medicalFlashcards';

interface Props {
  analysis: MedicalCardSource | null;
  college: string;
  year: string;
  subject: string;
  sourceName: string;
}

const ratingButtons: { value: MedicalCardRating; label: string; detail: string; style: string }[] = [
  { value: 'again', label: 'لم أتذكر', detail: 'بعد يوم', style: 'border-bad/40 text-bad hover:bg-bad/10' },
  { value: 'hard', label: 'صعب', detail: 'زيادة قصيرة', style: 'border-line text-muted hover:bg-base' },
  { value: 'good', label: 'جيد', detail: 'حسب التدرّج', style: 'border-accent/40 text-accent hover:bg-accent/10' },
  { value: 'easy', label: 'سهل', detail: 'فاصل أطول', style: 'border-good/40 text-good hover:bg-good/10' },
];

export function MedicalFlashcards({ analysis, college, year, subject, sourceName }: Props) {
  const [cards, setCards] = useState<MedicalFlashcard[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const contextKey = `${college}|${year}|${subject.trim()}`;
  const activeContext = useRef(contextKey);
  const now = Date.now();

  const refresh = useCallback(async () => {
    const requestContext = contextKey;
    const rows = await db.medicalCards.where('college').equals(college).toArray();
    if (activeContext.current !== requestContext) return;
    setCards(rows.filter((card) => card.year === year && (!subject.trim() || card.subject === subject.trim()))
      .sort((a, b) => a.dueAt - b.dueAt));
  }, [college, year, subject, contextKey]);

  useEffect(() => {
    activeContext.current = contextKey;
    setActiveId(null);
    setRevealed(false);
    setBusy(false);
    let alive = true;
    void db.medicalCards.where('college').equals(college).toArray().then((rows) => {
      if (alive) setCards(rows.filter((card) => card.year === year && (!subject.trim() || card.subject === subject.trim()))
        .sort((a, b) => a.dueAt - b.dueAt));
    }).catch(() => { if (alive) setMessage('تعذّر تحميل البطاقات المحفوظة من الجهاز.'); });
    return () => { alive = false; };
  }, [college, year, subject, contextKey]);

  const dueCards = useMemo(() => cards.filter((card) => card.dueAt <= now), [cards, now]);
  const active = dueCards.find((card) => card.id === activeId) ?? dueCards[0] ?? null;

  const createCards = async () => {
    if (!analysis) return;
    const saveContext = contextKey;
    setBusy(true);
    setMessage('');
    try {
      const generated = buildMedicalFlashcards({ analysis, college, year, subject: subject.trim() || 'مادة غير محددة', sourceName });
      if (!generated.length) {
        if (activeContext.current === saveContext) setMessage('لا توجد مصطلحات أو نقاط عالية الأهمية كافية لتوليد بطاقات من هذا التحليل.');
        return;
      }
      const added = await saveMedicalFlashcards(generated);
      if (activeContext.current !== saveContext) return;
      await refresh();
      if (activeContext.current === saveContext) {
        setActiveId(null);
        setRevealed(false);
        setMessage(added ? `حُفظت ${added} بطاقة جديدة. البطاقات المكررة لم تُضف مرة ثانية.` : 'هذه البطاقات محفوظة مسبقاً؛ لم تتم إضافة نسخ مكررة.');
      }
    } catch {
      if (activeContext.current === saveContext) setMessage('تعذّر حفظ البطاقات محلياً. تحقق من مساحة التخزين ثم أعد المحاولة.');
    } finally {
      if (activeContext.current === saveContext) setBusy(false);
    }
  };

  const rateCard = async (rating: MedicalCardRating) => {
    if (!active?.id || busy) return;
    const reviewContext = contextKey;
    setBusy(true);
    try {
      await db.medicalCards.update(active.id, scheduleMedicalReview(active, rating));
      if (activeContext.current === reviewContext) {
        setActiveId(null);
        setRevealed(false);
        await refresh();
      }
    } catch {
      if (activeContext.current === reviewContext) setMessage('تعذّر تحديث موعد المراجعة. لم يتم تغيير البطاقة.');
    } finally {
      if (activeContext.current === reviewContext) setBusy(false);
    }
  };

  return (
    <section className="card space-y-4 !p-4 sm:!p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="feature-icon feature-icon-blue"><Layers3 size={21}/></span>
          <div><h3 className="font-extrabold">بطاقات الحفظ الذكي</h3><p className="mt-1 text-xs leading-6 text-muted">بطاقات من مصطلحات المحاضرة ونقاطها المهمة، محفوظة محلياً على هذا الجهاز.</p></div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void createCards()} disabled={busy || !analysis}>
          {busy ? <RotateCcw size={15} className="animate-spin"/> : <Sparkles size={15}/>} توليد وحفظ البطاقات
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">إجمالي البطاقات</p><p className="mt-1 text-xl font-black tabular-nums">{cards.length}</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">مستحقة الآن</p><p className="mt-1 text-xl font-black tabular-nums">{dueCards.length}</p></div>
        <div className="rounded-xl bg-base p-3"><p className="text-[10px] text-muted">تمت مراجعتها</p><p className="mt-1 text-xl font-black tabular-nums">{cards.filter((card) => card.reps > 0).length}</p></div>
      </div>

      {active ? (
        <div className="space-y-3 rounded-2xl border border-accent/25 bg-accent/5 p-4">
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1"><BookOpenCheck size={13}/> {active.category === 'term' ? 'مصطلح طبي' : 'نقطة عالية الأهمية'}</span>
            <span>{active.subject} · السنة {active.year}</span>
          </div>
          <div className="min-h-28 py-4">
            <p className="whitespace-pre-line text-center text-base font-bold leading-8">{revealed ? active.back : active.front}</p>
          </div>
          {!revealed ? (
            <button type="button" className="btn btn-primary w-full" onClick={() => setRevealed(true)}>إظهار الإجابة</button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-[11px] text-muted">قيّم مدى تذكّرك لتحديد موعد المراجعة التالية:</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ratingButtons.map((item) => <button key={item.value} type="button" disabled={busy} onClick={() => void rateCard(item.value)} className={`rounded-xl border p-2 text-xs font-bold transition ${item.style}`}><span className="block">{item.label}</span><span className="mt-1 block text-[10px] font-normal opacity-75">{item.detail}</span></button>)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-4 text-center">
          <Clock3 size={22} className="mx-auto text-accent"/>
          <p className="mt-2 text-sm font-bold">{cards.length ? 'لا توجد بطاقات مستحقة الآن' : 'لم تُنشأ بطاقات لهذه المادة بعد'}</p>
          <p className="mt-1 text-xs leading-6 text-muted">{cards.length ? 'موعد المراجعة التالية سيظهر هنا عند استحقاقه.' : 'حلّل المحاضرة ثم اضغط «توليد وحفظ البطاقات».'}</p>
        </div>
      )}

      {message && <p role="status" className="rounded-lg bg-base p-3 text-xs leading-6 text-muted">{message}</p>}
      <p className="text-[10px] leading-5 text-muted">الجدولة تعليمية ومحلية: «لم أتذكر» يعيد البطاقة إلى فاصل يوم، و«جيد» يتدرج 1، 3، 7، 14، 30 يوماً، و«سهل» يمدد الفاصل. لا تتم مزامنة البطاقات بين الأجهزة حالياً.</p>
    </section>
  );
}
