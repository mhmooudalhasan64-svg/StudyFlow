import { useMemo } from 'react';
import { Award } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle } from '../components/ui';
import {
  accuracyBySubject,
  computeBadges,
  computeStreak,
  lastNDays,
  minutesBySubject,
  minutesByDay,
} from '../lib/stats';
import { formatMinutes, toDateKey, weekdayShort } from '../lib/utils';

export default function Stats() {
  const sessions = useApp((s) => s.sessions);
  const attempts = useApp((s) => s.attempts);
  const subjects = useApp((s) => s.subjects);
  const goal = useApp((s) => s.settings.dailyGoalMin);

  const data = useMemo(() => {
    const byDay = minutesByDay(sessions);
    const days = lastNDays(7);
    const values = days.map((d) => byDay[d] ?? 0);
    const totalMin = sessions.reduce((s, x) => s + x.minutes, 0);
    const streak = computeStreak(byDay);
    const correct = attempts.filter((a) => a.correct).length;
    const subjectMin = [...minutesBySubject(sessions).entries()].sort((a, b) => b[1] - a[1]);
    const acc = [...accuracyBySubject(attempts).entries()];
    return {
      days,
      values,
      totalMin,
      weekMin: values.reduce((a, b) => a + b, 0),
      todayMin: byDay[toDateKey()] ?? 0,
      streak,
      subjectMin,
      acc,
      answered: attempts.length,
      correct,
      badges: computeBadges({ totalMin, streak, answered: attempts.length, correct }),
    };
  }, [sessions, attempts]);

  const nameOf = (id: number | null) => subjects.find((s) => s.id === id)?.name ?? 'بدون مادة';
  const colorOf = (id: number | null) => subjects.find((s) => s.id === id)?.color ?? 'rgb(var(--muted))';

  const chartMax = Math.max(goal, ...data.values, 1);
  const subjectMax = Math.max(1, ...data.subjectMin.map(([, m]) => m));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="الإحصاءات والإنجازات" subtitle="تابع تقدمك وحافظ على حماسك" />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="اليوم" value={formatMinutes(data.todayMin)} />
        <Tile label="آخر 7 أيام" value={formatMinutes(data.weekMin)} />
        <Tile label="الإجمالي" value={formatMinutes(data.totalMin)} />
        <Tile label="أيام متتالية" value={String(data.streak)} />
      </section>

      <section className="card">
        <h2 className="mb-1 font-bold">دقائق الدراسة — آخر 7 أيام</h2>
        <p className="mb-4 text-xs text-muted">الخط المتقطع يمثل هدفك اليومي ({formatMinutes(goal)})</p>
        <div className="relative flex h-44 items-end gap-2" role="img" aria-label="مخطط أعمدة لدقائق الدراسة في آخر 7 أيام">
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/60"
            style={{ bottom: `${(goal / chartMax) * 100}%` }}
          />
          {data.days.map((d, i) => {
            const v = data.values[i];
            return (
              <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-muted">{v > 0 ? v : ''}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-accent2 to-accent transition-all"
                  style={{ height: `${(v / chartMax) * 100}%`, minHeight: v > 0 ? 4 : 0 }}
                />
                <span className="text-[11px] text-muted">{weekdayShort(d)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">الوقت لكل مادة</h2>
        {data.subjectMin.length === 0 ? (
          <Empty>لا جلسات بعد. ابدأ مؤقت التركيز لتظهر الإحصاءات هنا.</Empty>
        ) : (
          <ul className="space-y-3">
            {data.subjectMin.map(([id, m]) => (
              <li key={String(id)}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{nameOf(id)}</span>
                  <span className="text-muted">{formatMinutes(m)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line/60">
                  <div className="h-full rounded-full" style={{ width: `${(m / subjectMax) * 100}%`, backgroundColor: colorOf(id) }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-bold">دقّة الأسئلة</h2>
          {data.answered > 0 && (
            <span className="text-sm text-muted">
              {data.correct}/{data.answered} إجابة صحيحة
            </span>
          )}
        </div>
        {data.acc.length === 0 ? (
          <Empty>لم تحلّ أسئلة بعد.</Empty>
        ) : (
          <ul className="space-y-3">
            {data.acc.map(([id, a]) => {
              const p = Math.round((a.correct / a.total) * 100);
              return (
                <li key={id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{nameOf(id)}</span>
                    <span className="text-muted">
                      {p}% ({a.correct}/{a.total})
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/60">
                    <div className="h-full rounded-full bg-ok" style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">الأوسمة</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.badges.map((b) => (
            <li
              key={b.id}
              className={`rounded-xl border p-3 text-center transition ${
                b.earned ? 'border-accent/60 bg-accent/10' : 'border-line opacity-50'
              }`}
            >
              <Award className={`mx-auto mb-1 ${b.earned ? 'text-accent' : 'text-muted'}`} size={24} />
              <p className="text-sm font-bold">{b.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">{b.desc}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
