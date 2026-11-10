/**
 * لا يستخدم هذا المسار أي مزوّد TTS مدفوع.
 * يعتمد التطبيق على محرك تحويل النص إلى كلام الأصلي في Android
 * أو Web Speech API في المتصفح عبر src/lib/voice.ts.
 *
 * إبقاء المسار كاستجابة واضحة يمنع أي استدعاء غير مقصود لـ OpenAI
 * أو استهلاك رصيد API من واجهة الخادم.
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function POST(): Promise<Response> {
  return json({
    error: 'الخدمة الصوتية السحابية المدفوعة متوقفة. استخدم محرك الصوت المجاني الموجود على جهازك.',
    fallback: 'device-tts',
  }, 410);
}
