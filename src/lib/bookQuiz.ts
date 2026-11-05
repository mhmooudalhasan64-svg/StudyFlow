/**
 * «اختبرني من كتابي PDF»: دوال نقية لتقسيم الكتاب وتحديد الجزء المطلوب
 * والتحقق من أن كل سؤال مبني على نص الكتاب. لا تتصل بأي خدمة.
 */

export const CHUNK_CHARS = 6500; // أقل من حد الخادم (8000)
export const MAX_REQUESTS = 4;
export const QUESTIONS_PER_REQUEST = 4;

/** توحيد النص العربي للمقارنة: إزالة التشكيل والتطويل وتوحيد الألف والياء */
export function normalizeArabic(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

/** هل هذا الـPDF صور ممسوحة؟ (نص شبه معدوم قياساً بعدد الصفحات) */
export function looksScanned(pages: readonly string[]): boolean {
  if (pages.length === 0) return true;
  const chars = pages.reduce((n, p) => n + p.replace(/\s+/g, '').length, 0);
  return chars / pages.length < 40;
}

export interface Chapter {
  title: string;
  /** رقم الصفحة (يبدأ من 1) */
  page: number;
}

const CHAPTER_RE = /^(?:(?:الفصل|الوحدة|الباب|الدرس)(?=[\s:：\-–]|$)|(?:unit|chapter|lesson)\b)/i;

/** يستنتج بدايات الفصول من أول أسطر كل صفحة */
export function detectChapters(pages: readonly string[]): Chapter[] {
  const out: Chapter[] = [];
  pages.forEach((p, i) => {
    const lines = p
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3);
    const hit = lines.find((l) => CHAPTER_RE.test(l) && l.length <= 70);
    if (!hit) return;
    const last = out[out.length - 1];
    if (last && last.title === hit) return;
    out.push({ title: hit, page: i + 1 });
  });
  return out;
}

/** نطاق الصفحات لفصل: من صفحته حتى ما قبل بداية الفصل التالي */
export function chapterRange(chapters: readonly Chapter[], index: number, total: number): { from: number; to: number } {
  const c = chapters[index];
  const next = chapters[index + 1];
  return { from: c.page, to: next ? Math.max(c.page, next.page - 1) : total };
}

/** يقرأ نطاقاً مثل «12» أو «12-40» ويقصّه على حدود الكتاب؛ null إن كان غير صالح */
export function parsePageRange(input: string, total: number): { from: number; to: number } | null {
  const digits = input.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
  const m = /^(\d{1,4})\s*(?:[-–—]\s*(\d{1,4}))?$/.exec(digits);
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  if (from < 1 || from > total || to < from) return null;
  return { from, to: Math.min(to, total) };
}

export function textOfPages(pages: readonly string[], from: number, to: number): string {
  return pages
    .slice(from - 1, to)
    .join('\n\n')
    .trim();
}

/** يقسم النص إلى أجزاء لا تتجاوز max حرفاً عند حدود الأسطر قدر الإمكان */
export function chunkText(text: string, max: number = CHUNK_CHARS): string[] {
  const chunks: string[] = [];
  let cur = '';
  const push = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = '';
  };
  for (const line of text.split('\n')) {
    let l = line;
    while (l.length > max) {
      push();
      chunks.push(l.slice(0, max));
      l = l.slice(max);
    }
    if (cur.length + l.length + 1 > max) push();
    cur += l + '\n';
  }
  push();
  return chunks;
}

export interface RequestPlan {
  chunk: number;
  n: number;
}

/**
 * يوزّع عدد الأسئلة على أقل عدد من الطلبات (حتى 4)، ويختار أجزاء متباعدة
 * بالتساوي لتغطية النطاق كله بدل أول صفحاته فقط.
 */
export function planRequests(count: number, chunkCount: number): RequestPlan[] {
  if (count <= 0 || chunkCount <= 0) return [];
  const k = Math.max(1, Math.min(chunkCount, MAX_REQUESTS, Math.ceil(count / QUESTIONS_PER_REQUEST)));
  const plans: RequestPlan[] = [];
  let left = count;
  for (let i = 0; i < k; i++) {
    const chunk = k === 1 ? 0 : Math.round((i * (chunkCount - 1)) / (k - 1));
    const n = Math.ceil(left / (k - i));
    plans.push({ chunk, n });
    left -= n;
  }
  return plans;
}

/** نسبة كلمات العبارة الموجودة في النص (بعد التوحيد) */
function overlap(quote: string, source: Set<string>): number {
  const words = normalizeArabic(quote)
    .split(' ')
    .filter((w) => w.length > 1);
  if (words.length < 3) return 0;
  return words.filter((w) => source.has(w)).length / words.length;
}

export interface GroundedResult {
  items: Record<string, unknown>[];
  /** عدد الأسئلة المستبعدة لأنها غير مثبتة بنص الكتاب */
  dropped: number;
}

/**
 * يبقي فقط الأسئلة التي ترفق «quote» تظهر كلماتها في نص الجزء من الكتاب.
 * هذا حاجز عملي ضد الأسئلة المختلقة، وليس ضماناً مطلقاً.
 */
export function groundedItems(raw: string, chunk: string): GroundedResult {
  const s = raw.replace(/```(?:json)?/gi, '');
  const a = s.indexOf('[');
  const b = s.lastIndexOf(']');
  let arr: unknown;
  try {
    arr = a >= 0 && b > a ? JSON.parse(s.slice(a, b + 1)) : null;
  } catch {
    arr = null;
  }
  if (!Array.isArray(arr)) return { items: [], dropped: 0 };

  const source = new Set(normalizeArabic(chunk).split(' '));
  const items: Record<string, unknown>[] = [];
  let dropped = 0;
  for (const it of arr) {
    if (typeof it !== 'object' || it === null) continue;
    const o = it as Record<string, unknown>;
    if (typeof o.quote === 'string' && overlap(o.quote, source) >= 0.8) {
      const { quote: _q, ...rest } = o;
      items.push(rest);
    } else {
      dropped++;
    }
  }
  return { items, dropped };
}

export type CardKind = 'definition' | 'date' | 'term' | 'rule';

export interface BookCard {
  front: string;
  back: string;
  category: CardKind;
}

/** يحوّل عناصر JSON المثبتة إلى بطاقات صالحة (واجهة وخلفية نصيتان بطول معقول، دون تكرار) */
export function toCards(items: readonly Record<string, unknown>[]): BookCard[] {
  const kinds: CardKind[] = ['definition', 'date', 'term', 'rule'];
  const seen = new Set<string>();
  const out: BookCard[] = [];
  for (const it of items) {
    const front = typeof it.front === 'string' ? it.front.trim() : '';
    const back = typeof it.back === 'string' ? it.back.trim() : '';
    if (!front || !back || front.length > 200 || back.length > 400) continue;
    if (seen.has(front)) continue;
    seen.add(front);
    const c = it.category;
    out.push({ front, back, category: kinds.includes(c as CardKind) ? (c as CardKind) : 'definition' });
  }
  return out;
}

const STOP = new Set(['ما', 'ماذا', 'هو', 'هي', 'في', 'من', 'على', 'عن', 'الى', 'التي', 'الذي', 'هل', 'كيف', 'لماذا', 'متى', 'اين', 'كم', 'ان', 'او', 'ثم', 'هذا', 'هذه', 'ذلك', 'مع', 'بين', 'كان', 'يكون', 'عند']);

export interface BookAnswerContext {
  /** نص الصفحات الأقرب للسؤال مع علامات [ص N] */
  text: string;
  /** أرقام الصفحات المستخدمة مرتبة */
  pages: number[];
}

/**
 * بحث محلي (دون أي خدمة): يختار الصفحات الأكثر تطابقاً مع كلمات السؤال حتى حدّ الأحرف،
 * فيُرسل للمساعد جزء صغير فقط من الكتاب بدل الكتاب كله.
 */
export function searchPages(pages: readonly string[], query: string, maxChars = 7000, from = 1, to = pages.length): BookAnswerContext {
  const words = [...new Set(normalizeArabic(query).split(' ').filter((w) => w.length > 1 && !STOP.has(w)))];
  const scored: { page: number; score: number }[] = [];
  for (let p = from; p <= Math.min(to, pages.length); p++) {
    const set = new Set(normalizeArabic(pages[p - 1]).split(' '));
    let score = 0;
    for (const w of words) {
      if (set.has(w)) score += 2;
      else if (w.length > 3 && [...set].some((x) => x.length > 3 && (x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4))))) score += 1;
    }
    if (score > 0) scored.push({ page: p, score });
  }
  scored.sort((a, b) => b.score - a.score || a.page - b.page);

  const chosen: number[] = [];
  let used = 0;
  for (const { page } of scored) {
    const len = pages[page - 1].length + 12;
    if (used + len > maxChars) {
      if (chosen.length === 0) {
        chosen.push(page); // صفحة واحدة طويلة: نقتطعها لاحقاً
        used = maxChars;
      }
      continue;
    }
    chosen.push(page);
    used += len;
    if (chosen.length >= 6) break;
  }
  chosen.sort((a, b) => a - b);
  const text = chosen.map((p) => `[ص${p}]\n${pages[p - 1]}`).join('\n\n').slice(0, maxChars);
  return { text, pages: chosen };
}
