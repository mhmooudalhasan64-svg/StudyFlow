const MAX_TTS_CHARS = 2600;
const dailyUsage = new Map<string, { day: string; count: number }>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return json({ error: 'الصوت العصبي غير مفعّل حالياً. استخدم الصوت الاحتياطي.' }, 503);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const usage = dailyUsage.get(ip);
  if (usage?.day === day && usage.count >= 25) return json({ error: 'تم بلوغ حد القراءة الصوتية اليومي. حاول لاحقاً.' }, 429);
  dailyUsage.set(ip, { day, count: usage?.day === day ? usage.count + 1 : 1 });

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'طلب صوتي غير صالح.' }, 400); }
  const text = typeof body === 'object' && body !== null && 'text' in body
    ? String((body as { text?: unknown }).text ?? '').trim().slice(0, MAX_TTS_CHARS)
    : '';
  if (!text) return json({ error: 'لا يوجد نص لقراءته.' }, 400);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'coral',
        input: text,
        response_format: 'mp3',
        speed: 0.96,
        instructions: 'تحدث بالعربية الفصحى المعاصرة بصوت معلم بشري طبيعي وودود. اجعل الإلقاء دافئاً وواضحاً، بنبرة هادئة وواثقة، مع تنغيم طبيعي وتأكيد لطيف على الكلمات المهمة. لا تقرأ كآلة ولا تبالغ في التمثيل. انطق الأسماء العربية بوضوح، وحافظ على إيقاع مناسب لشرح الدروس لطالب.',
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Neural TTS provider error:', response.status, detail.slice(0, 300));
      return json({ error: 'تعذّر إنشاء الصوت الطبيعي حالياً.' }, 502);
    }
    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        'content-type': 'audio/mpeg',
        'content-length': String(audio.byteLength),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Neural TTS request failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'تعذّر الاتصال بخدمة الصوت الطبيعي.' }, 502);
  }
}
