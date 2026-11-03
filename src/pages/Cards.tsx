import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import type { CardCategory, Flashcard } from '../db';
import { Empty, PageTitle, SubjectDot, SubjectSelect } from '../components/ui';
import { toDateKey } from '../lib/utils';

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

  const today = toDateKey();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [category, setCategory] = useState<CardCategory>('definition');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [filter, setFilter] = useState<number | 'all'>('all');

  const [queue, setQueue] = useState<number[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

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

  const startStudy = () => {
    if (dueList.length === 0) return;
    setQueue(dueList.map((c) => c.id));
    setFlipped(false);
    setKnown(0);
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
        setQueue((q) => (q ? q.slice(1) : q));
      } else {
        // غير المعروفة تعود لآخر الطابور
        setQueue((q) => (q ? [...q.slice(1), q[0]] : q));
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
