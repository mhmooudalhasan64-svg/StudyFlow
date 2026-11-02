import Dexie, { type EntityTable } from 'dexie';

export interface Subject {
  id: number;
  name: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  subjectId: number | null;
  /** YYYY-MM-DD */
  date: string;
  minutes: number;
  done: boolean;
}

export interface StudySession {
  id: number;
  subjectId: number | null;
  startedAt: number;
  minutes: number;
  dateKey: string;
}

export interface Exam {
  id: number;
  title: string;
  subjectId: number | null;
  /** YYYY-MM-DD */
  date: string;
}

export interface Question {
  id: number;
  subjectId: number;
  text: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface Attempt {
  id: number;
  questionId: number;
  subjectId: number;
  correct: boolean;
  at: number;
  dateKey: string;
}

export interface Settings {
  key: 'app';
  theme: 'dark' | 'light';
  dailyGoalMin: number;
  focusMin: number;
  shortMin: number;
  longMin: number;
  sound: boolean;
}

class StudyDB extends Dexie {
  subjects!: EntityTable<Subject, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  sessions!: EntityTable<StudySession, 'id'>;
  exams!: EntityTable<Exam, 'id'>;
  questions!: EntityTable<Question, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  settings!: EntityTable<Settings, 'key'>;

  constructor() {
    super('studyflow');
    this.version(1).stores({
      subjects: '++id',
      tasks: '++id, date, subjectId',
      sessions: '++id, dateKey, subjectId',
      exams: '++id, date',
      questions: '++id, subjectId',
      attempts: '++id, subjectId, dateKey',
      settings: 'key',
    });
  }
}

export const db = new StudyDB();
