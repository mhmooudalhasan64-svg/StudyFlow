import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BookOpen, Copy, FileUp, Loader2, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import type { Question } from '../db';
import { extractPdfPages, FileTextError } from '../lib/fileText';
import { bookKey, deleteBookText, getBookText, listBookTexts, saveBookText, type SavedBook } from '../lib/bookCache';
import { askBook, requestQuiz } from '../lib/chatStore';
import { parseGeneratedQuiz } from '../lib/questionsIO';
import {
  chapterRange,
  chunkText,
  detectChapters,
  groundedItems,
  looksScanned,
  parsePageRange,
  planRequests,
  searchPages,
  textOfPages,
  toCards,
} from '../lib/bookQuiz';
import { shuffle } from '../lib/utils';

type Level = 'easy' | 'medium' | 'hard';
type Scope = 'all' | 'range' | 'chapter';

const LEVELS: [Level, string][] = [
  ['easy', 'سهل'],
  ['medium', 'متوسط'],
  ['hard', 'صعب'],
];

/** «اختبرني من كتابي PDF»: النص يُستخرج في هاتفك، ويُرسل للمساعد جزء صغير فقط لكل طلب */
export default function BookQuiz({ onStart }: { onStart: (list: Question[]) => void }) {
  const subjects = useApp((s) => s.subjects);
  const importQuestions = useApp((s) => s.importQuestions);
  const addCard = useApp((s) => s.addCard);
  const [saved, setSaved] = useState<SavedBook[]>([]);
  const refreshSaved = () => void listBookTexts().then(setSaved).catch(() => setSaved([]));
  useEffect(refreshSaved, []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [pages, setPages] = useState<string[] | null>(null);
  const [progress, setProgress] = useState('');
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [scope, setScope] = useState<Scope>('all');
  const [range, setRange] = useState('');
  const [chapter, setChapter] = useState(0);
  const [count, setCount] = useState(5);
  const [level, setLevel] = useState<Level>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ text: string; pages: number[] } | null>(null);

  const chapters = useMemo(() => (pages ? detectChapters(pages) : []), [pages]);
  const subject = subjects.find((s) => s.id === (subjectId === '' ? subjects[0]?.id : subjectId));

  const openBook = (bookName: string, p: string[]) => {
    setName(bookName);
    setPages(p);
    setScope('all');
    setChapter(0);
  };

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNote('');
    setPages(null);
    setBusy(true);
    try {
      const key = bookKey(file);
      const cached = await getBookText(key).catch(() => undefined);
      if (cached) {
        openBook(cached.name, cached.pages);
        return;
      }
      const p = await extractPdfPages(file, (n, t) => setProgress(`جارٍ قراءة الكتاب… ${n} / ${t}`));
      if (looksScanned(p)) {
        setError('هذا الكتاب صور ممسوحة ضوئياً ولا يحتوي نصاً يمكن قراءته، لذلك لا أستطيع إنشاء أسئلة منه. جرّب نسخة PDF نصية (غير مصوّرة).');
        return;
      }
      const title = file.name.replace(/\.pdf$/i, '');
      openBook(title, p);
      void saveBookText(key, title, p).then(refreshSaved).catch(() => undefined);
    } catch (err) {
      setError(err instanceof FileTextError ? err.message : 'تعذّرت قراءة الكتاب.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const useSaved = async (key: string) => {
    setError('');
    setNote('');
    const b = await getBookText(key).catch(() => undefined);
    if (b) openBook(b.name, b.pages);
  };

  const removeSaved = async (key: string) => {
    await deleteBookText(key).catch(() => undefined);
    refreshSaved();
  };

  const selection = (): { from: number; to: number } | null => {
    if (!pages) return null;
    if (scope === 'all') return { from: 1, to: pages.length };
    if (scope === 'chapter') return chapters.length ? chapterRange(chapters, chapter, pages.length) : null;
    return parsePageRange(range, pages.length);
  };

  /** يجهّز النص المختار وخطة الطلبات؛ يعيد null مع رسالة خطأ إن لم يصلح */
  const prepare = () => {
    if (!pages || !subject) return null;
    const sel = selection();
    if (!sel) {
      setError('حدّد الصفحات بشكل صحيح، مثل 12-40.');
      return null;
    }
    const text = textOfPages(pages, sel.from, sel.to);
    if (text.replace(/\s+/g, '').length < 200) {
      setError('الصفحات المختارة لا تحتوي نصاً كافياً. جرّب نطاقاً آخر.');
      return null;
    }
    const chunks = chunkText(text);
    return { sel, chunks, plan: planRequests(count, chunks.length), subject };
  };

  /** يرسل الأجزاء واحداً واحداً ويجمع العناصر المثبتة بنص الكتاب */
  const collect = async (job: NonNullable<ReturnType<typeof prepare>>, mode: 'quiz' | 'cards' | 'exam') => {
    const items: Record<string, unknown>[] = [];
    let dropped = 0;
    let lastError = '';
    for (let i = 0; i < job.plan.length; i++) {
      setProgress(`جارٍ الإنشاء… (${i + 1} / ${job.plan.length})`);
      const chunk = job.chunks[job.plan[i].chunk];
      try {
        const raw = await requestQuiz({
          mode,
          topic: '',
          count: job.plan[i].n,
          subject: job.subject.name,
          difficulty: level,
          source: { name, text: chunk },
        });
        const g = groundedItems(raw, chunk);
        items.push(...g.items);
        dropped += g.dropped;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'تعذّر الإنشاء';
      }
    }
    if (items.length === 0) {
      throw new Error(lastError || 'لم أجد في هذه الصفحات محتوى موثوقاً مبنياً على نص الكتاب. جرّب نطاقاً أوسع أو أعد المحاولة.');
    }
    return { items, dropped };
  };

  /** سؤال حر عن الكتاب: بحث محلي عن أقرب الصفحات ثم إرسالها فقط */
  const ask = async () => {
    const q = question.trim();
    if (!pages || !q) return;
    const sel = selection() ?? { from: 1, to: pages.length };
    const ctx = searchPages(pages, q, 7000, sel.from, sel.to);
    setError('');
    setAnswer(null);
    if (ctx.pages.length === 0) {
      setError('لم أجد في الصفحات المحددة ما يخص سؤالك. جرّب كلمات أخرى أو وسّع نطاق الصفحات.');
      return;
    }
    setBusy(true);
    setProgress('جارٍ البحث في الكتاب…');
    try {
      const text = await askBook({ question: q, name, text: ctx.text });
      setAnswer({ text, pages: ctx.pages });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر الحصول على إجابة');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const generate = async () => {
    const job = prepare();
    if (!job) return;
    setError('');
    setNote('');
    setBusy(true);
    try {
      const { items, dropped } = await collect(job, 'quiz');
      const label = `${name} (ص${job.sel.from}${job.sel.to > job.sel.from ? `–${job.sel.to}` : ''})`;
      const seen = new Set<string>();
      const unique = items.filter((x) => {
        const t = String(x.text);
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      });
      const parsed = parseGeneratedQuiz(JSON.stringify(unique.slice(0, count)), job.subject.name, label);
      await importQuestions(parsed);
      const texts = new Set(parsed.map((x) => x.text));
      const fresh = useApp.getState().questions.filter((x) => x.subjectId === job.subject.id && texts.has(x.text));
      if (dropped > 0) setNote(`استُبعد ${dropped} سؤالاً لأنه لم يُثبَّت بنص الكتاب.`);
      onStart(shuffle(fresh));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر إنشاء الاختبار');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  /** يستخرج أسئلة الاختيار الموجودة فعلاً في ورقة دورة سابقة (لا يؤلّف أسئلة) */
  const importExam = async () => {
    const job = prepare();
    if (!job) return;
    setError('');
    setNote('');
    setBusy(true);
    try {
      const { items, dropped } = await collect(job, 'exam');
      const seen = new Set<string>();
      const unique = items
        .filter((x) => {
          const t = String(x.text);
          if (seen.has(t)) return false;
          seen.add(t);
          return true;
        })
        .map((x) => ({
          ...x,
          explanation: `إجابة مقترحة من المساعد، تحقق منها من نموذج الإجابة الرسمي.${x.explanation ? ' ' + String(x.explanation) : ''}`,
        }));
      const label = `دورة: ${name} (ص${job.sel.from}${job.sel.to > job.sel.from ? `–${job.sel.to}` : ''})`;
      const parsed = parseGeneratedQuiz(JSON.stringify(unique.slice(0, count)), job.subject.name, label);
      await importQuestions(parsed);
      const texts = new Set(parsed.map((x) => x.text));
      const fresh = useApp.getState().questions.filter((x) => x.subjectId === job.subject.id && texts.has(x.text));
      setNote(`أُضيف ${parsed.length} سؤالاً إلى البنك${dropped > 0 ? `، واستُبعد ${dropped} غير موجود نصّه في الملف` : ''}. الإجابات اقتراح من المساعد.`);
      onStart(shuffle(fresh));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر استخراج الأسئلة');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  /** بطاقات مراجعة من الصفحات المختارة (تدخل نظام المراجعة المتباعدة الموجود) */
  const makeCards = async () => {
    const job = prepare();
    if (!job) return;
    setError('');
    setNote('');
    setBusy(true);
    try {
      const { items, dropped } = await collect(job, 'cards');
      const cards = toCards(items).slice(0, count);
      if (cards.length === 0) throw new Error('لم أستطع إنشاء بطاقات صالحة من هذه الصفحات. جرّب نطاقاً آخر.');
      for (const c of cards) await addCard({ subjectId: job.subject.id, category: c.category, front: c.front, back: c.back });
      setNote(`أُضيفت ${cards.length} بطاقة إلى صفحة «المراجعة»${dropped > 0 ? `، واستُبعد ${dropped} غير مثبتة بنص الكتاب` : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر إنشاء البطاقات');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 font-bold">
        <BookOpen size={18} className="text-accent" /> اختبرني من كتابي PDF
      </h2>
      <p className="text-xs text-muted">
        ارفع كتابك، وحدّد الصفحات. يُستخرج النص في هاتفك، وتُبنى الأسئلة من نص الكتاب فقط، ويُرسل للمساعد جزء صغير لكل طلب. تُحفظ الأسئلة وأخطاؤك في دفتر أخطائي.
      </p>
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => void pick(e)} />
      <button type="button" className="btn btn-ghost w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
        <FileUp size={16} /> {pages ? `تغيير الكتاب (${name})` : 'اختر ملف PDF'}
      </button>

      {!pages && saved.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted">كتب محفوظة في جهازك (دون إعادة قراءة):</p>
          {saved.map((b) => (
            <div key={b.key} className="flex items-center gap-2 rounded-xl border border-line/70 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {b.name} <span className="text-xs text-muted">({b.pageCount} ص)</span>
              </span>
              <button type="button" className="btn btn-ghost !py-1 text-xs" disabled={busy} onClick={() => void useSaved(b.key)}>
                استخدم
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:text-bad"
                aria-label={`حذف ${b.name} من الجهاز`}
                onClick={() => void removeSaved(b.key)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {pages && (
        <>
          <p className="text-xs text-muted">تمت قراءة {pages.length} صفحة.</p>
          <div>
            <label className="label" htmlFor="book-subject">
              المادة
            </label>
            <select
              id="book-subject"
              className="input"
              value={subject?.id ?? ''}
              onChange={(e) => setSubjectId(Number(e.target.value))}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {([
              ['all', 'كامل الكتاب'],
              ['range', 'صفحات'],
              ...(chapters.length ? ([['chapter', 'فصل']] as [Scope, string][]) : []),
            ] as [Scope, string][]).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={scope === v}
                className={`btn flex-1 ${scope === v ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setScope(v)}
              >
                {label}
              </button>
            ))}
          </div>
          {scope === 'range' && (
            <input
              className="input"
              inputMode="numeric"
              placeholder={`مثال: 12-40 (من 1 إلى ${pages.length})`}
              aria-label="نطاق الصفحات"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          )}
          {scope === 'chapter' && chapters.length > 0 && (
            <select className="input" aria-label="الفصل" value={chapter} onChange={(e) => setChapter(Number(e.target.value))}>
              {chapters.map((c, i) => (
                <option key={`${c.page}-${i}`} value={i}>
                  {c.title} (ص{c.page})
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="label">عدد الأسئلة</span>
              <div className="flex gap-1.5">
                {[5, 10, 15].map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={count === c}
                    className={`btn flex-1 !px-2 ${count === c ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCount(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">الصعوبة</span>
              <div className="flex gap-1.5">
                {LEVELS.map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={level === v}
                    className={`btn flex-1 !px-2 ${level === v ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setLevel(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-primary w-full" disabled={busy || !subject} onClick={() => void generate()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
            {busy ? progress || 'جارٍ العمل…' : 'اختبرني'}
          </button>
          <div className="space-y-2 border-t border-line/60 pt-3">
            <label className="label" htmlFor="book-ask">
              اسأل كتابك (ضمن الصفحات المحددة أعلاه)
            </label>
            <div className="flex gap-2">
              <input
                id="book-ask"
                className="input"
                placeholder="مثال: ما أسباب الثورة الصناعية؟"
                value={question}
                maxLength={300}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button type="button" className="btn btn-primary shrink-0" disabled={busy || !question.trim()} onClick={() => void ask()}>
                اسأل
              </button>
            </div>
            {answer && (
              <div className="rounded-xl border border-line/70 bg-base/40 p-3 text-sm leading-relaxed" aria-live="polite">
                <p className="whitespace-pre-wrap">{answer.text}</p>
                <p className="mt-2 text-[11px] text-muted">الصفحات التي بُنيت عليها الإجابة: {answer.pages.join('، ')}</p>
              </div>
            )}
          </div>

          <button type="button" className="btn btn-ghost w-full" disabled={busy || !subject} onClick={() => void importExam()}>
            <FileUp size={16} /> الملف ورقة دورة؟ استخرج أسئلتها كما هي
          </button>
          <button type="button" className="btn btn-ghost w-full" disabled={busy || !subject} onClick={() => void makeCards()}>
            <Copy size={16} /> حوّل الصفحات إلى بطاقات مراجعة
          </button>
        </>
      )}

      {busy && !pages && progress && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> {progress}
        </p>
      )}
      {note && <p className="text-xs text-muted">{note}</p>}
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </section>
  );
}
