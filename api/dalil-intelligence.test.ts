import { describe, expect, it } from 'vitest';
import { buildDalilContext } from './dalil-intelligence';

describe('buildDalilContext', () => {
  it('detects an educational request', () => {
    const result = buildDalilContext({
      messages: [{ role: 'user', content: 'اشرح لي درس الاشتقاق مع مثال' }],
    });
    expect(result.mode).toBe('study');
    expect(result.prompt).toContain('معلم متكيف');
  });

  it('prioritizes a clear daily task over a selected study subject', () => {
    const result = buildDalilContext({
      messages: [{ role: 'user', content: 'اكتب لي رسالة اعتذار عن تأخر تسليم العمل' }],
      subject: 'الفلسفة',
    });
    expect(result.mode).toBe('daily');
  });

  it('recognizes requests that combine study and daily planning', () => {
    const result = buildDalilContext({
      messages: [{ role: 'user', content: 'اشرح لي مفهوم العرض والطلب، ثم رتّب لي جدول مراجعة' }],
    });
    expect(result.mode).toBe('mixed');
  });

  it('adapts gently to explicit fatigue without diagnosing', () => {
    const result = buildDalilContext({
      messages: [{ role: 'user', content: 'أنا مرهق اليوم وما عم قدر ركز بالدراسة' }],
    });
    expect(result.fatigueSignal).toBe(true);
    expect(result.prompt).toContain('لا تشخّص الحالة');
  });

  it('keeps an ambiguous request in general mode', () => {
    const result = buildDalilContext({
      messages: [{ role: 'user', content: 'ما رأيك بهذا؟' }],
    });
    expect(result.mode).toBe('general');
  });
});
