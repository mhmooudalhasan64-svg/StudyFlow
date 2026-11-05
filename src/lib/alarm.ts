export interface Alarm {
  id: string;
  /** HH:MM بتوقيت الجهاز */
  time: string;
  label: string;
  enabled: boolean;
  /** آخر يوم رنّ فيه (YYYY-MM-DD) كي لا يتكرر في اليوم نفسه */
  lastFired?: string;
}

/** نافذة السماح: إن فُتح التطبيق بعد وقت المنبه بأكثر من هذه الدقائق فلا يرنّ متأخراً */
export const GRACE_MIN = 2;

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function minutesOf(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** المنبهات التي حان وقتها الآن ولم ترنّ اليوم */
export function dueAlarms(alarms: readonly Alarm[], now: Date, todayKey: string): Alarm[] {
  const cur = now.getHours() * 60 + now.getMinutes();
  return alarms.filter((a) => {
    if (!a.enabled || !isValidTime(a.time) || a.lastFired === todayKey) return false;
    const diff = cur - minutesOf(a.time);
    return diff >= 0 && diff <= GRACE_MIN;
  });
}

/** عرض الوقت بنظام 12 ساعة بالعربية: 07:30 ← 7:30 ص */
export function formatAlarmTime(t: string): string {
  if (!isValidTime(t)) return t;
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** إشعار نظام (يعمل والتطبيق مفتوح أو في الخلفية، لا والتطبيق مغلق) */
export async function notify(title: string, body: string): Promise<void> {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.ready;
    if (reg) await reg.showNotification(title, { body, icon: '/pwa-192x192.png', tag: 'studyflow-alarm' });
    else new Notification(title, { body });
  } catch {
    /* الإشعار اختياري */
  }
}
