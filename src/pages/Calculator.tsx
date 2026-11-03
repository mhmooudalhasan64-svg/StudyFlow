import { useMemo } from 'react';
import { PageTitle, NumberField } from '../components/ui';
import { useApp } from '../store';
import { BRANCHES, branchSubjects } from '../lib/bac';
import { DEFAULT_MAX, computeTotals, gradeLabel, planForTarget, round1 } from '../lib/calc';
import type { Mark } from '../db';

export default function Calculator() {
  const settings = useApp((s) => s.settings);
  const subjects = useApp((s) => s.subjects);
  const storedMarks = useApp((s) => s.marks);
  const setMark = useApp((s) => s.setMark);
  const updateSettings = useApp((s) => s.updateSettings);

  const list = useMemo(() => branchSubjects(subjects, settings.branch), [subjects, settings.branch]);
  const marks: Mark[] = useMemo(
    () =>
      list.map((s) => storedMarks.find((m) => m.subjectId === s.id) ?? { subjectId: s.id, mark: null, max: DEFAULT_MAX }),
    [list, storedMarks],
  );

  const totals = computeTotals(marks);
  const plan = planForTarget(marks, settings.targetPct);
  const pctAll = totals.maxAll > 0 ? (totals.earned / totals.maxAll) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle
        title="حاسبة العلامات"
        subtitle={`مواد ${BRANCHES[settings.branch].label}. غيّر الفرع من قسم البكالوريا`}
      />

      <section className="card space-y-3">
        <p className="text-xs text-muted">
          العلامة العظمى لكل مادة قابلة للتعديل (الافتراضي {DEFAULT_MAX}). أدخل التوزيع الرسمي لفرعك وصفّك لنتائج دقيقة، واترك العلامة فارغة للمواد التي لم تُختبر بعد.
        </p>
        <ul className="space-y-2">
          {list.map((s, i) => {
            const m = marks[i];
            return (
              <li key={s.id} className="grid grid-cols-[1fr_5.5rem_5.5rem] items-end gap-2">
                <span className="flex items-center gap-2 pb-2.5 text-sm font-medium">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <MarkField
                  label="العلامة"
                  value={m.mark}
                  max={m.max}
                  onCommit={(v) => void setMark(s.id, { mark: v })}
                />
                <NumberField label="من" value={m.max} min={1} max={2000} onCommit={(n) => void setMark(s.id, { max: n })} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card space-y-2 text-center">
        <p className="text-sm text-muted">
          المجموع ({totals.entered}/{totals.count} مواد)
        </p>
        <p className="text-4xl font-extrabold">
          {round1(totals.earned)} <span className="text-lg font-medium text-muted">/ {totals.maxAll}</span>
        </p>
        {totals.percentEntered !== null && (
          <p className="text-sm">
            نسبة المواد المُدخلة: <b>{round1(totals.percentEntered)}%</b> ({gradeLabel(totals.percentEntered)})
          </p>
        )}
        <p className="text-sm text-muted">النسبة من المجموع الكلي: {round1(pctAll)}%</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">الهدف المطلوب</h2>
        <NumberField
          label="النسبة المستهدفة من المجموع الكلي"
          unit="%"
          value={settings.targetPct}
          min={1}
          max={100}
          onCommit={(n) => void updateSettings({ targetPct: n })}
        />
        {plan.reached ? (
          <p className="text-sm font-bold text-ok">حققت هدفك فعلاً ({settings.targetPct}%)!</p>
        ) : plan.remainingCount === 0 ? (
          <p className="text-sm text-bad">أدخلت كل المواد ولم يتحقق الهدف. ينقصك {round1(plan.needed)} علامة.</p>
        ) : plan.feasible ? (
          <p className="text-sm">
            تحتاج <b>{round1(plan.needed)}</b> علامة من {plan.remainingMax} في المواد المتبقية ({plan.remainingCount} مواد)، أي بمعدل{' '}
            <b>{round1(plan.neededPct ?? 0)}%</b> فيها.
          </p>
        ) : (
          <p className="text-sm text-bad">
            الهدف غير ممكن حسابياً: تحتاج {round1(plan.needed)} علامة والمتاح في المواد المتبقية {plan.remainingMax} فقط.
          </p>
        )}
      </section>
    </div>
  );
}

/** حقل علامة يقبل الفراغ (= لم تُختبر بعد) */
function MarkField({
  label,
  value,
  max,
  onCommit,
}: {
  label: string;
  value: number | null;
  max: number;
  onCommit: (v: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step="any"
        defaultValue={value ?? ''}
        key={`${value}-${max}`}
        onBlur={(e) => {
          const t = e.target.value.trim();
          if (t === '') return value !== null ? onCommit(null) : undefined;
          const n = Number(t);
          if (Number.isFinite(n) && n !== value) onCommit(n);
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
}
