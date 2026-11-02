import type { Settings } from '../db';

export type TimerMode = 'focus' | 'short' | 'long';

export const MODE_LABEL: Record<TimerMode, string> = {
  focus: 'تركيز',
  short: 'استراحة قصيرة',
  long: 'استراحة طويلة',
};

export function modeMs(
  mode: TimerMode,
  s: Pick<Settings, 'focusMin' | 'shortMin' | 'longMin'>,
): number {
  const min = mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortMin : s.longMin;
  return min * 60_000;
}
