import { describe, expect, it } from 'vitest';
import { playSound, soundLabel, SOUNDS } from './sound';

describe('sounds', () => {
  it('every sound has a unique id, a label and valid notes', () => {
    expect(new Set(SOUNDS.map((s) => s.id)).size).toBe(SOUNDS.length);
    expect(SOUNDS.length).toBeGreaterThanOrEqual(7);
    for (const s of SOUNDS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.notes.length).toBeGreaterThan(0);
      for (const n of s.notes) {
        expect(n.f).toBeGreaterThan(50);
        expect(n.dur).toBeGreaterThan(0);
        expect(n.gain).toBeGreaterThan(0);
        expect(n.gain).toBeLessThanOrEqual(0.35);
      }
    }
  });

  it('unknown kinds fall back to the classic sound label and never throw without audio support', () => {
    expect(soundLabel(undefined)).toBe(SOUNDS[0].label);
    expect(() => playSound('zen')).not.toThrow();
    expect(() => playSound(undefined)).not.toThrow();
  });
});
