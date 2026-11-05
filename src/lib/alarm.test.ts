import { describe, expect, it } from 'vitest';
import { dueAlarms, formatAlarmTime, isValidTime, type Alarm } from './alarm';

const at = (h: number, m: number) => new Date(2026, 10, 6, h, m, 0);
const alarm = (over: Partial<Alarm> = {}): Alarm => ({ id: 'a', time: '07:30', label: 'مراجعة', enabled: true, ...over });

describe('alarm', () => {
  it('validates HH:MM', () => {
    expect(isValidTime('07:30')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('7:30')).toBe(false);
    expect(isValidTime('')).toBe(false);
  });

  it('rings only inside the grace window, once per day, when enabled', () => {
    const today = '2026-11-06';
    expect(dueAlarms([alarm()], at(7, 29), today)).toHaveLength(0);
    expect(dueAlarms([alarm()], at(7, 30), today)).toHaveLength(1);
    expect(dueAlarms([alarm()], at(7, 32), today)).toHaveLength(1);
    expect(dueAlarms([alarm()], at(7, 33), today)).toHaveLength(0);
    expect(dueAlarms([alarm({ lastFired: today })], at(7, 30), today)).toHaveLength(0);
    expect(dueAlarms([alarm({ lastFired: '2026-11-05' })], at(7, 30), today)).toHaveLength(1);
    expect(dueAlarms([alarm({ enabled: false })], at(7, 30), today)).toHaveLength(0);
  });

  it('formats Arabic 12-hour time', () => {
    expect(formatAlarmTime('07:30')).toBe('7:30 ص');
    expect(formatAlarmTime('00:05')).toBe('12:05 ص');
    expect(formatAlarmTime('12:00')).toBe('12:00 م');
    expect(formatAlarmTime('18:45')).toBe('6:45 م');
  });
});
