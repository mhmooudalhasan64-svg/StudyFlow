import { useMemo, useState, type ReactNode } from 'react';
import { CalendarPlus, CheckCircle2, Lightbulb, Sparkles, TriangleAlert } from 'lucide-react';
import { useApp } from '../store';
import { generatePlan, getInsights, type Insight, type PlanSuggestion } from '../lib/advisor';
import { formatMinutes, toDateKey, weekdayShort, dayNumber } from '../lib/utils';
import { SubjectDot } from './ui';

const ICON = {
  good: <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" />,
  warn: <TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" />,
  info: <Lightbulb size={18} className="mt-0.5 shrink-0 text-accent" />,
} satisfies Record<Insight['level'], ReactNode>;

export default function Advisor() {
  const subjects = useApp((s) => s.subjects);
  const exams = useApp((s) => s.exams);
  const tasks = useApp((s) => s.tasks);
  const sessions = useApp((s) => s.sessions);
  const attempts = useApp((s) => s.attempts);
  const goalMin = useApp((s) => s.settings.dailyGoalMin);
  const addTasks = useApp((s) => s.addTasks);

  const [preview, setPreview] = useState<PlanSuggestion[] | null>(null);
  const [added, setAdded] = useState(false);

  const today = toDateKey();
  const ctx = useMemo(
    () => ({ subjects, exams, tasks, sessions, attempts, goalMin, today }),
    [subjects, exams, tasks, sessions, attempts, goalMin, today],
  );
  const insights = useMemo(() => getInsights(ctx), [ctx]);

  const propose = () => {
    setAdded(false);
    setPreview(generatePlan(ctx, 7));
  };

  const confirm = async () => {
    if (!preview || preview.length === 0) return;
    await addTasks(preview);
    setAdded(true);
    setPreview(null);
  };

  const dates = preview ? [...new Set(preview.map((p) => p.date))] : [];

  return (
    <section className="card mb-4 space-y-4" aria-label="المستشار الدراسي">
      <div className="flex items-center gap-2">
        <Sparkles className="text-accent" size={20} />
        <h2 className="font-bold">مستشارك الدراسي</h2>
        <span className="chip">يعمل على جهازك</span>
      </div>

      <ul className="space-y-2">
        {insights.map((i) => (
          <li key={i.id} className="flex gap-2.5 text-sm">
            {ICON[i.level]}
            <span>{i.text}</span>
          </li>
        ))}
      </ul>

      {added && (
        <p role="status" className="text-sm text-ok">
          تمت إضافة الخطة. افتح صفحة «الخطة» لتراها.
        </p>
      )}

      {!preview && (
        <button type="button" className="btn btn-primary w-full" onClick={propose} disabled={subjects.length === 0}>
          <CalendarPlus size={16} /> اقترح لي خطة مراجعة لأسبوع
        </button>
      )}

      {preview && (
        <div className="space-y-3 border-t border-line pt-3">
          {preview.length === 0 ? (
            <p className="text-sm text-muted">
              لا توجد مساحة لمهام جديدة؛ فأيامك القادمة ممتلئة وفق هدفك اليومي، أو لم تُضف أي مواد بعد. يمكنك زيادة الهدف من الإعدادات أو إضافة مواد.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">هذه خطة مقترحة، ويمكنك تعديلها لاحقًا من صفحة «الخطة».</p>
              <ul className="space-y-2">
                {dates.map((d) => (
                  <li key={d} className="rounded-xl border border-line/70 bg-base/40 p-3">
                    <p className="mb-2 text-sm font-bold">
                      {weekdayShort(d)} {dayNumber(d)}
                    </p>
                    <ul className="space-y-1.5">
                      {preview
                        .filter((p) => p.date === d)
                        .map((p) => (
                          <li key={p.subjectId} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2">
                              {p.title}
                              <SubjectDot subjectId={p.subjectId} />
                            </span>
                            <span className="text-muted">{formatMinutes(p.minutes)}</span>
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex gap-2">
            {preview.length > 0 && (
              <button type="button" className="btn btn-primary flex-1" onClick={() => void confirm()}>
                إضافة إلى خطتي
              </button>
            )}
            <button type="button" className="btn btn-ghost flex-1" onClick={() => setPreview(null)}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
