/**
 * دالة خادم على Vercel تتوسط بين التطبيق وخدمة ذكاء اصطناعي متوافقة مع واجهة OpenAI.
 * المفتاح يُقرأ من متغيّرات البيئة على الخادم فقط ولا يصل إلى المتصفح أبداً.
 *
 * يُختار المزوّد تلقائياً بحسب أول مفتاح موجود بهذا الترتيب (المجانية أولاً):
 *   GROQ_API_KEY        Groq: مجاني دون بطاقة بحدود يومية
 *   OPENROUTER_API_KEY  OpenRouter: نماذج مجانية عبر openrouter/free
 *   GEMINI_API_KEY      Google Gemini: طبقة مجانية (غير متاحة في بعض الدول)
 *   XAI_API_KEY         xAI Grok: مدفوع
 *
 * متغيّرات اختيارية:
 *   AI_MODEL            يغيّر اسم النموذج الافتراضي للمزوّد المختار
 *   CHAT_DAILY_LIMIT    عدد الرسائل اليومي لكل عنوان IP، الافتراضي 30
 */

interface Provider {
  name: string;
  key: string;
  endpoint: string;
  model: string;
  /** ترويسات إضافية يطلبها المزوّد */
  headers?: Record<string, string>;
}

/** ينظّف المفتاح الملصوق: مسافات وأسطر جديدة وعلامات اقتباس زائدة */
function clean(value: string | undefined): string | undefined {
  const v = value?.trim().replace(/^["']|["']$/g, '').trim();
  return v ? v : undefined;
}

function pickProvider(raw: Record<string, string | undefined>): Provider | null {
  const env = {
    GROQ_API_KEY: clean(raw.GROQ_API_KEY),
    OPENROUTER_API_KEY: clean(raw.OPENROUTER_API_KEY),
    GEMINI_API_KEY: clean(raw.GEMINI_API_KEY),
    XAI_API_KEY: clean(raw.XAI_API_KEY),
  };
  const model = raw.AI_MODEL?.trim() || raw.XAI_MODEL?.trim();
  if (env.GROQ_API_KEY)
    return {
      name: 'Groq',
      key: env.GROQ_API_KEY,
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: model || 'llama-3.3-70b-versatile',
    };
  if (env.OPENROUTER_API_KEY)
    return {
      name: 'OpenRouter',
      key: env.OPENROUTER_API_KEY,
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      model: model || 'openrouter/free',
      headers: { 'X-Title': 'StudyFlow' },
    };
  if (env.GEMINI_API_KEY)
    return {
      name: 'Gemini',
      key: env.GEMINI_API_KEY,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: model || 'gemini-2.5-flash',
    };
  if (env.XAI_API_KEY)
    return {
      name: 'xAI',
      key: env.XAI_API_KEY,
      endpoint: 'https://api.x.ai/v1/chat/completions',
      model: model || 'grok-4.7',
    };
  return null;
}

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
  const provider = pickProvider(process.env);
  if (!provider) return json({ error: 'المساعد غير مفعّل بعد: لم يُضبط مفتاح الخدمة على الخادم.' }, 503);

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
    upstream = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${provider.key}`,
        ...provider.headers,
      },
      body: JSON.stringify({
        model: provider.model,
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
    // نذكر المزوّد المستخدم وطول المفتاح (دون كشفه) لتسهيل اكتشاف الإعداد الخاطئ
    const hint = ` [المزوّد: ${provider.name}، رمز ${upstream.status}، طول المفتاح: ${provider.key.length}]`;
    const msg =
      upstream.status === 401 || upstream.status === 403
        ? `مفتاح الخدمة غير صالح أو غير مصرّح له${hint}`
        : upstream.status === 429
          ? `الخدمة مشغولة أو انتهت الحصة المجانية، جرّب بعد قليل${hint}`
          : `حدث خطأ من خدمة الذكاء الاصطناعي${hint}`;
    return json({ error: msg }, 502);
  }

  const data = (await upstream.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) return json({ error: 'لم يصل ردّ من المساعد، حاول مرة أخرى' }, 502);

  return json({ reply });
}
