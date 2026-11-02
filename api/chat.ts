/**
 * دالة خادم على Vercel تتوسط بين التطبيق وخدمة Grok (xAI).
 * مفتاح الخدمة يُقرأ من متغيّرات البيئة على الخادم فقط ولا يصل إلى المتصفح أبداً.
 *
 * المتغيّرات:
 *   XAI_API_KEY        (مطلوب) مفتاح xAI
 *   XAI_MODEL          (اختياري) اسم النموذج، الافتراضي grok-4.7
 *   CHAT_DAILY_LIMIT   (اختياري) عدد الرسائل اليومي لكل عنوان IP، الافتراضي 30
 */

const ENDPOINT = 'https://api.x.ai/v1/chat/completions';
const MODEL = process.env.XAI_MODEL || 'grok-4.7';
const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT) > 0 ? Number(process.env.CHAT_DAILY_LIMIT) : 30;

const MAX_MESSAGES = 12;
const MAX_CHARS = 2000;

const SYSTEM_PROMPT = `أنت «مساعد StudyFlow»، معلّم خصوصي ودود لطلاب شهادة البكالوريا (الثانوية العامة) في العالم العربي.
- أجب بالعربية الفصحى المبسطة، وبإيجاز ووضوح، وخطوة بخطوة عند شرح الحلول.
- ساعد في فهم الدروس والتمارين وتنظيم المراجعة، وشجّع الطالب على المحاولة بنفسه قبل إعطاء الحل الكامل.
- إن لم تكن متأكداً من معلومة أو من تفاصيل منهاج بلد الطالب فاذكر ذلك صراحة ولا تخترع.
- ابتعد عن المواضيع غير الدراسية بلطف وأعد الحديث إلى الدراسة.
- اكتب نصاً عادياً بدون جداول أو تنسيقات معقدة.`;

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const usage = new Map<string, { day: string; count: number }>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function sanitize(body: unknown): Msg[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw)) return null;

  const out: Msg[] = [];
  for (const m of raw.slice(-MAX_MESSAGES)) {
    if (typeof m !== 'object' || m === null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const text = content.trim().slice(0, MAX_CHARS);
    if (text) out.push({ role, content: text });
  }
  if (out.length === 0 || out[out.length - 1].role !== 'user') return null;
  return out;
}

/** حدّ يومي بسيط لكل IP (في الذاكرة؛ يخفف الإساءة لكنه ليس حماية مطلقة). */
function overLimit(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  if (usage.size > 5000) {
    for (const [k, v] of usage) if (v.day !== day) usage.delete(k);
  }
  const cur = usage.get(ip);
  if (!cur || cur.day !== day) {
    usage.set(ip, { day, count: 1 });
    return false;
  }
  cur.count += 1;
  return cur.count > DAILY_LIMIT;
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.XAI_API_KEY;
  if (!key) return json({ error: 'المساعد غير مفعّل بعد: لم يُضبط مفتاح الخدمة على الخادم.' }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'طلب غير صالح' }, 400);
  }
  const messages = sanitize(body);
  if (!messages) return json({ error: 'رسائل غير صالحة' }, 400);

  if (overLimit(clientIp(request))) {
    return json({ error: `وصلت إلى الحد اليومي (${DAILY_LIMIT} رسالة). جرّب غداً.` }, 429);
  }

  let upstream: Response;
  try {
    upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1200,
        temperature: 0.4,
        stream: false,
      }),
      signal: AbortSignal.timeout(50_000),
    });
  } catch {
    return json({ error: 'تعذّر الاتصال بخدمة الذكاء الاصطناعي' }, 502);
  }

  if (!upstream.ok) {
    const msg =
      upstream.status === 401 || upstream.status === 403
        ? 'مفتاح الخدمة غير صالح أو غير مصرّح له'
        : upstream.status === 429
          ? 'الخدمة مشغولة أو انتهى رصيد الحساب'
          : 'حدث خطأ من خدمة الذكاء الاصطناعي';
    return json({ error: msg }, 502);
  }

  const data = (await upstream.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: 'لم يصل ردّ من المساعد، حاول مرة أخرى' }, 502);

  return json({ reply });
}
