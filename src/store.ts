import { create } from 'zustand';
import {
  db,
  type Attempt,
  type Book,
  type Branch,
  type CardCategory,
  type Exam,
  type ExamResult,
  type Flashcard,
  type Grade,
  type Lesson,
  type Mark,
  type Question,
  type Settings,
  type StudySession,
  type Subject,
  type Task,
} from './db';
import { DEFAULT_SETTINGS, SUBJECT_COLORS, seedIfNeeded } from './seed';
import { applyTheme } from './lib/theme';
import { playSound, primeAudio } from './lib/sound';
import { notify, requestNotifyPermission } from './lib/notify';
import { modeMs, type TimerMode } from './lib/timer';
import { toDateKey } from './lib/utils';
import { cardDue, nextStep, sanitizeIntervals, scheduleNext } from './lib/spaced';
import { DEFAULT_MAX } from './lib/calc';
import { missingBranchSubjects } from './lib/bac';
import { importBackup as writeBackup, parseBackup } from './lib/backup';
import type { ExportedQuestion } from './lib/questionsIO';

export interface TimerState {
  mode: TimerMode;
  running: boolean;
  endAt: number | null;
  remainingMs: number;
  subjectId: number | null;
  cycles: number;
}

type NewTask = Omit<Task, 'id' | 'done'>;
type NewExam = Omit<Exam, 'id'>;
type NewQuestion = Omit<Question, 'id'>;
type NewResult = Omit<ExamResult, 'id' | 'at' | 'dateKey'>;
export interface NewBook {
  subjectId: number | null;
  title: string;
  unit: string;
  lesson: string;
}
export interface NewLesson {
  subjectId: number;
  unit: string;
  title: string;
}
export interface NewCard {
  subjectId: number | null;
  category: CardCategory;
  front: string;
  back: string;
}

interface AppState {
  ready: boolean;
  settings: Settings;
  subjects: Subject[];
  tasks: Task[];
  sessions: StudySession[];
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
  books: Book[];
  lessons: Lesson[];
  cards: Flashcard[];
  marks: Mark[];
  results: ExamResult[];
  timer: TimerState;

  init: () => Promise<void>;
  updateSettings: (patch: Partial<Omit<Settings, 'key'>>) => Promise<void>;
  resetAll: () => Promise<void>;

  addSubject: (name: string, color: string) => Promise<void>;
  removeSubject: (id: number) => Promise<void>;

  addTask: (t: NewTask) => Promise<void>;
  addTasks: (list: NewTask[]) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  moveTask: (id: number, date: string) => Promise<void>;
  moveTasks: (moves: { id: number; date: string }[]) => Promise<void>;
  removeTask: (id: number) => Promise<void>;

  addExam: (e: NewExam) => Promise<void>;
  removeExam: (id: number) => Promise<void>;

  addQuestion: (q: NewQuestion) => Promise<void>;
  removeQuestion: (id: number) => Promise<void>;
  importQuestions: (list: ExportedQuestion[]) => Promise<number>;
  recordAttempt: (q: Question, correct: boolean) => Promise<void>;
  saveResult: (r: NewResult) => Promise<void>;

  setBranch: (branch: Branch, grade: Grade) => Promise<void>;

  addBook: (file: File, meta: NewBook) => Promise<void>;
  removeBook: (id: number) => Promise<void>;
  getBookBlob: (id: number) => Promise<Blob | null>;

  addLessons: (list: NewLesson[]) => Promise<number>;
  toggleLesson: (id: number) => Promise<void>;
  reviewLesson: (id: number, remembered: boolean) => Promise<void>;
  removeLesson: (id: number) => Promise<void>;

  addCard: (c: NewCard) => Promise<void>;
  reviewCard: (id: number, known: boolean) => Promise<void>;
  removeCard: (id: number) => Promise<void>;

  setMark: (subjectId: number, patch: Partial<Omit<Mark, 'subjectId'>>) => Promise<void>;

  importBackupText: (json: string) => Promise<void>;

  addSession: (minutes: number, subjectId: number | null) => Promise<void>;

  setTimerSubject: (id: number | null) => void;
  setMode: (mode: TimerMode) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  finishEarly: () => Promise<void>;
  tick: () => Promise<void>;
}

const initialTimer = (s: Settings = DEFAULT_SETTINGS): TimerState => ({
  mode: 'focus',
  running: false,
  endAt: null,
  remainingMs: modeMs('focus', s),
  subjectId: null,
  cycles: 0,
});

/** يدمج الإعدادات المخزنة مع الافتراضية (لإضافة حقول الإصدارات الجديدة) */
async function readSettings(): Promise<Settings> {
  const stored = await db.settings.get('app');
  const merged: Settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}), key: 'app' };
  merged.reviewIntervals = sanitizeIntervals(merged.reviewIntervals);
  return merged;
}

export const useApp = create<AppState>((set, get) => {
  const loadAll = async () => {
    const [subjects, tasks, sessions, exams, questions, attempts, books, lessons, cards, marks, results] =
      await Promise.all([
        db.subjects.toArray(),
        db.tasks.toArray(),
        db.sessions.toArray(),
        db.exams.toArray(),
        db.questions.toArray(),
        db.attempts.toArray(),
        db.books.toArray(),
        db.lessons.toArray(),
        db.cards.toArray(),
        db.marks.toArray(),
        db.results.toArray(),
      ]);
    set({ subjects, tasks, sessions, exams, questions, attempts, books, lessons, cards, marks, results });
  };

  return {
    ready: false,
    settings: DEFAULT_SETTINGS,
    subjects: [],
    tasks: [],
    sessions: [],
    exams: [],
    questions: [],
    attempts: [],
    books: [],
    lessons: [],
    cards: [],
    marks: [],
    results: [],
    timer: initialTimer(),

    init: async () => {
      await seedIfNeeded();
      const settings = await readSettings();
      await loadAll();
      applyTheme(settings.theme);
      set({ settings, timer: initialTimer(settings), ready: true });
    },

    updateSettings: async (patch) => {
      const old = get().settings;
      const next: Settings = { ...old, ...patch };
      await db.settings.put(next);
      const t = get().timer;
      // إن كان المؤقت متوقفاً عند المدة الكاملة نحدّثها بالمدة الجديدة
      const wasFull = !t.running && t.remainingMs === modeMs(t.mode, old);
      set({
        settings: next,
        timer: wasFull ? { ...t, remainingMs: modeMs(t.mode, next) } : t,
      });
      applyTheme(next.theme);
    },

    resetAll: async () => {
      for (const table of db.tables) await table.clear();
      await seedIfNeeded();
      const settings = await readSettings();
      await loadAll();
      applyTheme(settings.theme);
      set({ settings, timer: initialTimer(settings) });
    },

    addSubject: async (name, color) => {
      const n = name.trim();
      if (!n) return;
      await db.subjects.add({ name: n, color });
      await loadAll();
    },

    removeSubject: async (id) => {
      await db.transaction(
        'rw',
        [
          db.subjects,
          db.tasks,
          db.sessions,
          db.exams,
          db.questions,
          db.attempts,
          db.books,
          db.bookFiles,
          db.lessons,
          db.cards,
          db.marks,
          db.results,
        ],
        async () => {
          await db.subjects.delete(id);
          const bookIds = await db.books.where('subjectId').equals(id).primaryKeys();
          await db.bookFiles.bulkDelete(bookIds);
          await db.books.bulkDelete(bookIds);
          await db.lessons.where('subjectId').equals(id).delete();
          await db.cards.where('subjectId').equals(id).delete();
          await db.marks.delete(id);
          await db.results.where('subjectId').equals(id).modify({ subjectId: null });
          await db.tasks.toCollection().filter((t) => t.subjectId === id).modify({ subjectId: null });
          await db.sessions.toCollection().filter((s) => s.subjectId === id).modify({ subjectId: null });
          await db.exams.toCollection().filter((e) => e.subjectId === id).modify({ subjectId: null });
          await db.questions.where('subjectId').equals(id).delete();
          await db.attempts.where('subjectId').equals(id).delete();
        },
      );
      const t = get().timer;
      if (t.subjectId === id) set({ timer: { ...t, subjectId: null } });
      await loadAll();
    },

    addTask: async (t) => {
      await db.tasks.add({ ...t, title: t.title.trim(), done: false });
      await loadAll();
    },

    addTasks: async (list) => {
      if (list.length === 0) return;
      await db.tasks.bulkAdd(list.map((t) => ({ ...t, title: t.title.trim(), done: false })));
      await loadAll();
    },

    toggleTask: async (id) => {
      const task = await db.tasks.get(id);
      if (!task) return;
      await db.tasks.update(id, { done: !task.done });
      await loadAll();
    },

    moveTask: async (id, date) => {
      await db.tasks.update(id, { date });
      await loadAll();
    },

    moveTasks: async (moves) => {
      if (moves.length === 0) return;
      await db.transaction('rw', db.tasks, async () => {
        for (const m of moves) await db.tasks.update(m.id, { date: m.date });
      });
      await loadAll();
    },

    removeTask: async (id) => {
      await db.tasks.delete(id);
      await loadAll();
    },

    addExam: async (e) => {
      await db.exams.add({ ...e, title: e.title.trim() });
      await loadAll();
    },

    removeExam: async (id) => {
      await db.exams.delete(id);
      await loadAll();
    },

    addQuestion: async (q) => {
      await db.questions.add(q);
      await loadAll();
    },

    removeQuestion: async (id) => {
      await db.questions.delete(id);
      await loadAll();
    },

    importQuestions: async (list) => {
      let subjects = get().subjects;
      let count = 0;
      for (const item of list) {
        const name = item.subject.trim();
        let subject = subjects.find((s) => s.name === name);
        if (!subject) {
          const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
          const id = await db.subjects.add({ name, color });
          subject = { id, name, color };
          subjects = [...subjects, subject];
        }
        await db.questions.add({
          subjectId: subject.id,
          text: item.text,
          options: item.options,
          answerIndex: item.answerIndex,
          explanation: item.explanation,
          unit: item.unit,
          year: item.year,
          session: item.session,
        });
        count++;
      }
      await loadAll();
      return count;
    },

    recordAttempt: async (q, correct) => {
      await db.attempts.add({
        questionId: q.id,
        subjectId: q.subjectId,
        correct,
        at: Date.now(),
        dateKey: toDateKey(),
      });
      await loadAll();
    },

    saveResult: async (r) => {
      await db.results.add({ ...r, at: Date.now(), dateKey: toDateKey() });
      await loadAll();
    },

    // ---------- قسم البكالوريا ----------

    setBranch: async (branch, grade) => {
      const missing = missingBranchSubjects(get().subjects, branch);
      let n = get().subjects.length;
      for (const name of missing) {
        await db.subjects.add({ name, color: SUBJECT_COLORS[n % SUBJECT_COLORS.length] });
        n++;
      }
      await get().updateSettings({ branch, grade });
      await loadAll();
    },

    // ---------- مكتبة الكتب ----------

    addBook: async (file, meta) => {
      const title = meta.title.trim() || file.name.replace(/\.pdf$/i, '');
      await db.transaction('rw', [db.books, db.bookFiles], async () => {
        const id = await db.books.add({
          subjectId: meta.subjectId,
          title,
          unit: meta.unit.trim(),
          lesson: meta.lesson.trim(),
          fileName: file.name,
          size: file.size,
          addedAt: Date.now(),
        });
        await db.bookFiles.put({ bookId: id, blob: file });
      });
      await loadAll();
    },

    removeBook: async (id) => {
      await db.transaction('rw', [db.books, db.bookFiles], async () => {
        await db.books.delete(id);
        await db.bookFiles.delete(id);
      });
      await loadAll();
    },

    getBookBlob: async (id) => (await db.bookFiles.get(id))?.blob ?? null,

    // ---------- خطة إنهاء المنهاج والمراجعة ----------

    addLessons: async (list) => {
      const rows: Omit<Lesson, 'id'>[] = list
        .map((l) => ({ ...l, unit: l.unit.trim(), title: l.title.trim() }))
        .filter((l) => l.title)
        .map((l) => ({ ...l, done: false, doneAt: null, step: 0, nextReview: null }));
      if (rows.length === 0) return 0;
      await db.lessons.bulkAdd(rows as Lesson[]);
      await loadAll();
      return rows.length;
    },

    toggleLesson: async (id) => {
      const lesson = await db.lessons.get(id);
      if (!lesson) return;
      if (lesson.done) {
        await db.lessons.update(id, { done: false, doneAt: null, step: 0, nextReview: null });
      } else {
        const today = toDateKey();
        const intervals = sanitizeIntervals(get().settings.reviewIntervals);
        await db.lessons.update(id, {
          done: true,
          doneAt: today,
          step: 0,
          nextReview: scheduleNext(today, intervals, 0),
        });
      }
      await loadAll();
    },

    reviewLesson: async (id, remembered) => {
      const lesson = await db.lessons.get(id);
      if (!lesson || !lesson.done) return;
      const today = toDateKey();
      const intervals = sanitizeIntervals(get().settings.reviewIntervals);
      const step = nextStep(lesson.step, remembered);
      await db.lessons.update(id, { step, nextReview: scheduleNext(today, intervals, step) });
      await loadAll();
    },

    removeLesson: async (id) => {
      await db.lessons.delete(id);
      await loadAll();
    },

    // ---------- البطاقات التعليمية ----------

    addCard: async (c) => {
      const front = c.front.trim();
      const back = c.back.trim();
      if (!front || !back) return;
      await db.cards.add({
        subjectId: c.subjectId,
        category: c.category,
        front,
        back,
        step: 0,
        due: toDateKey(),
        reps: 0,
      } as Flashcard);
      await loadAll();
    },

    reviewCard: async (id, known) => {
      const card = await db.cards.get(id);
      if (!card) return;
      const today = toDateKey();
      const intervals = sanitizeIntervals(get().settings.reviewIntervals);
      const step = nextStep(card.step, known);
      await db.cards.update(id, {
        step,
        reps: card.reps + 1,
        due: known ? cardDue(today, intervals, step) : today,
      });
      await loadAll();
    },

    removeCard: async (id) => {
      await db.cards.delete(id);
      await loadAll();
    },

    // ---------- حاسبة العلامات ----------

    setMark: async (subjectId, patch) => {
      const cur = (await db.marks.get(subjectId)) ?? { subjectId, mark: null, max: DEFAULT_MAX };
      const max = patch.max !== undefined ? Math.max(1, patch.max) : cur.max;
      let mark = patch.mark !== undefined ? patch.mark : cur.mark;
      if (mark !== null) mark = Math.min(Math.max(0, mark), max);
      await db.marks.put({ subjectId, mark, max });
      await loadAll();
    },

    // ---------- النسخ الاحتياطي ----------

    importBackupText: async (json) => {
      const file = parseBackup(json);
      await writeBackup(file);
      const settings = await readSettings();
      await loadAll();
      applyTheme(settings.theme);
      set({ settings, timer: initialTimer(settings) });
    },

    addSession: async (minutes, subjectId) => {
      if (minutes <= 0) return;
      await db.sessions.add({
        subjectId,
        startedAt: Date.now() - minutes * 60_000,
        minutes,
        dateKey: toDateKey(),
      });
      await loadAll();
    },

    // ---------- المؤقت ----------

    setTimerSubject: (id) => set({ timer: { ...get().timer, subjectId: id } }),

    setMode: (mode) => {
      const { timer, settings } = get();
      set({
        timer: { ...timer, mode, running: false, endAt: null, remainingMs: modeMs(mode, settings) },
      });
    },

    startTimer: () => {
      const { timer, settings } = get();
      if (timer.running) return;
      primeAudio();
      requestNotifyPermission();
      const remaining = timer.remainingMs > 0 ? timer.remainingMs : modeMs(timer.mode, settings);
      set({
        timer: { ...timer, running: true, endAt: Date.now() + remaining, remainingMs: remaining },
      });
    },

    pauseTimer: () => {
      const { timer } = get();
      if (!timer.running || timer.endAt === null) return;
      set({
        timer: {
          ...timer,
          running: false,
          endAt: null,
          remainingMs: Math.max(0, timer.endAt - Date.now()),
        },
      });
    },

    resetTimer: () => {
      const { timer, settings } = get();
      set({
        timer: { ...timer, running: false, endAt: null, remainingMs: modeMs(timer.mode, settings) },
      });
    },

    finishEarly: async () => {
      const { timer, settings } = get();
      if (timer.mode === 'focus') {
        const total = modeMs('focus', settings);
        const remaining =
          timer.running && timer.endAt !== null
            ? Math.max(0, timer.endAt - Date.now())
            : timer.remainingMs;
        const elapsedMin = Math.floor((total - remaining) / 60_000);
        if (elapsedMin >= 1) await get().addSession(elapsedMin, timer.subjectId);
      }
      get().resetTimer();
    },

    tick: async () => {
      const { timer, settings } = get();
      if (!timer.running || timer.endAt === null || Date.now() < timer.endAt) return;

      // نوقف المؤقت فوراً (قبل أي await) كي لا تُحتسب الجلسة مرتين
      const finishedMode = timer.mode;
      let cycles = timer.cycles;
      let nextMode: TimerMode = 'focus';
      if (finishedMode === 'focus') {
        cycles += 1;
        nextMode = cycles % 4 === 0 ? 'long' : 'short';
      }
      set({
        timer: {
          ...timer,
          mode: nextMode,
          running: false,
          endAt: null,
          remainingMs: modeMs(nextMode, settings),
          cycles,
        },
      });

      if (finishedMode === 'focus') await get().addSession(settings.focusMin, timer.subjectId);
      if (settings.sound) playSound(settings.soundKind);
      if (finishedMode === 'focus') notify('انتهت جلسة التركيز', 'أحسنت! خذ استراحة قصيرة.');
      else notify('انتهت الاستراحة', 'هيا نبدأ جلسة تركيز جديدة.');
    },
  };
});
