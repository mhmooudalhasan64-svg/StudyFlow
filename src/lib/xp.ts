/** نقاط الخبرة (XP) والمستويات — تُحسب من البيانات المخزنة دون جدول مستقل */

export const XP_RULES = {
  perStudyMinute: 1,
  perCorrectAnswer: 2,
  perWrongAnswer: 1,
  perLessonDone: 20,
  perExamResult: 25,
  perCardReview: 3,
} as const;

export interface XpInput {
  minutes: number;
  correct: number;
  wrong: number;
  lessonsDone: number;
  examResults: number;
  cardReviews: number;
}

export function computeXp(i: XpInput): number {
  return Math.round(
    i.minutes * XP_RULES.perStudyMinute +
      i.correct * XP_RULES.perCorrectAnswer +
      i.wrong * XP_RULES.perWrongAnswer +
      i.lessonsDone * XP_RULES.perLessonDone +
      i.examResults * XP_RULES.perExamResult +
      i.cardReviews * XP_RULES.perCardReview,
  );
}

/** XP اللازم للوصول إلى مستوى: 0، 100، 300، 600، 1000… */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export interface LevelInfo {
  level: number;
  xp: number;
  /** XP عند بداية المستوى الحالي والتالي */
  floor: number;
  ceil: number;
  /** تقدم داخل المستوى 0..1 */
  progress: number;
}

export function levelFromXp(xp: number): LevelInfo {
  const safe = Math.max(0, xp);
  let level = Math.floor((1 + Math.sqrt(1 + safe / 12.5)) / 2);
  // تصحيح أي خطأ تقريب عشري
  while (xpForLevel(level + 1) <= safe) level++;
  while (level > 1 && xpForLevel(level) > safe) level--;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, xp: safe, floor, ceil, progress: (safe - floor) / (ceil - floor) };
}
