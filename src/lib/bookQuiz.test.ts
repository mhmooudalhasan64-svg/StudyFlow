import { describe, expect, it } from 'vitest';
import { chapterRange, chunkText, detectChapters, groundedItems, looksScanned, normalizeArabic, parsePageRange, planRequests, toCards } from './bookQuiz';

describe('bookQuiz', () => {
  it('normalizeArabic removes diacritics and unifies letters', () => {
    expect(normalizeArabic('الْعِلْمُ أَهَمُّ، إيمان!')).toBe('العلم اهم ايمان');
  });

  it('parsePageRange accepts single pages, ranges and Arabic digits', () => {
    expect(parsePageRange('12-40', 100)).toEqual({ from: 12, to: 40 });
    expect(parsePageRange('٥', 100)).toEqual({ from: 5, to: 5 });
    expect(parsePageRange('90-500', 100)).toEqual({ from: 90, to: 100 });
    expect(parsePageRange('0-5', 100)).toBeNull();
    expect(parsePageRange('40-12', 100)).toBeNull();
    expect(parsePageRange('abc', 100)).toBeNull();
    expect(parsePageRange('101', 100)).toBeNull();
  });

  it('looksScanned detects pdfs without text', () => {
    expect(looksScanned(['', ' ', '\n'])).toBe(true);
    expect(looksScanned([])).toBe(true);
    expect(looksScanned(['نص كافٍ '.repeat(30)])).toBe(false);
  });

  it('detectChapters finds headings and chapterRange spans to the next one', () => {
    const pages = ['الفصل الأول: الحركة\nنص', 'نص', 'الفصل الثاني: القوى\nنص', 'نص'];
    const ch = detectChapters(pages);
    expect(ch.map((c) => c.page)).toEqual([1, 3]);
    expect(chapterRange(ch, 0, 4)).toEqual({ from: 1, to: 2 });
    expect(chapterRange(ch, 1, 4)).toEqual({ from: 3, to: 4 });
  });

  it('chunkText keeps every chunk within the limit and loses nothing', () => {
    const text = Array.from({ length: 200 }, (_, i) => `سطر رقم ${i} `.repeat(5)).join('\n');
    const chunks = chunkText(text, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 1000)).toBe(true);
    expect(chunks.join('\n').replace(/\s+/g, '')).toBe(text.replace(/\s+/g, ''));
    expect(chunkText('x'.repeat(2500), 1000).every((c) => c.length <= 1000)).toBe(true);
  });

  it('planRequests spreads questions over few, evenly spaced chunks', () => {
    expect(planRequests(5, 1)).toEqual([{ chunk: 0, n: 5 }]);
    const p = planRequests(15, 10);
    expect(p).toHaveLength(4);
    expect(p.reduce((n, x) => n + x.n, 0)).toBe(15);
    expect(p[0].chunk).toBe(0);
    expect(p[3].chunk).toBe(9);
    expect(planRequests(10, 2)).toHaveLength(2);
    expect(planRequests(0, 3)).toEqual([]);
  });

  it('groundedItems keeps only questions whose quote is in the book text', () => {
    const chunk = 'تتحرك الأجسام بسرعة ثابتة إذا لم تؤثر عليها قوة خارجية. هذا هو قانون نيوتن الأول.';
    const q = (quote: unknown) => ({ text: 's', options: ['1', '2', '3', '4'], answerIndex: 0, quote });
    const raw = JSON.stringify([
      q('تتحرك الأجسام بسرعة ثابتة إذا لم تؤثر عليها قوة'),
      q('الشمس تدور حول الأرض كل يوم بسرعة كبيرة جدا'),
      q(undefined),
    ]);
    const r = groundedItems('```json\n' + raw + '\n```', chunk);
    expect(r.items).toHaveLength(1);
    expect(r.dropped).toBe(2);
    expect('quote' in r.items[0]).toBe(false);
    expect(groundedItems('لا شيء', chunk)).toEqual({ items: [], dropped: 0 });
  });

  it('toCards keeps valid cards, defaults the category and drops duplicates', () => {
    const out = toCards([
      { front: ' ما الاشتقاق؟ ', back: 'معدل التغير', category: 'definition' },
      { front: 'ما الاشتقاق؟', back: 'تكرار', category: 'term' },
      { front: 'قانون', back: 'ق = ك × ت', category: 'غير معروف' },
      { front: '', back: 'x' },
      { front: 'x'.repeat(300), back: 'y' },
      { front: 'ناقص' },
    ]);
    expect(out).toEqual([
      { front: 'ما الاشتقاق؟', back: 'معدل التغير', category: 'definition' },
      { front: 'قانون', back: 'ق = ك × ت', category: 'definition' },
    ]);
  });
});
