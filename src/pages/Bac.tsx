import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Youtube,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  Database,
  FileBarChart,
  Layers,
  ListChecks,
  Repeat,
  Timer as TimerIcon,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../store';
import { PageTitle } from '../components/ui';
import { BRANCHES, BRANCH_LIST, GRADES, branchSubjects, missingBranchSubjects } from '../lib/bac';
import type { Branch, Grade } from '../db';

const FEATURES: { href: string; label: string; desc: string; Icon: LucideIcon }[] = [
  { href: '#/library', label: 'مكتبة الكتب', desc: 'كتب PDF حسب المادة والوحدة والدرس', Icon: BookOpen },
  { href: '#/youtube', label: 'فيديوهات YouTube', desc: 'شاهد الدروس واسأل AVORA عن محتواها', Icon: Youtube },
  { href: '#/quiz', label: 'بنك الأسئلة والاختبارات', desc: 'دورات سابقة واختبارات بتصحيح فوري', Icon: ListChecks },
  { href: '#/curriculum', label: 'خطة إنهاء المنهاج', desc: 'المنجز والمتبقي ونسبة كل مادة', Icon: CalendarCheck },
  { href: '#/review', label: 'المراجعة الذكية', desc: 'تذكير بالدروس بمواعيد متدرجة', Icon: Repeat },
  { href: '#/cards', label: 'البطاقات التعليمية', desc: 'سؤال وجواب للتعريفات والتواريخ', Icon: Layers },
  { href: '#/simulator', label: 'محاكي الامتحان', desc: 'نموذج بوقت محدد ونتيجة مفصلة', Icon: TimerIcon },
  { href: '#/calc', label: 'حاسبة العلامات', desc: 'المجموع والنسبة والهدف المطلوب', Icon: Calculator },
  { href: '#/achievements', label: 'الإنجازات', desc: 'XP ومستويات وشارات', Icon: Award },
  { href: '#/reports', label: 'تقارير الدراسة', desc: 'تقرير أسبوعي بساعات التركيز', Icon: FileBarChart },
  { href: '#/settings', label: 'البيانات دون إنترنت', desc: 'نسخ احتياطي واستعادة وحالة التخزين', Icon: Database },
];

export default function Bac() {
  const settings = useApp((s) => s.settings);
  const subjects = useApp((s) => s.subjects);
  const lessons = useApp((s) => s.lessons);
  const questions = useApp((s) => s.questions);
  const books = useApp((s) => s.books);
  const cards = useApp((s) => s.cards);
  const attempts = useApp((s) => s.attempts);
  const setBranch = useApp((s) => s.setBranch);

  const [view, setView] = useState<Branch>(settings.branch);
  const [grade, setGrade] = useState<Grade>(settings.grade);

  const list = useMemo(() => branchSubjects(subjects, view), [subjects, view]);
  const missing = useMemo(() => missingBranchSubjects(subjects, view), [subjects, view]);
  const isCurrent = settings.branch === view;
  const branchSubjectIds = new Set(list.map((subject) => subject.id));
  const branchLessons = lessons.filter((lesson) => branchSubjectIds.has(lesson.subjectId));
  const completedLessons = branchLessons.filter((lesson) => lesson.done).length;
  const curriculumProgress = branchLessons.length
    ? Math.round((completedLessons / branchLessons.length) * 100)
    : null;
  const branchAttempts = attempts.filter((attempt) => branchSubjectIds.has(attempt.subjectId));
  const correctAttempts = branchAttempts.filter((attempt) => attempt.correct).length;
  const quizAccuracy = branchAttempts.length
    ? Math.round((correctAttempts / branchAttempts.length) * 100)
    : null;
  const readiness = curriculumProgress !== null && branchAttempts.length >= 5
    ? Math.round(curriculumProgress * 0.65 + (quizAccuracy ?? 0) * 0.35)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="البكالوريا السورية" subtitle="قسم مستقل للفرع العلمي والأدبي، اختر فرعك وصفّك" />

      <section className="card space-y-4">
        <div role="tablist" aria-label="الفرع" className="grid grid-cols-2 gap-2">
          {BRANCH_LIST.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={view === b.id}
              onClick={() => setView(b.id)}
              className={`btn ${view === b.id ? 'btn-primary' : 'btn-ghost'}`}
            >
              {b.label}
              {settings.branch === b.id && <CheckCircle2 size={15} aria-label="فرعك الحالي" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="bac-grade">
              الصف الدراسي
            </label>
            <select
              id="bac-grade"
              className="input"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value) as Grade)}
            >
              {GRADES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isCurrent && grade === settings.grade && missing.length === 0}
            onClick={() => void setBranch(view, grade)}
          >
            {isCurrent ? 'حفظ الصف' : `اعتمد ${BRANCHES[view].label}`}
          </button>
        </div>
        {missing.length > 0 && (
          <p className="text-xs text-muted">
            ستُضاف المواد التالية عند الاعتماد: {missing.join('، ')}
          </p>
        )}
      </section>

      <section className="card space-y-3 border-accent/40">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-accent" />
          <div>
            <h2 className="font-bold">مؤشر الجاهزية للبكالوريا</h2>
            <p className="text-xs text-muted">تقدير إرشادي من إنجاز المنهاج ونتائج الأسئلة، وليس علامة رسمية.</p>
          </div>
        </div>
        {readiness === null ? (
          <div className="rounded-xl border border-line/70 bg-base/40 p-3">
            <p className="font-semibold">نحتاج بيانات أكثر لحساب المؤشر</p>
            <p className="mt-1 text-sm text-muted">
              {curriculumProgress === null
                ? "أضف دروس المنهاج وحدّد ما أنجزته."
                : `أنجزت ${completedLessons} من ${branchLessons.length} درسًا. أجب عن ${Math.max(0, 5 - branchAttempts.length)} أسئلة إضافية على الأقل لتفعيل تقدير دقة الإجابات.`}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-line/70 bg-base/40 p-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-accent text-2xl font-extrabold">
              {readiness}%
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{readiness >= 80 ? "تقدّم قوي" : readiness >= 60 ? "تقدّم جيد، واصل" : "هناك مجال واضح للتحسّن"}</p>
              <p className="mt-1 text-xs text-muted">65٪ إنجاز المنهاج · 35٪ دقة الإجابات</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-base/40 p-3">
            <p className="text-xs text-muted">إنجاز الدروس</p>
            <p className="mt-1 text-xl font-bold">{curriculumProgress === null ? "—" : `${curriculumProgress}%`}</p>
            <p className="text-[11px] text-muted">{completedLessons} من {branchLessons.length} درس</p>
          </div>
          <div className="rounded-xl bg-base/40 p-3">
            <p className="text-xs text-muted">دقة الإجابات</p>
            <p className="mt-1 text-xl font-bold">{quizAccuracy === null ? "—" : `${quizAccuracy}%`}</p>
            <p className="text-[11px] text-muted">{correctAttempts} صحيحة من {branchAttempts.length}</p>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">مواد {BRANCHES[view].label}</h2>
        <ul className="space-y-2">
          {BRANCHES[view].subjects.map((name) => {
            const s = list.find((x) => x.name === name);
            if (!s)
              return (
                <li key={name} className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2 text-sm text-muted">
                  <span>{name}</span>
                  <span className="chip">غير مضافة</span>
                </li>
              );
            const ls = lessons.filter((l) => l.subjectId === s.id);
            const done = ls.filter((l) => l.done).length;
            const pct = ls.length ? Math.round((done / ls.length) * 100) : 0;
            return (
              <li key={s.id} className="rounded-xl border border-line/70 bg-base/40 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="text-xs text-muted">
                    {questions.filter((q) => q.subjectId === s.id).length} سؤال ·{' '}
                    {books.filter((b) => b.subjectId === s.id).length} كتاب ·{' '}
                    {cards.filter((c) => c.subjectId === s.id).length} بطاقة
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                    <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent2" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-end text-[11px] text-muted">
                    {ls.length ? `${done}/${ls.length} درس` : 'لا دروس بعد'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map(({ href, label, desc, Icon }) => (
          <a key={href} href={href} className="card flex items-center gap-3 transition hover:border-accent">
            <Icon size={22} className="shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="font-bold">{label}</p>
              <p className="text-xs text-muted">{desc}</p>
            </div>
          </a>
        ))}
      </section>
    </div>
  );
}
