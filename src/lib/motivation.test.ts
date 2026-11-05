import { describe, expect, it } from 'vitest';
import { dailyPhrase, SLOGAN, SLOGAN_PHRASES } from './motivation';

describe('slogan', () => {
  it('keeps the full slogan text', () => {
    expect(SLOGAN).toBe('مستقبلك يبدأ، حلمك يكبر، مستواك يرتقي، أهدافك تتحقق، وقتك يُستثمر، علمك ينمو، دربك يزدهر.');
  });
  it('dailyPhrase is stable for a day and cycles through all phrases', () => {
    expect(dailyPhrase('2026-11-04')).toBe(dailyPhrase('2026-11-04'));
    const seen = new Set(Array.from({ length: 7 }, (_, i) => dailyPhrase(`2026-11-0${i + 1}`)));
    expect(seen.size).toBe(SLOGAN_PHRASES.length);
  });
});
