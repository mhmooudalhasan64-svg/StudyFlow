export type DalilMode = 'study' | 'daily' | 'creative' | 'mixed' | 'general';

export interface DalilContextInput {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  subject?: string;
  style?: string;
  profile?: string;
}

export interface DalilContext {
  mode: DalilMode;
  fatigueSignal: boolean;
  prompt: string;
}

const STUDY_TERMS = /بكالوريا|امتحان|اختبار|درس|محاضرة|منهاج|مادة\s|اشرح|فسّر|لخّص|تلخيص|بطاقات|مراجعة|حل\s+(?:المسألة|السؤال|التمرين)|معادلة|قانون|قاعدة|فلسفة|رياضيات|فيزياء|كيمياء|تاريخ|جغرافيا|نحو|إعراب/i;
const DAILY_TERMS = /مهمة|مهام|موعد|مواعيد|جدول|نظّم|رتّب|تذكير|رسالة|اكتب\s+لي|بريد|اجتماع|شراء|ميزانية|مصروف|رحلة|مشوار|عمل|مشروع|خطة\s+يومية/i;
const CREATIVE_TERMS = /فكرة|ابتكر|تصميم|شعار|اسم\s+مشروع|سيناريو|قصة|محتوى|إعلان|حل\s+إبداعي/i;
const FATIGUE_TERMS = /تعبان|تعبانة|مرهق|مرهقة|مجهد|مجهدة|نعسان|نعسانة|مضغوط|مضغوطة|متوتر|متوترة|قلقان|قلقانة|زهقت|ما\s+عم\s+قدر\s+ركّز|ما\s+عم\s+قدر\s+ركز|ما\s+عاد\s+فيي|منهك|منهكة|overwhelmed|exhausted|stressed|疲/i;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')) ?? []).length;
}

/** Classifies intent from recent user turns; it does not diagnose mental or emotional state. */
export function buildDalilContext(input: DalilContextInput): DalilContext {
  const recent = input.messages.slice(-8);
  const userTurns = recent.filter((message) => message.role === 'user').slice(-5);
  const latest = [...userTurns].reverse().find((message) => message.content.trim())?.content ?? '';
  const recentText = userTurns.map((message) => message.content).join('\n').slice(-5000);
  const studyScore = countMatches(latest, STUDY_TERMS) + (input.subject ? 2 : 0) + (input.style && input.style !== 'normal' ? 1 : 0);
  const dailyScore = countMatches(latest, DAILY_TERMS);
  const creativeScore = countMatches(latest, CREATIVE_TERMS);
  const fatigueSignal = FATIGUE_TERMS.test(recentText);

  let mode: DalilMode = 'general';
  if (studyScore > 0 && dailyScore > 0) mode = 'mixed';
  else if (studyScore > 0) mode = 'study';
  else if (dailyScore > 0) mode = 'daily';
  else if (creativeScore > 0) mode = 'creative';

  const modeGuidance: Record<DalilMode, string> = {
    study: 'السياق الحالي تعليمي: تصرّف كمعلم متكيف، اشرح تدريجياً، تحقق من الفهم عند الحاجة، وحوّل المحتوى إلى ملخص أو بطاقات أو أسئلة فقط إذا طلب المستخدم ذلك أو كان ذلك أنسب بوضوح.',
    daily: 'السياق الحالي استعمال يومي: أعطِ نتيجة عملية مباشرة، وساعد في الكتابة والتنظيم والتخطيط والتحليل. لا تفرض أسلوب التدريس أو الاختبارات.',
    creative: 'السياق الحالي إبداعي: استكشف الفكرة وقدم بدائل عملية ومتماسكة، مع الحفاظ على القيود التي ذكرها المستخدم.',
    mixed: 'السياق يجمع الدراسة والحياة اليومية: اربط المفاهيم بأمثلة واقعية مفيدة عند ملاءمتها، ولا تخلط المهام أو تغيّر هدف المستخدم.',
    general: 'السياق عام أو غير محسوم: أجب عن الطلب كما هو، ولا تفترض أنه تعليمي أو إنتاجي دون قرينة.',
  };

  const fatigueGuidance = fatigueSignal
    ? 'ظهرت عبارة صريحة أو متكررة قد تشير إلى تعب أو ضغط. لا تشخّص الحالة ولا تفترض سببها؛ خفّف كثافة الشرح والأسئلة في هذه الاستجابة، وقدّم خياراً خفيفاً أو استراحة قصيرة دون ضغط، مع احترام طلب المستخدم إن أراد المتابعة بعمق.'
    : 'لا توجد إشارة كافية إلى الإرهاق في الرسائل الحديثة؛ لا تفترض حالة عاطفية ولا تغيّر مستوى المساعدة بناءً على تخمين.';

  return {
    mode,
    fatigueSignal,
    prompt: `محرك دليل للسياق والتكيّف (تقدير مؤقت من الرسائل الأخيرة، وليس تصنيفاً ثابتاً):
الدور المرجّح الآن: ${mode}.
${modeGuidance[mode]}
${fatigueGuidance}
- لا تحفظ استنتاجات الحالة الذهنية كحقائق أو ذكريات دائمة.
- لا تعِد جدولة مواعيد أو تنشئ تذكيرات أو تنفّذ إجراءات خارجية دون موافقة صريحة.
- استخدم سياق المحادثة والملف التعليمي المرسل في الطلب فقط؛ لا تدّعِ امتلاك ذاكرة دائمة موحّدة أو بيانات تقويم غير متصلة.
- إذا جمع الطلب بين أكثر من مجال، نفّذها بتسلسل واضح بدلاً من إجبار المستخدم على اختيار وضع.`,
  };
}
