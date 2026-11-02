import { db, type Settings } from './db';

export const SUBJECT_COLORS = [
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#f472b6',
  '#fbbf24',
  '#fb7185',
  '#60a5fa',
  '#2dd4bf',
];

export const DEFAULT_SETTINGS: Settings = {
  key: 'app',
  theme: 'dark',
  dailyGoalMin: 120,
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  sound: true,
};

const DEFAULT_SUBJECTS = [
  'العربية',
  'الإنجليزية',
  'الرياضيات',
  'الفيزياء',
  'الكيمياء',
  'علوم الحياة',
  'التربية الدينية',
];

interface SampleQuestion {
  subject: string;
  text: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

/** أسئلة تجريبية بسيطة ليجد الطالب شيئاً يبدأ به؛ يمكن حذفها أو استبدالها. */
const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    subject: 'الرياضيات',
    text: 'ما مشتق الدالة f(x) = x² ؟',
    options: ['x', '2x', 'x²', '2'],
    answerIndex: 1,
    explanation: 'مشتق x^n هو n·x^(n−1)، إذن مشتق x² هو 2x.',
  },
  {
    subject: 'الرياضيات',
    text: 'ما قيمة sin(90°) ؟',
    options: ['0', '1/2', '1', '−1'],
    answerIndex: 2,
  },
  {
    subject: 'الفيزياء',
    text: 'ما وحدة قياس القوة في النظام الدولي؟',
    options: ['جول', 'واط', 'نيوتن', 'باسكال'],
    answerIndex: 2,
  },
  {
    subject: 'الفيزياء',
    text: 'أي علاقة تعبّر عن قانون نيوتن الثاني؟',
    options: ['F = m·a', 'F = m / a', 'F = a / m', 'F = m + a'],
    answerIndex: 0,
    explanation: 'القوة المحصّلة تساوي الكتلة × التسارع.',
  },
  {
    subject: 'الكيمياء',
    text: 'ما الرمز الكيميائي لعنصر الصوديوم؟',
    options: ['S', 'Na', 'So', 'N'],
    answerIndex: 1,
  },
  {
    subject: 'الكيمياء',
    text: 'ما قيمة pH لمحلول متعادل عند 25°س؟',
    options: ['0', '5', '7', '14'],
    answerIndex: 2,
  },
  {
    subject: 'علوم الحياة',
    text: 'أي عُضيّة مسؤولة عن إنتاج معظم طاقة الخلية (ATP)؟',
    options: ['النواة', 'الميتوكوندريا', 'الريبوسوم', 'جهاز غولجي'],
    answerIndex: 1,
  },
  {
    subject: 'العربية',
    text: 'ما إعراب كلمة «الطالبُ» في جملة: جاءَ الطالبُ؟',
    options: ['مفعول به', 'فاعل مرفوع', 'مبتدأ', 'خبر'],
    answerIndex: 1,
  },
  {
    subject: 'الإنجليزية',
    text: 'Choose the correct form: She ___ to school every day.',
    options: ['go', 'goes', 'going', 'gone'],
    answerIndex: 1,
    explanation: 'ضمير الغائب المفرد (she) يأخذ -s/-es في المضارع البسيط.',
  },
];

/** يملأ قاعدة البيانات عند أول تشغيل فقط. */
export async function seedIfNeeded(): Promise<void> {
  const existing = await db.settings.get('app');
  if (existing) return;

  await db.transaction('rw', [db.settings, db.subjects, db.questions], async () => {
    await db.settings.put(DEFAULT_SETTINGS);

    const ids: Record<string, number> = {};
    for (let i = 0; i < DEFAULT_SUBJECTS.length; i++) {
      const name = DEFAULT_SUBJECTS[i];
      ids[name] = await db.subjects.add({
        name,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      });
    }

    for (const q of SAMPLE_QUESTIONS) {
      await db.questions.add({
        subjectId: ids[q.subject],
        text: q.text,
        options: q.options,
        answerIndex: q.answerIndex,
        explanation: q.explanation,
      });
    }
  });
}
