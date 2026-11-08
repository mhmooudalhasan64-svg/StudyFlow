import { useMemo, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Download, ExternalLink, Youtube, Compass, MessageCircle } from 'lucide-react';
import { PageTitle } from '../components/ui';

function youtubeId(value: string): string | null {
  try {
    const url = new URL(value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`);
    const host = url.hostname.toLowerCase().replace(/^www\\./, '');
    if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const id = host === 'youtu.be'
      ? parts[0]
      : url.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(parts[0] ?? '') ? parts[1] : null);
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export default function YouTubeStudy() {
  const [url, setUrl] = useState('');
  const [question, setQuestion] = useState('');
  const videoId = useMemo(() => youtubeId(url), [url]);
  const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';

  const openYouTube = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: 'https://m.youtube.com', presentationStyle: 'fullscreen', toolbarColor: '#10233D' });
      } else {
        const opened = window.open('https://m.youtube.com', '_blank', 'noopener,noreferrer');
        if (!opened) window.location.assign('https://m.youtube.com');
      }
    } catch {
      window.location.assign('https://m.youtube.com');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="YouTube داخل VAYORA" subtitle="تصفّح YouTube وابحث عن الدروس وشاهدها من داخل تجربة VAYORA." />

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <Youtube size={22} className="text-rose-500" />
          <h2 className="font-bold">تصفّح YouTube من داخل VAYORA</h2>
        </div>
        <p className="text-sm leading-6 text-muted">
          افتح واجهة YouTube لتبحث عن الفيديوهات وتتصفحها وتشاهدها. في تطبيق Android تُفتح نافذة تصفح مدمجة؛ أما نسخة الويب فقد تفتح YouTube في تبويب جديد بسبب قيود المتصفح.
        </p>
        <button type="button" className="btn btn-primary w-full" onClick={() => void openYouTube()}>
          <Compass size={17} /> فتح YouTube
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">مشاهدة فيديو داخل VAYORA</h2>
        <label className="label" htmlFor="youtube-url">رابط الفيديو</label>
        <input
          id="youtube-url"
          className="input"
          type="url"
          dir="ltr"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        {videoId ? (
          <>
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title="مشغل فيديو YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="btn btn-ghost" href={videoUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> فتح على YouTube
              </a>
              <a className="btn btn-ghost" href={videoUrl} target="_blank" rel="noreferrer">
                <Download size={16} /> خيارات التنزيل الرسمية
              </a>
            </div>
            <p className="text-xs leading-5 text-muted">
              التنزيل متاح فقط عبر خيارات YouTube الرسمية عندما يسمح الفيديو والمنطقة والحساب بذلك. لا يتيح VAYORA تنزيل ملفات الفيديو من خوادم YouTube.
            </p>
          </>
        ) : url.trim() ? (
          <p className="text-xs text-bad">الرابط غير صالح. استخدم رابط فيديو عادي أو Shorts أو youtu.be.</p>
        ) : (
          <p className="text-xs text-muted">أدخل رابط فيديو عادي أو Shorts أو youtu.be لعرضه هنا.</p>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={19} className="text-accent" />
          <h2 className="font-bold">اسأل AVORA عن الفيديو</h2>
        </div>
        <p className="text-sm leading-6 text-muted">
          هذه الإمكانية قيد التطوير: سيحلّل AVORA محتوى الفيديو مباشرةً دون أن تطلب المنصة منك رفع ترجمة أو نسخ نص يدوياً. لن نقدّم إجابات عن فيديو لم يتمكن النظام فعلياً من قراءة محتواه.
        </p>
        <input
          className="input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          placeholder="اكتب سؤالك عن الفيديو..."
          aria-label="سؤالك عن الفيديو"
          disabled
        />
        <button className="btn btn-primary w-full" type="button" disabled>
          اسأل AVORA — قريباً
        </button>
      </section>
    </div>
  );
}
