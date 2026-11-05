import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronLeft, Circle, Layers3 } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle } from '../components/ui';

export default function MindMap() {
  const subjects = useApp((s) => s.subjects);
  const lessons = useApp((s) => s.lessons);
  const toggleLesson = useApp((s) => s.toggleLesson);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);

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
