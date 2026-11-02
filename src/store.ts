import { create } from 'zustand';
import {
  db,
  type Attempt,
  type Exam,
  type Question,
  type Settings,
  type StudySession,
  type Subject,
  type Task,
} from './db';
import { DEFAULT_SETTINGS, SUBJECT_COLORS, seedIfNeeded } from './seed';
import { applyTheme } from './lib/theme';
import { beep, primeAudio } from './lib/sound';
import { notify, requestNotifyPermission } from './lib/notify';
import { modeMs, type TimerMode } from './lib/timer';
import { toDateKey } from './lib/utils';
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

interface AppState {
  ready: boolean;
  settings: Settings;
  subjects: Subject[];
  tasks: Task[];
  sessions: StudySession[];
  exams: Exam[];
  questions: Question[];
  attempts: Attempt[];
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
  removeTask: (id: number) => Promise<void>;

  addExam: (e: NewExam) => Promise<void>;
  removeExam: (id: number) => Promise<void>;

  addQuestion: (q: NewQuestion) => Promise<void>;
  removeQuestion: (id: number) => Promise<void>;
  importQuestions: (list: ExportedQuestion[]) => Promise<number>;
  recordAttempt: (q: Question, correct: boolean) => Promise<void>;

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

export const useApp = create<AppState>((set, get) => {
  const loadAll = async () => {
    const [subjects, tasks, sessions, exams, questions, attempts] = await Promise.all([
      db.subjects.toArray(),
      db.tasks.toArray(),
      db.sessions.toArray(),
      db.exams.toArray(),
      db.questions.toArray(),
      db.attempts.toArray(),
    ]);
    set({ subjects, tasks, sessions, exams, questions, attempts });
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
    timer: initialTimer(),

    init: async () => {
      await seedIfNeeded();
      const settings = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
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
      const settings = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
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
        [db.subjects, db.tasks, db.sessions, db.exams, db.questions, db.attempts],
        async () => {
          await db.subjects.delete(id);
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
      if (settings.sound) beep();
      if (finishedMode === 'focus') notify('انتهت جلسة التركيز', 'أحسنت! خذ استراحة قصيرة.');
      else notify('انتهت الاستراحة', 'هيا نبدأ جلسة تركيز جديدة.');
    },
  };
});
