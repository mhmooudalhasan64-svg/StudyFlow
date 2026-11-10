import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ExternalLink, FileText, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle, SubjectSelect } from '../components/ui';

const MAX_MB = 200;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export default function Library() {
  const books = useApp((s) => s.books);
  const subjects = useApp((s) => s.subjects);
  const addBook = useApp((s) => s.addBook);
  const removeBook = useApp((s) => s.removeBook);
  const getBookBlob = useApp((s) => s.getBookBlob);

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [lesson, setLesson] = useState('');
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar');
    const list = books.filter((b) => {
      const matchesSubject = filter === 'all' || b.subjectId === filter;
      const haystack = `${b.title} ${b.unit ?? ''} ${b.lesson ?? ''}`.toLocaleLowerCase('ar');
      return matchesSubject && (!query || haystack.includes(query));
    });
    const bySubject = new Map<number | null, Map<string, typeof books>>();
    for (const b of list) {
      const units = bySubject.get(b.subjectId) ?? new Map<string, typeof books>();
      const key = b.unit || 'بدون وحدة';
      units.set(key, [...(units.get(key) ?? []), b]);
      bySubject.set(b.subjectId, units);
    }
    return [...bySubject.entries()];
  }, [books, filter, search]);

  const nameOf = (id: number | null) => subjects.find((s) => s.id === id)?.name ?? 'بدون مادة';

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    let added = 0;
    const errors: string[] = [];
    for (const f of files) {
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      if (!isPdf) errors.push(`«${f.name}» ليس ملفًا بصيغة PDF`);
      else if (f.size > MAX_MB * 1024 * 1024) errors.push(`حجم الملف «${f.name}» يتجاوز ${MAX_MB} م.ب`);
      else {
        try {
          // عند رفع عدة ملفات يُستخدم عنوان الملف لكل منها
          await addBook(f, { subjectId, title: files.length === 1 ? title : '', unit, lesson });
          added++;
        } catch {
          errors.push(`تعذّر حفظ الملف «${f.name}»؛ ربما تكون مساحة التخزين ممتلئة.`);
        }
      }
    }
    setBusy(false);
    if (added > 0) {
      setTitle('');
      setLesson('');
    }
    setMessage(
      errors.length > 0
        ? { kind: 'err', text: errors.join(' — ') }
        : { kind: 'ok', text: `تمت إضافة ${added} كتاب` },
    );
  };

  const open = async (id: number) => {
    const blob = await getBookBlob(id);
    if (!blob) return setMessage({ kind: 'err', text: 'الملف غير موجود' });
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    window.open(url, '_blank', 'noopener');
    // نُبقي العنوان صالحاً مدة كافية لتحميل العارض
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
  };

  const confirmRemove = (id: number, t: string) => {
    if (window.confirm(`حذف «${t}» من المكتبة؟`)) void removeBook(id);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    fileRef.current?.click();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="مكتبة الكتب المدرسية" subtitle="تُحفظ الكتب على جهازك ويمكنك فتحها دون اتصال بالإنترنت" />

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-bold">إضافة كتاب (PDF)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="lib-subject">
              المادة
            </label>
            <SubjectSelect id="lib-subject" value={subjectId} onChange={setSubjectId} />
          </div>
          <div>
            <label className="label" htmlFor="lib-title">
              عنوان الكتاب (اختياري)
            </label>
            <input id="lib-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="lib-unit">
              الوحدة
            </label>
            <input id="lib-unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="lib-lesson">
              الدرس
            </label>
            <input id="lib-lesson" className="input" value={lesson} onChange={(e) => setLesson(e.target.value)} maxLength={60} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          <Plus size={16} /> {busy ? 'جارٍ الحفظ…' : 'اختيار ملفات PDF'}
        </button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={pick} />
        {message && (
          <p role="status" className={`text-sm ${message.kind === 'ok' ? 'text-ok' : 'text-bad'}`}>
            {message.text}
          </p>
        )}
      </form>

      <input
        className="input"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث باسم الكتاب أو الوحدة أو الدرس…"
        aria-label="البحث في مكتبة الكتب"
      />

      <select
        className="input"
        aria-label="تصفية حسب المادة"
        value={filter}
        onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
      >
        <option value="all">كل المواد ({books.length})</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({books.filter((b) => b.subjectId === s.id).length})
          </option>
        ))}
      </select>

      {grouped.length === 0 ? (
        <Empty>{books.length === 0 ? 'لا توجد كتب بعد. أضف كتبك الرسمية بصيغة PDF لتبقى متاحة دون اتصال بالإنترنت.' : 'لا توجد نتائج مطابقة لبحثك أو للمادة المحددة.'}</Empty>
      ) : (
        grouped.map(([sid, units]) => (
          <section key={String(sid)} className="card space-y-3">
            <h2 className="font-bold">{nameOf(sid)}</h2>
            {[...units.entries()].map(([u, list]) => (
              <div key={u}>
                <p className="mb-1.5 text-xs font-medium text-muted">{u}</p>
                <ul className="space-y-2">
                  {list.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-xl border border-line/70 bg-base/40 p-3">
                      <FileText className="shrink-0 text-accent" size={20} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{b.title}</p>
                        <p className="truncate text-xs text-muted">
                          {b.lesson ? `${b.lesson} · ` : ''}
                          {formatSize(b.size)}
                        </p>
                      </div>
                      <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={() => void open(b.id)}>
                        <ExternalLink size={15} /> فتح
                      </button>
                      <button
                        type="button"
                        aria-label={`حذف ${b.title}`}
                        onClick={() => confirmRemove(b.id, b.title)}
                        className="rounded-lg p-2 text-muted transition hover:bg-bad/10 hover:text-bad"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
