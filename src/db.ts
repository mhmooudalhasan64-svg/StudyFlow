import Dexie, { type EntityTable } from 'dexie';

export type Branch = 'scientific' | 'literary';
export type Grade = 10 | 11 | 12;

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
  /** اسم الوحدة (اختياري) */
  unit?: string;
  /** سنة الدورة (اختياري) */
  year?: number;
  /** اسم الدورة: الأولى / الثانية / التكميلية… (اختياري) */
  session?: string;
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
  /** فرع البكالوريا المختار */
  branch: Branch;
  grade: Grade;
  /** فواصل المراجعة المتدرجة بالأيام */
  reviewIntervals: number[];
  /** النسبة المئوية المستهدفة في حاسبة العلامات */
  targetPct: number;
  /** وقت آخر نسخة احتياطية نزّلتها (لتذكيرك أسبوعياً) */
  lastBackup?: number;
  /** إخفاء شاشة الترحيب عند فتح التطبيق */
  hideIntro?: boolean;
}

/** كتاب مدرسي (البيانات الوصفية فقط؛ الملف في bookFiles) */
export interface Book {
  id: number;
  subjectId: number | null;
  title: string;
  unit: string;
  lesson: string;
  fileName: string;
  size: number;
  addedAt: number;
}

export interface BookFile {
  bookId: number;
  blob: Blob;
}

/** درس ضمن خطة إنهاء المنهاج */
export interface Lesson {
  id: number;
  subjectId: number;
  unit: string;
  title: string;
  done: boolean;
  /** تاريخ الإنجاز YYYY-MM-DD */
  doneAt: string | null;
  /** عدد المراحل المنجزة من سلّم المراجعة */
  step: number;
  /** موعد المراجعة القادمة، أو null إن اكتمل السلّم أو لم يُنجز الدرس */
  nextReview: string | null;
}

export type CardCategory = 'definition' | 'date' | 'term' | 'rule';

export interface Flashcard {
  id: number;
  subjectId: number | null;
  category: CardCategory;
  front: string;
  back: string;
  step: number;
  /** YYYY-MM-DD */
  due: string;
  /** مرات المراجعة الكلية */
  reps: number;
}

/** علامة مادة في حاسبة العلامات */
export interface Mark {
  subjectId: number;
  mark: number | null;
  max: number;
}

/** نتيجة اختبار أو امتحان تجريبي */
export interface ExamResult {
  id: number;
  kind: 'quiz' | 'simulator' | 'daily';
  subjectId: number | null;
  score: number;
  total: number;
  at: number;
  dateKey: string;
  seconds: number;
}

/** نص كتاب PDF مستخرج (ذاكرة مؤقتة محلية حتى لا يُعاد استخراجه). لا يدخل في النسخ الاحتياطي. */
export interface BookText {
  key: string;
  name: string;
  pages: string[];
  at: number;
}

class StudyDB extends Dexie {
  subjects!: EntityTable<Subject, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  sessions!: EntityTable<StudySession, 'id'>;
  exams!: EntityTable<Exam, 'id'>;
  questions!: EntityTable<Question, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  settings!: EntityTable<Settings, 'key'>;
  books!: EntityTable<Book, 'id'>;
  bookFiles!: EntityTable<BookFile, 'bookId'>;
  lessons!: EntityTable<Lesson, 'id'>;
  cards!: EntityTable<Flashcard, 'id'>;
  marks!: EntityTable<Mark, 'subjectId'>;
  results!: EntityTable<ExamResult, 'id'>;
  bookTexts!: EntityTable<BookText, 'key'>;

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
    // الإصدار 2: قسم البكالوريا (كتب، منهاج، بطاقات، علامات، نتائج)
    this.version(2).stores({
      books: '++id, subjectId',
      bookFiles: 'bookId',
      lessons: '++id, subjectId',
      cards: '++id, subjectId, due',
      marks: 'subjectId',
      results: '++id, dateKey, subjectId',
    });
    // الإصدار 3: نصوص الكتب المستخرجة (للاختبار من الكتاب دون إعادة القراءة)
    this.version(3).stores({
      bookTexts: 'key, at',
    });
  }
}

export const db = new StudyDB();
