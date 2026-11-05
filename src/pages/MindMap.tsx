import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronLeft, Circle, Download, Layers3 } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle } from '../components/ui';

export default function MindMap() {
  const subjects = useApp((s) => s.subjects);
  const lessons = useApp((s) => s.lessons);
  const toggleLesson = useApp((s) => s.toggleLesson);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);

  const selectedId = subjectId ?? subjects[0]?.id ?? null;
  const subject = subjects.find((item) => item.id === selectedId);
  const subjectLessons = useMemo(
    () => lessons.filter((lesson) => lesson.subjectId === selectedId),
    [lessons, selectedId],
  );
  const groups = useMemo(() => {
    const map = new Map<string, typeof subjectLessons>();
    subjectLessons.forEach((lesson) => {
      const key = lesson.unit.trim() || 'دروس عامة';
      map.set(key, [...(map.get(key) ?? []), lesson]);
    });
    return [...map.entries()];
  }, [subjectLessons]);
  const completed = subjectLessons.filter((lesson) => lesson.done).length;
  const percent = subjectLessons.length ? Math.round((completed / subjectLessons.length) * 100) : 0;

  const exportPdf = () => {
    if (!subject || subjectLessons.length === 0) return;
    setExportError(null);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setExportError('تعذّر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجدداً.');
      return;
    }

    const safe = (value: string) =>
      value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      })[character] ?? character);
    const unitMarkup = groups.map(([unit, items], index) => `
      <section class="unit">
        <h2><span class="number">${index + 1}</span>${safe(unit)}</h2>
        <p class="unit-meta">${items.filter((lesson) => lesson.done).length} من ${items.length} درس مكتمل</p>
        <ul>
          ${items.map((lesson) => `
            <li><span class="status">${lesson.done ? '✓' : '○'}</span><span>${safe(lesson.title)}</span><span class="state">${lesson.done ? 'مكتمل' : 'قيد الدراسة'}</span></li>
          `).join('')}
        </ul>
      </section>
    `).join('');
    const generatedAt = new Intl.DateTimeFormat('ar', { dateStyle: 'long' }).format(new Date());

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>الخريطة الذهنية - ${safe(subject.name)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 32px; color: #17171c; background: #fff; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
          .sheet { max-width: 900px; margin: 0 auto; }
          header { text-align: center; padding: 24px; border: 2px solid #25232b; border-radius: 18px; }
          .brand { font-size: 11px; letter-spacing: 2px; color: #666; font-weight: bold; }
          h1 { margin: 12px 0 6px; font-size: 28px; }
          .subtitle { margin: 0; color: #666; font-size: 13px; }
          .summary { display: flex; justify-content: space-around; gap: 12px; margin: 18px 0 26px; padding: 14px; border-radius: 12px; background: #f3f1f8; text-align: center; }
          .summary strong { display: block; font-size: 20px; }
          .summary span { font-size: 11px; color: #555; }
          .unit { margin: 0 0 18px; padding: 14px 16px; border: 1px solid #d9d5e2; border-radius: 14px; break-inside: avoid; }
          h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 17px; }
          .number { display: inline-grid; width: 28px; height: 28px; place-items: center; border-radius: 8px; background: #eee7fb; color: #6235a5; font-size: 13px; }
          .unit-meta { margin: 6px 0 10px 38px; color: #666; font-size: 11px; }
          ul { list-style: none; padding: 0; margin: 0; }
          li { display: flex; align-items: center; gap: 9px; padding: 8px 4px; border-top: 1px solid #eee; font-size: 13px; }
          .status { color: #16845b; font-weight: bold; font-size: 16px; }
          .state { margin-right: auto; color: #777; font-size: 10px; white-space: nowrap; }
          footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ddd; color: #777; text-align: center; font-size: 10px; }
          @page { size: A4; margin: 14mm; }
          @media print { body { padding: 0; } .unit { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header>
            <div class="brand">STUDY FLOW</div>
            <h1>${safe(subject.name)}</h1>
            <p class="subtitle">الخريطة الذهنية للمادة</p>
          </header>
          <div class="summary">
            <div><strong>${groups.length}</strong><span>وحدة</span></div>
            <div><strong>${subjectLessons.length}</strong><span>درس</span></div>
            <div><strong>${completed}</strong><span>درس مكتمل</span></div>
            <div><strong>${percent}%</strong><span>نسبة الإنجاز</span></div>
          </div>
          ${unitMarkup}
          <footer>تم إنشاء هذه الخريطة من Study Flow · ${generatedAt}</footer>
        </main>
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
      </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
  };

  const toggleGroup = (name: string) => {
    setCollapsed((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageTitle
        title="الخرائط الذهنية التفاعلية"
        subtitle="حوّل دروسك المسجلة إلى خريطة واضحة تربط المادة بوحداتها ودروسها."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">احفظ خريطتك كملف PDF للطباعة أو المراجعة دون إنترنت.</p>
        <button type="button" className="btn btn-primary" onClick={exportPdf} disabled={!subject || subjectLessons.length === 0}>
          <Download size={17} /> تصدير PDF
        </button>
      </div>
      {exportError && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{exportError}</p>}

      <section className="card space-y-3">
        <label htmlFor="mindmap-subject" className="label">اختر المادة</label>
        <select
          id="mindmap-subject"
          className="input"
          value={selectedId ?? ''}
          onChange={(event) => {
            setSubjectId(event.target.value ? Number(event.target.value) : null);
            setCollapsed([]);
          }}
        >
          {subjects.length === 0 && <option value="">لا توجد مواد</option>}
          {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {subject && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/70 bg-base/40 p-3">
            <div className="flex items-center gap-2">
              <BookOpen size={19} className="text-accent2" />
              <div>
                <p className="font-bold">{subject.name}</p>
                <p className="text-xs text-muted">{groups.length} وحدة · {subjectLessons.length} درس</p>
              </div>
            </div>
            <div className="min-w-28 text-left">
              <p className="text-lg font-extrabold">{percent}%</p>
              <p className="text-xs text-muted">{completed} من {subjectLessons.length} مكتمل</p>
            </div>
          </div>
        )}
      </section>

      {!subject ? (
        <Empty>أضف مادة أولاً من إعدادات التطبيق لتبدأ ببناء خريطتك.</Empty>
      ) : subjectLessons.length === 0 ? (
        <Empty>
          لا توجد دروس مسجلة لهذه المادة بعد. أضف دروسها من صفحة «خطة المنهاج»، وستظهر هنا تلقائياً على شكل خريطة ذهنية.
          <a href="#/curriculum" className="mt-3 inline-flex font-semibold text-accent2 underline">الانتقال إلى خطة المنهاج</a>
        </Empty>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-2xl border border-accent2/40 bg-gradient-to-l from-accent2/15 to-accent3/10 px-6 py-4 text-center shadow-lg shadow-accent2/10">
              <Layers3 size={22} className="text-accent2" />
              <div>
                <p className="text-xs text-muted">الخريطة الرئيسية</p>
                <h2 className="text-lg font-extrabold">{subject.name}</h2>
              </div>
            </div>
          </div>
          <div className="mx-auto h-5 w-px bg-gradient-to-b from-accent2/70 to-line" />
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map(([unit, items], index) => {
              const isCollapsed = collapsed.includes(unit);
              const doneCount = items.filter((lesson) => lesson.done).length;
              return (
                <article key={unit} className="relative rounded-2xl border border-line bg-card/70 p-3 shadow-md shadow-accent2/5">
                  <div className="absolute -top-3 right-7 h-3 w-px bg-accent2/50" />
                  <button
                    type="button"
                    onClick={() => toggleGroup(unit)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center gap-3 rounded-xl bg-base/50 p-3 text-right transition hover:border-accent2"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent2/10 text-sm font-bold text-accent2">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{unit}</span>
                      <span className="text-xs text-muted">{doneCount} / {items.length} درس مكتمل</span>
                    </span>
                    {isCollapsed ? <ChevronLeft size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {!isCollapsed && (
                    <ul className="mt-3 space-y-2 pr-4">
                      {items.map((lesson) => (
                        <li key={lesson.id} className="relative">
                          <span className="absolute -right-2 top-0 h-1/2 w-px bg-line" />
                          <span className="absolute -right-2 top-4 h-px w-2 bg-line" />
                          <button
                            type="button"
                            onClick={() => void toggleLesson(lesson.id)}
                            aria-pressed={lesson.done}
                            className="flex w-full items-center gap-2 rounded-lg border border-line/60 bg-base/40 px-3 py-2 text-right text-sm transition hover:border-accent2/50"
                          >
                            {lesson.done
                              ? <CheckCircle2 size={17} className="shrink-0 text-ok" />
                              : <Circle size={17} className="shrink-0 text-muted" />}
                            <span className={lesson.done ? 'min-w-0 flex-1 text-muted line-through' : 'min-w-0 flex-1'}>{lesson.title}</span>
                            <span className="text-[10px] text-muted">{lesson.done ? 'مكتمل' : 'اضغط للإنجاز'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted">اضغط على اسم الوحدة لطيّها أو فتحها، واضغط على الدرس لتحديث حالة إنجازه في خطة المنهاج.</p>
        </section>
      )}
    </div>
  );
}
