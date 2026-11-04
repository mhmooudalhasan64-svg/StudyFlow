import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BookOpen, FileUp, Loader2 } from 'lucide-react';
import { useApp } from '../store';
import type { Question } from '../db';
import { extractPdfPages, FileTextError } from '../lib/fileText';
import { requestQuiz } from '../lib/chatStore';
import { parseGeneratedQuiz } from '../lib/questionsIO';
import {
  chapterRange,
  chunkText,
  detectChapters,
  groundedItems,
  looksScanned,
  parsePageRange,
  planRequests,
  textOfPages,
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

  const chapters = useMemo(() => (pages ? detectChapters(pages) : []), [pages]);
  const subject = subjects.find((s) => s.id === (subjectId === '' ? subjects[0]?.id : subjectId));

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNote('');
    setPages(null);
    setBusy(true);
    try {
      const p = await extractPdfPages(file, (n, t) => setProgress(`جارٍ قراءة الكتاب… ${n} / ${t}`));
      if (looksScanned(p)) {
        setError('هذا الكتاب صور ممسوحة ضوئياً ولا يحتوي نصاً يمكن قراءته، لذلك لا أستطيع إنشاء أسئلة منه. جرّب نسخة PDF نصية (غير مصوّرة).');
        return;
      }
      setName(file.name.replace(/\.pdf$/i, ''));
      setPages(p);
      setScope('all');
      setChapter(0);
    } catch (err) {
      setError(err instanceof FileTextError ? err.message : 'تعذّرت قراءة الكتاب.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const selection = (): { from: number; to: number } | null => {
    if (!pages) return null;
    if (scope === 'all') return { from: 1, to: pages.length };
    if (scope === 'chapter') return chapters.length ? chapterRange(chapters, chapter, pages.length) : null;
    return parsePageRange(range, pages.length);
  };

  const generate = async () => {
    if (!pages || !subject) return;
    const sel = selection();
    if (!sel) {
      setError('حدّد الصفحات بشكل صحيح، مثل 12-40.');
      return;
    }
    const text = textOfPages(pages, sel.from, sel.to);
    if (text.replace(/\s+/g, '').length < 200) {
      setError('الصفحات المختارة لا تحتوي نصاً كافياً. جرّب نطاقاً آخر.');
      return;
    }
    setError('');
    setNote('');
    setBusy(true);
    try {
      const chunks = chunkText(text);
      const plan = planRequests(count, chunks.length);
      const items: Record<string, unknown>[] = [];
      let dropped = 0;
      let lastError = '';
      for (let i = 0; i < plan.length; i++) {
        setProgress(`جارٍ إنشاء الأسئلة… (${i + 1} / ${plan.length})`);
        try {
          const raw = await requestQuiz({
            topic: '',
            count: plan[i].n,
            subject: subject.name,
            difficulty: level,
            source: { name, text: chunks[plan[i].chunk] },
          });
          const g = groundedItems(raw, chunks[plan[i].chunk]);
          items.push(...g.items);
          dropped += g.dropped;
        } catch (e) {
          lastError = e instanceof Error ? e.message : 'تعذّر إنشاء الأسئلة';
        }
      }
      if (items.length === 0) {
        throw new Error(
          lastError || 'لم أجد في هذه الصفحات أسئلة موثوقة مبنية على نص الكتاب. جرّب نطاقاً أوسع أو أعد المحاولة.',
        );
      }
      const label = `${name} (ص${sel.from}${sel.to > sel.from ? `–${sel.to}` : ''})`;
      const seen = new Set<string>();
      const unique = items.filter((x) => {
        const t = String(x.text);
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      });
      const parsed = parseGeneratedQuiz(JSON.stringify(unique.slice(0, count)), subject.name, label);
      await importQuestions(parsed);
      const texts = new Set(parsed.map((x) => x.text));
      const fresh = useApp.getState().questions.filter((x) => x.subjectId === subject.id && texts.has(x.text));
      if (dropped > 0) setNote(`استُبعد ${dropped} سؤالاً لأنه لم يُثبَّت بنص الكتاب.`);
      onStart(shuffle(fresh));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر إنشاء الاختبار');
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
