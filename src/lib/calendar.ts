import { addDays, pad2 } from './utils';

export interface CalendarEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD — الحدث طوال اليوم */
  date: string;
}

/** يهرب الأحرف الخاصة في قيم iCalendar */
function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

const compact = (key: string): string => key.replace(/-/g, '');

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

/** ملف تقويم (.ics) بأحداث طوال اليوم، متوافق مع تطبيقات التقويم الشائعة */
export function buildIcs(events: readonly CalendarEvent[], now: Date = new Date()): string {
  const stamp = utcStamp(now);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudyFlow//AR//EN', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(e.id)}@studyflow`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${escapeText(e.title)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
