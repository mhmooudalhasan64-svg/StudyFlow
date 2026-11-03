import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { useApp } from './store';
import { toDateKey } from './lib/utils';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useApp.setState({ ready: false });
  await useApp.getState().init();
});

describe('store', () => {
  it('seeds subjects, settings and sample questions on first run', () => {
    const s = useApp.getState();
    expect(s.ready).toBe(true);
    expect(s.subjects.length).toBeGreaterThan(0);
    expect(s.questions.length).toBeGreaterThan(0);
    expect(s.settings.focusMin).toBe(25);
  });

  it('adds, toggles and removes tasks', async () => {
    const { addTask, toggleTask, removeTask } = useApp.getState();
    await addTask({ title: 'مراجعة', subjectId: null, date: toDateKey(), minutes: 30 });
    let task = useApp.getState().tasks[0];
    expect(task.done).toBe(false);
    await toggleTask(task.id);
    task = useApp.getState().tasks[0];
    expect(task.done).toBe(true);
    await removeTask(task.id);
    expect(useApp.getState().tasks).toHaveLength(0);
  });

  it('records study sessions for today', async () => {
    await useApp.getState().addSession(25, null);
    const [s] = useApp.getState().sessions;
    expect(s.minutes).toBe(25);
    expect(s.dateKey).toBe(toDateKey());
  });

  it('ignores empty sessions', async () => {
    await useApp.getState().addSession(0, null);
    expect(useApp.getState().sessions).toHaveLength(0);
  });

  it('removing a subject deletes its questions but keeps tasks', async () => {
    const st = useApp.getState();
    const subject = st.subjects[0];
    const before = st.questions.filter((q) => q.subjectId === subject.id).length;
    expect(before).toBeGreaterThan(0);

    await st.addTask({ title: 'x', subjectId: subject.id, date: toDateKey(), minutes: 10 });
    await st.removeSubject(subject.id);

    const after = useApp.getState();
    expect(after.subjects.find((s) => s.id === subject.id)).toBeUndefined();
    expect(after.questions.filter((q) => q.subjectId === subject.id)).toHaveLength(0);
    expect(after.tasks[0].subjectId).toBeNull();
  });

  it('timer: start, pause and reset keep consistent state', () => {
    const { startTimer, pauseTimer, resetTimer } = useApp.getState();
    startTimer();
    expect(useApp.getState().timer.running).toBe(true);
    pauseTimer();
    const t = useApp.getState().timer;
    expect(t.running).toBe(false);
    expect(t.remainingMs).toBeLessThanOrEqual(25 * 60_000);
    resetTimer();
    expect(useApp.getState().timer.remainingMs).toBe(25 * 60_000);
  });

  it('timer completion saves one focus session and switches to a break', async () => {
    const st = useApp.getState();
    st.startTimer();
    useApp.setState({ settings: { ...st.settings, sound: false }, timer: { ...useApp.getState().timer, endAt: Date.now() - 1 } });
    await Promise.all([useApp.getState().tick(), useApp.getState().tick()]);
    const after = useApp.getState();
    expect(after.sessions).toHaveLength(1);
    expect(after.timer.mode).toBe('short');
    expect(after.timer.running).toBe(false);
    expect(after.timer.cycles).toBe(1);
  });

  it('importQuestions creates missing subjects', async () => {
    const n = await useApp.getState().importQuestions([
      { subject: 'مادة جديدة', text: 'س؟', options: ['أ', 'ب'], answerIndex: 0 },
    ]);
    expect(n).toBe(1);
    expect(useApp.getState().subjects.some((s) => s.name === 'مادة جديدة')).toBe(true);
  });
  it('setBranch adds the literary subjects and saves the choice', async () => {
    await useApp.getState().setBranch('literary', 11);
    const st = useApp.getState();
    expect(st.settings.branch).toBe('literary');
    expect(st.settings.grade).toBe(11);
    for (const name of ['التاريخ', 'الجغرافيا', 'الفلسفة']) {
      expect(st.subjects.filter((s) => s.name === name)).toHaveLength(1);
    }
    // اختيار الفرع مرة ثانية لا يكرر المواد
    await useApp.getState().setBranch('literary', 11);
    expect(useApp.getState().subjects.filter((s) => s.name === 'الفلسفة')).toHaveLength(1);
  });

  it('completing a lesson schedules its first review, reviewing advances it', async () => {
    const st = useApp.getState();
    const subjectId = st.subjects[0].id;
    expect(await st.addLessons([{ subjectId, unit: 'و1', title: 'درس 1' }, { subjectId, unit: 'و1', title: '  ' }])).toBe(1);
    const id = useApp.getState().lessons[0].id;

    await useApp.getState().toggleLesson(id);
    let l = useApp.getState().lessons[0];
    expect(l.done).toBe(true);
    expect(l.doneAt).toBe(toDateKey());
    expect(l.nextReview).not.toBeNull();
    expect(l.nextReview as string > toDateKey()).toBe(true);

    await useApp.getState().reviewLesson(id, true);
    l = useApp.getState().lessons[0];
    expect(l.step).toBe(1);
    await useApp.getState().reviewLesson(id, false);
    expect(useApp.getState().lessons[0].step).toBe(0);

    await useApp.getState().toggleLesson(id);
    l = useApp.getState().lessons[0];
    expect(l.done).toBe(false);
    expect(l.nextReview).toBeNull();
  });

  it('finishing the whole ladder clears the next review date', async () => {
    const st = useApp.getState();
    await st.updateSettings({ reviewIntervals: [1, 2] });
    await useApp.getState().addLessons([{ subjectId: st.subjects[0].id, unit: '', title: 'د' }]);
    const id = useApp.getState().lessons[0].id;
    await useApp.getState().toggleLesson(id);
    await useApp.getState().reviewLesson(id, true);
    await useApp.getState().reviewLesson(id, true);
    expect(useApp.getState().lessons[0].nextReview).toBeNull();
  });

  it('flashcards: a known card moves to a later date, an unknown one stays due', async () => {
    await useApp.getState().addCard({ subjectId: null, category: 'term', front: ' س ', back: ' ج ' });
    await useApp.getState().addCard({ subjectId: null, category: 'date', front: '', back: 'x' });
    expect(useApp.getState().cards).toHaveLength(1);
    const card = useApp.getState().cards[0];
    expect(card.front).toBe('س');
    expect(card.due).toBe(toDateKey());

    await useApp.getState().reviewCard(card.id, true);
    let c = useApp.getState().cards[0];
    expect(c.reps).toBe(1);
    expect(c.due > toDateKey()).toBe(true);

    await useApp.getState().reviewCard(card.id, false);
    c = useApp.getState().cards[0];
    expect(c.step).toBe(0);
    expect(c.due).toBe(toDateKey());
  });

  it('setMark clamps to the maximum and allows clearing', async () => {
    const id = useApp.getState().subjects[0].id;
    await useApp.getState().setMark(id, { mark: 250 });
    expect(useApp.getState().marks[0]).toEqual({ subjectId: id, mark: 100, max: 100 });
    await useApp.getState().setMark(id, { max: 60 });
    expect(useApp.getState().marks[0].mark).toBe(60);
    await useApp.getState().setMark(id, { mark: null });
    expect(useApp.getState().marks[0].mark).toBeNull();
  });

  it('saveResult stores quiz and simulator results', async () => {
    await useApp.getState().saveResult({ kind: 'simulator', subjectId: null, score: 7, total: 10, seconds: 90 });
    const [r] = useApp.getState().results;
    expect(r.score).toBe(7);
    expect(r.dateKey).toBe(toDateKey());
  });

  it('removing a subject also removes its lessons, cards and marks', async () => {
    const st = useApp.getState();
    const id = st.subjects[0].id;
    await st.addLessons([{ subjectId: id, unit: '', title: 'د' }]);
    await useApp.getState().addCard({ subjectId: id, category: 'rule', front: 'a', back: 'b' });
    await useApp.getState().setMark(id, { mark: 50 });
    await useApp.getState().removeSubject(id);
    const after = useApp.getState();
    expect(after.lessons).toHaveLength(0);
    expect(after.cards).toHaveLength(0);
    expect(after.marks).toHaveLength(0);
  });

  it('importQuestions keeps unit, year and session', async () => {
    await useApp.getState().importQuestions([
      { subject: 'الفيزياء', text: 'س؟', options: ['أ', 'ب'], answerIndex: 1, unit: 'الحركة', year: 2024, session: 'الأولى' },
    ]);
    const q = useApp.getState().questions.find((x) => x.text === 'س؟');
    expect(q?.unit).toBe('الحركة');
    expect(q?.year).toBe(2024);
    expect(q?.session).toBe('الأولى');
  });

  it('migrates old settings by filling the new fields with defaults', async () => {
    await db.settings.put({ key: 'app', theme: 'light', dailyGoalMin: 90, focusMin: 30, shortMin: 5, longMin: 15, sound: false } as never);
    await useApp.getState().init();
    const s = useApp.getState().settings;
    expect(s.theme).toBe('light');
    expect(s.branch).toBe('scientific');
    expect(s.reviewIntervals).toEqual([1, 3, 7, 14, 30]);
  });
});
