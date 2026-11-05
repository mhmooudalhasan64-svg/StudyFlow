/** رسالة تحفيزية بحسب نسبة إنجاز هدف اليوم وسلسلة الأيام */
export function motivationMessage(pct: number, streak: number): string {
  if (pct >= 1) {
    return streak >= 3
      ? `أنجزت هدف اليوم! سلسلتك ${streak} أيام — حافظ عليها.`
      : 'أنجزت هدف اليوم، أحسنت! استرح قليلاً أو راجع بعض الأسئلة.';
  }
  if (pct >= 0.5) return 'تجاوزت نصف هدفك، خطوة أخيرة وتنتهي.';
  if (pct > 0) return 'بداية موفقة! جلسة تركيز أخرى وتقترب من هدفك.';
  return streak > 0
    ? `لا تكسر سلسلتك (${streak} أيام) — ابدأ جلسة قصيرة الآن.`
    : 'ابدأ بجلسة تركيز واحدة؛ البداية أصعب جزء.';
}

/** شعار التطبيق: سبع جمل، تظهر واحدة منها كل يوم بالتناوب */
export const SLOGAN_PHRASES = [
  'مستقبلك يبدأ',
  'حلمك يكبر',
  'مستواك يرتقي',
  'أهدافك تتحقق',
  'وقتك يُستثمر',
  'علمك ينمو',
  'دربك يزدهر',
] as const;

export const SLOGAN = SLOGAN_PHRASES.join('، ') + '.';

/** جملة اليوم: تتغير يومياً وتبقى ثابتة طوال اليوم */
export function dailyPhrase(dateKey: string): string {
  const n = Number(dateKey.replace(/\D/g, '')) || 0;
  return SLOGAN_PHRASES[n % SLOGAN_PHRASES.length];
}
