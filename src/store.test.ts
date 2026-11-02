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
});
