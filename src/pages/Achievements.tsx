import { useMemo } from 'react';
import { Award, Sparkles } from 'lucide-react';
import { useApp } from '../store';
import { PageTitle } from '../components/ui';
import { computeBadges, computeStreak, minutesByDay } from '../lib/stats';
import { XP_RULES, computeXp, levelFromXp } from '../lib/xp';

export default function Achievements() {
  const sessions = useApp((s) => s.sessions);
  const attempts = useApp((s) => s.attempts);
  const lessons = useApp((s) => s.lessons);
  const cards = useApp((s) => s.cards);
  const results = useApp((s) => s.results);

  const data = useMemo(() => {
    const minutes = sessions.reduce((n, s) => n + s.minutes, 0);
    const correct = attempts.filter((a) => a.correct).length;
    const wrong = attempts.length - correct;
    const lessonsDone = lessons.filter((l) => l.done).length;
    const cardReviews = cards.reduce((n, c) => n + c.reps, 0);
    const simulators = results.filter((r) => r.kind === 'simulator').length;
    const xp = computeXp({ minutes, correct, wrong, lessonsDone, examResults: results.length, cardReviews });
    const streak = computeStreak(minutesByDay(sessions));
    return {
      level: levelFromXp(xp),
      badges: computeBadges({
        totalMin: minutes,
        streak,
        answered: attempts.length,
        correct,
        lessonsDone,
        cardReviews,
        simulators,
      }),
    };
  }, [sessions, attempts, lessons, cards, results]);

  const { level, badges } = data;
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="نظام الإنجازات" subtitle="نقاط خبرة ومستويات وشارات مقابل كل خطوة دراسية" />

      <section className="card space-y-3 text-center">
        <Sparkles className="mx-auto text-accent" size={28} />
        <p className="text-sm text-muted">مستواك</p>
        <p className="text-5xl font-extrabold">{level.level}</p>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-line/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level.progress * 100)}
          aria-label="التقدم نحو المستوى التالي"
        >
          <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent2 transition-all" style={{ width: `${level.progress * 100}%` }} />
        </div>
        <p className="text-sm text-muted">
          {level.xp} XP · يتبقى {level.ceil - level.xp} للمستوى {level.level + 1}
        </p>
      </section>

      <section className="card">
        <h2 className="mb-2 font-bold">كيف تكسب XP؟</h2>
        <ul className="grid grid-cols-1 gap-1.5 text-sm text-muted sm:grid-cols-2">
          <li>كل دقيقة دراسة: +{XP_RULES.perStudyMinute}</li>
          <li>إجابة صحيحة: +{XP_RULES.perCorrectAnswer}</li>
          <li>إجابة خاطئة (محاولة): +{XP_RULES.perWrongAnswer}</li>
          <li>درس منجز: +{XP_RULES.perLessonDone}</li>
          <li>اختبار أو امتحان تجريبي: +{XP_RULES.perExamResult}</li>
          <li>مراجعة بطاقة: +{XP_RULES.perCardReview}</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">
          الشارات ({earned}/{badges.length})
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {badges.map((b) => (
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
