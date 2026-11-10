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
import { addDays, daysUntil, formatMinutes, toDateKey, weekdayShort } from '../lib/utils';

export default function Stats() {
  const sessions = useApp((s) => s.sessions);
  const attempts = useApp((s) => s.attempts);
  const subjects = useApp((s) => s.subjects);
  const goal = useApp((s) => s.settings.dailyGoalMin);
  const questions = useApp((s) => s.questions);
  const exams = useApp((s) => s.exams);
  const lessons = useApp((s) => s.lessons);
  const today = toDateKey();

  const data = useMemo(() => {
    const byDay = minutesByDay(sessions);
    const days = lastNDays(7);
    const values = days.map((d) => byDay[d] ?? 0);
    const totalMin = sessions.reduce((s, x) => s + x.minutes, 0);
    const streak = computeStreak(byDay);
    const correct = attempts.filter((a) => a.correct).length;
    const subjectMin = [...minutesBySubject(sessions).entries()].sort((a, b) => b[1] - a[1]);
    const acc = [...accuracyBySubject(attempts).entries()];
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const subjectStats = new Map<number, { total: number; wrong: number }>();
    const unitStats = new Map<string, { subjectId: number; unit: string; total: number; wrong: number }>();
    for (const attempt of attempts) {
      const subject = subjectStats.get(attempt.subjectId) ?? { total: 0, wrong: 0 };
      subject.total += 1;
      if (!attempt.correct) subject.wrong += 1;
      subjectStats.set(attempt.subjectId, subject);
      const unit = questionById.get(attempt.questionId)?.unit?.trim();
      if (unit) {
        const key = String(attempt.subjectId) + ':' + unit;
        const stats = unitStats.get(key) ?? { subjectId: attempt.subjectId, unit, total: 0, wrong: 0 };
        stats.total += 1;
        if (!attempt.correct) stats.wrong += 1;
        unitStats.set(key, stats);
      }
    }
    const weakSubjects = [...subjectStats.entries()]
      .filter(([, s]) => s.total >= 3 && s.wrong / s.total >= 0.35)
      .map(([id, s]) => ({ id, total: s.total, wrong: s.wrong, accuracy: Math.round(((s.total - s.wrong) / s.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy);
    const weakUnits = [...unitStats.entries()]
      .filter(([, s]) => s.total >= 3 && s.wrong / s.total >= 0.35)
      .map(([key, s]) => ({ key, ...s, accuracy: Math.round(((s.total - s.wrong) / s.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
    const weakest = weakUnits[0];
    const weakestSubject = weakSubjects[0];
    const recommendation = weakest
      ? 'ابدأ بمراجعة «' + weakest.unit + '» في مادة ' + (subjects.find((s) => s.id === weakest.subjectId)?.name ?? 'المادة') + '، ثم أعد حل أسئلة مشابهة.'
      : weakestSubject
        ? 'خصّص جلسة إضافية لمادة ' + (subjects.find((s) => s.id === weakestSubject.id)?.name ?? 'المادة') + '، وراجع الإجابات التي أخطأت فيها.'
        : 'واصل حل الأسئلة في مختلف المواد؛ ستظهر توصية محددة عندما تتوفر بيانات كافية عن كل مادة أو وحدة.';

    // مؤشر استعداد تقديري لكل امتحان قادم، وليس احتمال نجاح أو علامة متوقعة.
    const cutoff = addDays(today, -13);
    const readiness = exams.filter((exam) => exam.subjectId !== null && exam.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map((exam) => {
        const subjectId = exam.subjectId as number;
        const subjectName = subjects.find((subject) => subject.id === subjectId)?.name ?? 'المادة';
        const subjectAttempts = attempts.filter((attempt) => attempt.subjectId === subjectId);
        const accuracy = subjectAttempts.length >= 5 ? Math.round((subjectAttempts.filter((attempt) => attempt.correct).length / subjectAttempts.length) * 100) : null;
        const subjectLessons = lessons.filter((lesson) => lesson.subjectId === subjectId);
        const lessonProgress = subjectLessons.length ? Math.round((subjectLessons.filter((lesson) => lesson.done).length / subjectLessons.length) * 100) : null;
        const recentSessions = sessions.filter((session) => session.subjectId === subjectId && session.dateKey >= cutoff && session.dateKey <= today);
        const recentMinutes = recentSessions.reduce((sum, session) => sum + session.minutes, 0);
        const studyCoverage = recentSessions.length > 0 && goal > 0 ? Math.min(100, Math.round((recentMinutes / (goal * 14)) * 100)) : null;
        const indicators = [
          accuracy === null ? null : { value: accuracy, weight: 55 },
          lessonProgress === null ? null : { value: lessonProgress, weight: 30 },
          studyCoverage === null ? null : { value: studyCoverage, weight: 15 },
        ].filter((item): item is { value: number; weight: number } => item !== null);
        const totalWeight = indicators.reduce((sum, item) => sum + item.weight, 0);
        const score = indicators.length >= 2 && (accuracy !== null || lessonProgress !== null)
          ? Math.round(indicators.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight)
          : null;
        return { id: exam.id, title: exam.title, subjectName, daysLeft: daysUntil(exam.date), score, accuracy, lessonProgress, studyCoverage, confidence: indicators.length === 3 ? 'جيد' : indicators.length === 2 ? 'متوسط' : 'بيانات غير كافية' };
      });
    return {
      days,
      values,
      totalMin,
      weekMin: values.reduce((a, b) => a + b, 0),
      todayMin: byDay[toDateKey()] ?? 0,
      streak,
      subjectMin,
      acc,
      weakness: { total: attempts.length, wrong: attempts.filter((a) => !a.correct).length, weakSubjects, weakUnits, recommendation },
      readiness,
      answered: attempts.length,
      correct,
      badges: computeBadges({ totalMin, streak, answered: attempts.length, correct }),
    };
  }, [sessions, attempts, questions, subjects, exams, lessons, goal, today]);

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


      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">تحليل نقاط الضعف</h2>
          <p className="mt-1 text-xs text-muted">تحليل تلقائي لإجاباتك المسجلة، مع اقتراح ما يستحق المراجعة أولاً.</p>
        </div>
        {data.weakness.total < 3 ? (
          <div className="rounded-xl border border-line bg-base/50 p-3 text-sm text-muted">
            نحتاج إلى 3 إجابات مسجلة على الأقل حتى نبدأ بتحليل موثوق. حلّ بعض الأسئلة وسيظهر هنا ما يحتاج إلى تقوية.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-base/60 p-3"><p className="text-xs text-muted">الإجابات المحللة</p><p className="mt-1 text-xl font-extrabold">{data.weakness.total}</p></div>
              <div className="rounded-xl bg-base/60 p-3"><p className="text-xs text-muted">نسبة الإجابات الخاطئة</p><p className="mt-1 text-xl font-extrabold">{Math.round((data.weakness.wrong / data.weakness.total) * 100)}%</p></div>
            </div>
            {data.weakness.weakSubjects.length === 0 && data.weakness.weakUnits.length === 0 ? (
              <p className="rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm">أداء جيد! لا تظهر حالياً نقاط ضعف واضحة في البيانات المتاحة. استمر بحل الأسئلة للمحافظة على هذا المستوى.</p>
            ) : (
              <div className="space-y-3">
                {data.weakness.weakSubjects.length > 0 && <div>
                  <h3 className="mb-2 text-sm font-bold">مواد تحتاج إلى تركيز</h3>
                  <ul className="space-y-2">{data.weakness.weakSubjects.map((item) => <li key={item.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2 text-sm"><span className="font-semibold">{nameOf(item.id)}</span><span className="font-bold text-bad">{item.accuracy}% دقة</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/60"><div className="h-full rounded-full bg-bad" style={{ width: item.accuracy + '%' }} /></div>
                    <p className="mt-1 text-xs text-muted">{item.wrong} إجابة خاطئة من أصل {item.total}</p>
                  </li>)}</ul>
                </div>}
                {data.weakness.weakUnits.length > 0 && <div>
                  <h3 className="mb-2 text-sm font-bold">وحدات أو دروس تحتاج إلى مراجعة</h3>
                  <ul className="space-y-2">{data.weakness.weakUnits.map((item) => <li key={item.key} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 font-semibold">{item.unit}</span><span className="shrink-0 font-bold text-bad">{item.accuracy}% دقة</span></div>
                    <p className="mt-1 text-xs text-muted">{nameOf(item.subjectId)} · {item.wrong} أخطاء من {item.total} إجابات</p>
                  </li>)}</ul>
                </div>}
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm">
                  <p className="font-bold">خطوتك التالية</p><p className="mt-1 text-muted">{data.weakness.recommendation}</p>
                  <a href="#/review" className="mt-2 inline-flex text-sm font-bold text-accent underline underline-offset-4">افتح المراجعة الذكية</a>
                </div>
              </div>
            )}
          </>
        )}
        <p className="text-[11px] text-muted">يُبنى التحليل على الأسئلة التي أجبت عنها داخل التطبيق فقط. لا يستنتج مستوى الدروس التي لم تختبرها بعد.</p>
      </section>

      <section className="card space-y-3">
        <div><h2 className="font-bold">مؤشر الاستعداد للامتحانات</h2><p className="mt-1 text-xs text-muted">تقدير إرشادي يجمع أداءك في الأسئلة وإنجاز الدروس وانتظام الدراسة خلال آخر 14 يوماً. لا يمثل احتمال النجاح أو علامة مضمونة.</p></div>
        {data.readiness.length === 0 ? <Empty>أضف امتحاناً قادماً واربطه بمادة من صفحة الامتحانات لعرض مؤشر الاستعداد.</Empty> : (
          <ul className="space-y-3">{data.readiness.map((item) => (
            <li key={item.id} className="rounded-xl border border-line/70 bg-base/40 p-3">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted">{item.subjectName} · {item.daysLeft === 0 ? "الامتحان اليوم" : "باقي " + item.daysLeft + " يوم"}</p></div><div className="shrink-0 text-end"><p className="text-lg font-extrabold">{item.score === null ? "—" : item.score + "%"}</p><p className="text-[10px] text-muted">{item.confidence}</p></div></div>
              {item.score === null ? <p className="mt-2 text-xs text-muted">نحتاج إلى مؤشرين على الأقل، أحدهما أداء الأسئلة أو إنجاز الدروس. حلّ 5 أسئلة على الأقل أو حدّث تقدمك في المنهاج.</p> : (
                <><div className="mt-2 h-2 overflow-hidden rounded-full bg-line/60"><div className="h-full rounded-full bg-gradient-to-l from-accent2 to-accent" style={{ width: item.score + "%" }} /></div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">{item.accuracy !== null && <span>دقة الأسئلة: {item.accuracy}%</span>}{item.lessonProgress !== null && <span>إنجاز الدروس: {item.lessonProgress}%</span>}{item.studyCoverage !== null && <span>انتظام الدراسة: {item.studyCoverage}%</span>}</div></>
              )}
            </li>
          ))}</ul>
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
