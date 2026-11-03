import { useMemo, useState } from 'react';
import { Copy, Printer } from 'lucide-react';
import { useApp } from '../store';
import { Empty, PageTitle } from '../components/ui';
import { buildReport, reportToText } from '../lib/report';
import { addDays, formatMinutes, toDateKey, weekdayShort } from '../lib/utils';

export default function Reports() {
  const sessions = useApp((s) => s.sessions);
  const attempts = useApp((s) => s.attempts);
  const lessons = useApp((s) => s.lessons);
  const results = useApp((s) => s.results);
  const subjects = useApp((s) => s.subjects);

  const [weeksAgo, setWeeksAgo] = useState(0);
  const [copied, setCopied] = useState(false);

  const end = addDays(toDateKey(), -7 * weeksAgo);
  const report = useMemo(
    () => buildReport({ sessions, attempts, lessons, results }, end),
    [sessions, attempts, lessons, results, end],
  );
  const nameOf = (id: number | null) => subjects.find((s) => s.id === id)?.name ?? 'بدون مادة';
  const colorOf = (id: number | null) => subjects.find((s) => s.id === id)?.color ?? 'rgb(var(--muted))';
  const max = Math.max(1, ...report.minutesPerDay);
  const subjMax = Math.max(1, ...report.bySubject.map((s) => s.minutes));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportToText(report, nameOf));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert('تعذّر النسخ. استخدم زر الطباعة.');
    }
  };

  const empty = report.totalMin === 0 && report.results.length === 0 && report.answered === 0 && report.lessonsDone === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle
        title="تقارير الدراسة"
        subtitle={`${report.from} → ${report.to}`}
        action={
          <div className="flex gap-2 print:hidden">
            <button type="button" className="btn btn-ghost !px-3" onClick={() => void copy()} aria-label="نسخ التقرير">
              <Copy size={16} /> {copied ? 'تم النسخ' : 'نسخ'}
            </button>
            <button type="button" className="btn btn-ghost !px-3" onClick={() => window.print()} aria-label="طباعة التقرير">
              <Printer size={16} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 print:hidden" role="group" aria-label="الفترة">
        <button type="button" aria-pressed={weeksAgo === 0} className={`btn ${weeksAgo === 0 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setWeeksAgo(0)}>
          آخر 7 أيام
        </button>
        <button type="button" aria-pressed={weeksAgo === 1} className={`btn ${weeksAgo === 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setWeeksAgo(1)}>
          الأسبوع الذي قبله
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="ساعات التركيز" value={formatMinutes(report.totalMin)} />
        <Tile label="الجلسات" value={String(report.sessionCount)} />
        <Tile label="الدروس المنجزة" value={String(report.lessonsDone)} />
        <Tile label="الأسئلة الصحيحة" value={`${report.correct}/${report.answered}`} />
      </section>

      {empty ? (
        <Empty>لا نشاط في هذه الفترة.</Empty>
      ) : (
        <>
          <section className="card">
            <h2 className="mb-1 font-bold">التركيز اليومي</h2>
            <p className="mb-4 text-xs text-muted">
              {report.activeDays} أيام نشطة · المعدل {formatMinutes(report.avgPerActiveDay)} لكل يوم دراسة
            </p>
            <div className="flex h-36 items-end gap-2" role="img" aria-label="مخطط أعمدة للتركيز اليومي">
              {report.days.map((d, i) => (
                <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-muted">{report.minutesPerDay[i] || ''}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-accent2 to-accent"
                    style={{ height: `${(report.minutesPerDay[i] / max) * 100}%`, minHeight: report.minutesPerDay[i] > 0 ? 4 : 0 }}
                  />
                  <span className="text-[11px] text-muted">{weekdayShort(d)}</span>
                </div>
              ))}
            </div>
          </section>

          {report.bySubject.length > 0 && (
            <section className="card">
              <h2 className="mb-3 font-bold">المواد</h2>
              <ul className="space-y-3">
                {report.bySubject.map((s) => (
                  <li key={String(s.subjectId)}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{nameOf(s.subjectId)}</span>
                      <span className="text-muted">{formatMinutes(s.minutes)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line/60">
                      <div className="h-full rounded-full" style={{ width: `${(s.minutes / subjMax) * 100}%`, backgroundColor: colorOf(s.subjectId) }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.results.length > 0 && (
            <section className="card">
              <h2 className="mb-3 font-bold">نتائج الاختبارات</h2>
              <ul className="space-y-2 text-sm">
                {report.results.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-base/40 px-3 py-2">
                    <span>
                      {nameOf(r.subjectId)} <span className="chip">{r.kind === 'simulator' ? 'امتحان تجريبي' : 'اختبار'}</span>
                    </span>
                    <span className="font-bold">
                      {r.score}/{r.total} · {r.total ? Math.round((r.score / r.total) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
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
