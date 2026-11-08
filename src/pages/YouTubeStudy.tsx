import { useEffect, useMemo, useRef, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Download, ExternalLink, Youtube, Compass, MessageCircle, Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { PageTitle } from '../components/ui';
import { askVideo } from '../lib/chatStore';
import { listen } from '../lib/voice';

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
  const [transcript, setTranscript] = useState('');
  const [liveText, setLiveText] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const activeRef = useRef(false);
  const stopRef = useRef<(() => void) | null>(null);
  const draftRef = useRef('');

  const videoId = useMemo(() => youtubeId(url), [url]);
  const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';

  useEffect(() => () => {
    activeRef.current = false;
    stopRef.current?.();
  }, []);

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

  const stopCapture = () => {
    activeRef.current = false;
    setCapturing(false);
    stopRef.current?.();
    stopRef.current = null;
    if (draftRef.current.trim()) {
      setTranscript(current => [current, draftRef.current.trim()].filter(Boolean).join(' ').slice(0, 8000));
      draftRef.current = '';
      setLiveText('');
    }
  };

  const startCapture = () => {
    if (!videoId) {
      setError('أدخل رابط فيديو صالحاً أولاً.');
      return;
    }
    setError('');
    setAnswer('');
    activeRef.current = true;
    setCapturing(true);

    const listenAgain = () => {
      if (!activeRef.current) return;
      draftRef.current = '';
      stopRef.current = listen({
        lang: 'ar-SA',
        onText: text => {
          draftRef.current = text;
          setLiveText(text);
        },
        onError: message => {
          setError(message);
          activeRef.current = false;
          setCapturing(false);
        },
        onEnd: () => {
          if (draftRef.current.trim()) {
            const segment = draftRef.current.trim();
            setTranscript(current => [current, segment].filter(Boolean).join(' ').slice(0, 8000));
            draftRef.current = '';
            setLiveText('');
          }
          if (activeRef.current) window.setTimeout(listenAgain, 350);
          else setCapturing(false);
        },
      });
    };
    listenAgain();
  };

  const submitQuestion = async () => {
    if (!question.trim() || transcript.trim().length < 20 || busy) return;
    setBusy(true);
    setError('');
    setAnswer('');
    try {
      const result = await askVideo({ question: question.trim(), title: `تفريغ صوت فيديو YouTube ${videoId ?? ''}`, transcript });
      setAnswer(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحليل الصوت الملتقط.');
    } finally {
      setBusy(false);
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
        <input id="youtube-url" className="input" type="url" dir="ltr" inputMode="url"
          placeholder="https://www.youtube.com/watch?v=..." value={url}
          onChange={event => { setUrl(event.target.value); setTranscript(''); setAnswer(''); setError(''); }} />
        {videoId ? (
          <>
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title="مشغل فيديو YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
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
          حل مجاني دون خدمة API مدفوعة: شغّل الفيديو بصوت مسموع، ثم فعّل التقاط الصوت ليحوّل الجهاز الكلام المسموع إلى نص تلقائياً. بعد ذلك يجيب AVORA اعتماداً على النص الذي تم التقاطه فقط.
        </p>
        <div className="flex flex-wrap gap-2">
          {!capturing ? (
            <button type="button" className="btn btn-primary flex-1" onClick={startCapture} disabled={!videoId}>
              <Mic size={17} /> ابدأ التقاط صوت الفيديو
            </button>
          ) : (
            <button type="button" className="btn btn-ghost flex-1" onClick={stopCapture}>
              <MicOff size={17} /> إيقاف الالتقاط
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => { setTranscript(''); setLiveText(''); setAnswer(''); setError(''); }}>
            مسح النص
          </button>
        </div>
        {capturing && <p className="text-xs text-muted">الميكروفون يعمل. ارفع صوت الفيديو واجعل مكبّر الصوت مسموعاً للميكروفون. قد لا يلتقط الجهاز صوته الداخلي مباشرةً.</p>}
        {liveText && <div className="rounded-lg bg-surface-secondary p-3 text-sm"><span className="font-semibold">يلتقط الآن: </span>{liveText}</div>}
        <div className="rounded-lg border border-subtle p-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">النص الملتقط تلقائياً</span>
            <span className="text-muted">{transcript.length}/8000</span>
          </div>
          <p className="text-sm leading-6 whitespace-pre-wrap text-muted">{transcript || 'لم يُلتقط أي كلام بعد.'}</p>
        </div>
        <label className="label" htmlFor="avora-video-question">سؤالك عن الفيديو</label>
        <input id="avora-video-question" className="input" value={question}
          onChange={event => setQuestion(event.target.value)} maxLength={500}
          placeholder="مثلاً: لخّص الفكرة الرئيسية واشرحها..." />
        <button className="btn btn-primary w-full" type="button"
          onClick={() => void submitQuestion()}
          disabled={!videoId || transcript.trim().length < 20 || !question.trim() || busy || capturing}>
          {busy ? <><Loader2 size={17} className="animate-spin" /> جارٍ التحليل...</> : <><Send size={17} /> اسأل AVORA</>}
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        {answer && <div className="rounded-xl border border-subtle p-4 space-y-2"><h3 className="font-bold">إجابة AVORA</h3><p className="text-sm leading-7 whitespace-pre-wrap">{answer}</p></div>}
        <p className="text-xs leading-5 text-muted">
          لا توجد رسوم لخدمة تفريغ مدفوعة. يعتمد التعرّف الصوتي على دعم جهازك أو المتصفح وخدمة الكلام المثبّتة عليه، وقد لا يعمل في كل الأجهزة أو اللغات. قد تتم معالجة الصوت بواسطة خدمة التعرّف التي يوفرها نظام التشغيل أو المتصفح؛ لا تبدأ الالتقاط إلا إذا كنت موافقاً على استخدام الميكروفون.
        </p>
      </section>
    </div>
  );
}
