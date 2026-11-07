import { useMemo, useState, type ChangeEvent } from 'react';
import { Captions, Download, ExternalLink, FileText, Loader2, Play, Send, Youtube } from 'lucide-react';
import { PageTitle } from '../components/ui';
import { askVideo } from '../lib/chatStore';

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

function cleanTranscript(raw: string): string {
  return raw
    .replace(/^\\uFEFF/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^WEBVTT.*$/gim, '')
    .replace(/^NOTE.*$/gim, '')
    .replace(/^\\d+\\s*$/gm, '')
    .replace(/^\\d{1,2}:\\d{2}(?::\\d{2})?[.,]\\d{3}\\s+-->.*$/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\r/g, '')
    .replace(/[ \\t]+/g, ' ')
    .replace(/\\n{3,}/g, '\\n\\n')
    .trim();
}

export default function YouTubeStudy() {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sourceName, setSourceName] = useState('ترجمة فيديو YouTube');

  const videoId = useMemo(() => youtubeId(url), [url]);
  const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';

  const loadSubtitle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (file.size > 1_000_000) {
      setError('ملف الترجمة كبير. الحد الأقصى 1 ميغابايت.');
      return;
    }
    if (!/\\.(vtt|srt|txt)$/i.test(file.name)) {
      setError('الملفات المدعومة: VTT وSRT وTXT.');
      return;
    }
    try {
      const text = cleanTranscript(await file.text()).slice(0, 8000);
      if (text.length < 20) throw new Error('لم نعثر على نص كافٍ داخل ملف الترجمة.');
      setTranscript(text);
      setSourceName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّرت قراءة ملف الترجمة.');
    }
  };

  const analyze = async () => {
    if (!videoId) {
      setError('أدخل رابط YouTube صحيحاً أولاً.');
      return;
    }
    if (transcript.trim().length < 20) {
      setError('أضف نص الترجمة أو التفريغ أولاً؛ لا يمكن تحليل كلام الفيديو من الرابط وحده.');
      return;
    }
    if (!question.trim()) {
      setError('اكتب سؤالك عن الفيديو.');
      return;
    }
    setBusy(true);
    setError('');
    setAnswer('');
    try {
      const result = await askVideo({
        question: question.trim(),
        title: sourceName,
        transcript: transcript.trim(),
      });
      setAnswer(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحليل الفيديو.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="فيديوهات YouTube" subtitle="شاهد الدرس، أضف ترجمته، ثم اسأل AVORA عن محتواه." />

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <Youtube size={22} className="text-rose-500" />
          <h2 className="font-bold">فتح فيديو</h2>
        </div>
        <label className="label" htmlFor="youtube-url">رابط الفيديو</label>
        <input
          id="youtube-url"
          className="input"
          type="url"
          dir="ltr"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(event) => { setUrl(event.target.value); setAnswer(''); setError(''); }}
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
              التنزيل متاح فقط عبر خيارات YouTube الرسمية عندما يسمح الفيديو والمنطقة والحساب بذلك. لا يوفر التطبيق تنزيل ملفات الفيديو من خوادم YouTube.
            </p>
          </>
        ) : url.trim() ? (
          <p className="text-xs text-bad">الرابط غير صالح. استخدم رابط فيديو عادي أو Shorts أو youtu.be.</p>
        ) : (
          <p className="text-xs text-muted">يدعم روابط الفيديو العادية وShorts وروابط youtu.be.</p>
        )}
      </section>

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <Captions size={20} className="text-accent" />
          <h2 className="font-bold">إضافة الترجمة أو التفريغ النصي</h2>
        </div>
        <p className="text-sm leading-6 text-muted">
          للحصول على تحليل دقيق، الصق نص الترجمة أو ارفع ملف ترجمة VTT أو SRT أو TXT. لا يستطيع التطبيق سحب ترجمة كل فيديو تلقائياً؛ بعض الفيديوهات لا توفر ترجمة أو تمنع الوصول إليها.
        </p>
        <label className="btn btn-ghost w-full cursor-pointer">
          <FileText size={16} /> رفع ملف ترجمة
          <input className="sr-only" type="file" accept=".vtt,.srt,.txt,text/vtt,text/plain" onChange={(event) => void loadSubtitle(event)} />
        </label>
        <textarea
          className="input min-h-40 resize-y"
          value={transcript}
          onChange={(event) => { setTranscript(event.target.value.slice(0, 8000)); setSourceName('ترجمة فيديو YouTube'); }}
          maxLength={8000}
          placeholder="الصق هنا نص الترجمة أو التفريغ النصي للفيديو..."
          aria-label="نص ترجمة الفيديو"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>{sourceName}</span>
          <span>{transcript.length.toLocaleString('ar')} / 8000</span>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">اسأل AVORA عن الفيديو</h2>
        <input
          className="input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          placeholder="مثلاً: لخّص الدرس واشرح أهم الأفكار..."
          aria-label="سؤالك عن الفيديو"
        />
        <button className="btn btn-primary w-full" type="button" onClick={() => void analyze()} disabled={busy || !videoId || transcript.trim().length < 20 || !question.trim()}>
          {busy ? <><Loader2 size={17} className="animate-spin" /> جارٍ تحليل المحتوى…</> : <><Send size={17} /> اسأل AVORA</>}
        </button>
        {error && <p className="text-sm text-bad" role="alert">{error}</p>}
        {answer && (
          <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold"><Play size={16} className="text-accent" /> إجابة AVORA</div>
            <p className="whitespace-pre-wrap text-sm leading-7">{answer}</p>
          </div>
        )}
      </section>
      <p className="text-center text-xs leading-5 text-muted">
        يُرسل نص الترجمة وسؤالك فقط إلى خدمة AVORA لتحليل المحتوى، ولا يُرفع ملف الفيديو نفسه.
      </p>
    </div>
  );
}
