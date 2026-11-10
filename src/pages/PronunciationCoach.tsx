import { useEffect, useMemo, useRef, useState } from 'react';
import { AudioLines, BookOpen, CheckCircle2, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react';
import { PageTitle } from '../components/ui';
import { canListen, canSpeak, listen, prepareVoice, speak, stopSpeaking } from '../lib/voice';

type LetterLesson = {
  letter: string;
  name: string;
  group: string;
  place: string;
  tip: string;
  examples: string[];
  practice: string;
};

const LESSONS: LetterLesson[] = [
  { letter: 'ء', name: 'الهمزة', group: 'الحلق', place: 'أقصى الحلق، من أقرب موضع إلى الصدر.', tip: 'ابدأ الصوت بوضوح من الحلق من غير ضغط أو مبالغة، ولا تحوّل الهمزة إلى مدّ.', examples: ['أَسَد', 'سَأَل', 'ماء'], practice: 'أَسَد، سَأَلَ، ماء' },
  { letter: 'هـ', name: 'الهاء', group: 'الحلق', place: 'أقصى الحلق، أبعد قليلاً من مخرج الهمزة.', tip: 'أخرج نفساً صوتياً لطيفاً من الحلق، من دون احتكاك قوي أو تحويلها إلى همزة.', examples: ['هَواء', 'نَهَر', 'وَجْه'], practice: 'هَواء، نَهَر، وَجْه' },
  { letter: 'ع', name: 'العين', group: 'الحلق', place: 'وسط الحلق.', tip: 'حافظ على صوت حلقي واضح ومتوسط؛ لا تستبدله بالهمزة ولا تضغط على الحنجرة.', examples: ['عَيْن', 'لَعِبَ', 'شُعاع'], practice: 'عَيْن، لَعِبَ، شُعاع' },
  { letter: 'ح', name: 'الحاء', group: 'الحلق', place: 'وسط الحلق، قريبة من مخرج العين.', tip: 'أخرج هواءً احتكاكياً من وسط الحلق بهدوء، مع بقاء الصوت مهموساً لا يتحول إلى هاء.', examples: ['حَبْل', 'بَحْر', 'مِفْتاح'], practice: 'حَبْل، بَحْر، مِفْتاح' },
  { letter: 'غ', name: 'الغين', group: 'الحلق', place: 'أدنى الحلق، أقرب إلى الفم.', tip: 'قرّب مؤخر اللسان من المنطقة اللينة أعلى الحلق، واجعل الصوت مجهوراً من غير مبالغة.', examples: ['غُصْن', 'مَغْرِب', 'صَمْغ'], practice: 'غُصْن، مَغْرِب، صَمْغ' },
  { letter: 'خ', name: 'الخاء', group: 'الحلق', place: 'أدنى الحلق، من جهة الفم.', tip: 'اصنع احتكاكاً هوائياً من مؤخر الفم، ولا تجعلها كافاً أو غيناً.', examples: ['خُبْز', 'أَخَذَ', 'تاريخ'], practice: 'خُبْز، أَخَذَ، تاريخ' },
  { letter: 'ق', name: 'القاف', group: 'أقصى اللسان', place: 'أقصى اللسان مع ما يحاذيه من الحنك الأعلى.', tip: 'ارفع مؤخر اللسان إلى سقف الحنك، ثم أطلق الصوت بوضوح. لا تستبدلها بكاف.', examples: ['قَلَم', 'يَقْرَأ', 'طَريق'], practice: 'قَلَم، يَقْرَأ، طَريق' },
  { letter: 'ك', name: 'الكاف', group: 'أقصى اللسان', place: 'من أقصى اللسان، أسفل قليلاً من مخرج القاف باتجاه الفم.', tip: 'اجعل مخرجها أمام القاف قليلاً، بصوت أخف؛ تدرب على التمييز بين كَ وقَ.', examples: ['كِتاب', 'مَكْتَب', 'سَمَك'], practice: 'كَتَبَ، قَلَبَ، كِتاب' },
  { letter: 'ج', name: 'الجيم', group: 'وسط اللسان', place: 'وسط اللسان مع وسط الحنك الأعلى.', tip: 'ارفع وسط اللسان نحو الحنك. حافظ على صوت الجيم العربية الفصحى ولا تخلطها بالشين أو الياء.', examples: ['جَمَل', 'شَجَر', 'ثَلْج'], practice: 'جَمَل، شَجَر، ثَلْج' },
  { letter: 'ش', name: 'الشين', group: 'وسط اللسان', place: 'وسط اللسان مع الحنك الأعلى.', tip: 'قرّب وسط اللسان من الحنك واسمح للهواء بالمرور مع تفشي الصوت؛ لا تجعلها سيناً.', examples: ['شَمْس', 'عَشَب', 'رِيش'], practice: 'شَمْس، عَشَب، رِيش' },
  { letter: 'ي', name: 'الياء', group: 'وسط اللسان', place: 'وسط اللسان مع الحنك الأعلى عند كونها حرفاً صحيحاً متحركاً.', tip: 'ارفع وسط اللسان برفق. ميّز الياء المتحركة عن صوت المد في مثل «فِي».', examples: ['يَد', 'بَيْت', 'يَمين'], practice: 'يَد، بَيْت، يَمين' },
  { letter: 'ض', name: 'الضاد', group: 'حافة اللسان', place: 'إحدى حافتي اللسان أو كلتاهما مع الأضراس العليا.', tip: 'درّب حافة اللسان على ملامسة الأضراس العليا. لا تستبدل الضاد بظاء أو دال.', examples: ['ضَوْء', 'أَرْض', 'مَريض'], practice: 'ضَوْء، أَرْض، مَريض' },
  { letter: 'ل', name: 'اللام', group: 'طرف اللسان', place: 'أدنى حافتي اللسان إلى طرفه مع لثة الأسنان العليا.', tip: 'اجعل طرف اللسان وحافته يلامسان اللثة العليا، ودع الصوت يمر بوضوح.', examples: ['لَيْل', 'قَلَم', 'جَميل'], practice: 'لَيْل، قَلَم، جَميل' },
  { letter: 'ن', name: 'النون', group: 'طرف اللسان', place: 'طرف اللسان مع لثة الثنيتين العلويتين، ولها غنة من الخيشوم.', tip: 'المس طرف اللسان اللثة العليا، وانتبه إلى الغنة الطبيعية من الأنف دون تكلف.', examples: ['نُور', 'مِنْبَر', 'لَوْن'], practice: 'نُور، مَنار، لَوْن' },
  { letter: 'ر', name: 'الراء', group: 'طرف اللسان', place: 'طرف اللسان قريباً من مخرج النون مع ظهره.', tip: 'قرّب طرف اللسان من اللثة العليا واسمح بطرقة خفيفة؛ تجنب تكرير الراء بشكل مبالغ.', examples: ['رَبيع', 'مَرْيَم', 'قَمَر'], practice: 'رَبيع، مَرْيَم، قَمَر' },
  { letter: 'ط', name: 'الطاء', group: 'طرف اللسان', place: 'طرف اللسان مع أصول الثنايا العليا.', tip: 'اضغط طرف اللسان عند أصول الثنايا العليا مع تفخيم الصوت. ميّزها عن التاء.', examples: ['طائِر', 'مَطَر', 'بَطَل'], practice: 'طائِر، تِين، مَطَر' },
  { letter: 'د', name: 'الدال', group: 'طرف اللسان', place: 'طرف اللسان مع أصول الثنايا العليا.', tip: 'أغلق المخرج بطرف اللسان ثم أطلقه بصوت مجهور قصير، من غير إضافة حركة.', examples: ['دار', 'مَدْرَسة', 'وَرْد'], practice: 'دار، تِين، مَدْرَسة' },
  { letter: 'ت', name: 'التاء', group: 'طرف اللسان', place: 'طرف اللسان مع أصول الثنايا العليا.', tip: 'المخرج قريب من الدال لكن الصوت مهموس. أخرج الهواء بوضوح ولا تجعلها طاء.', examples: ['تِين', 'مَتْجَر', 'بَيْت'], practice: 'تِين، دَار، بَيْت' },
  { letter: 'ص', name: 'الصاد', group: 'طرف اللسان', place: 'طرف اللسان قريباً من الثنايا السفلى، مع مرور الهواء بين الأسنان.', tip: 'حافظ على التفخيم وصفير الصاد، ولا تجعلها سيناً مرققة.', examples: ['صَبْر', 'عَصير', 'قِصّة'], practice: 'صَبْر، سَمَك، عَصير' },
  { letter: 'ز', name: 'الزاي', group: 'طرف اللسان', place: 'طرف اللسان قريباً من الثنايا السفلى.', tip: 'أخرج صفيراً مع اهتزاز الصوت؛ ميّزها عن السين المهموسة.', examples: ['زَهْر', 'مِيزان', 'خُبْز'], practice: 'زَهْر، سَمَك، مِيزان' },
  { letter: 'س', name: 'السين', group: 'طرف اللسان', place: 'طرف اللسان قريباً من الثنايا السفلى.', tip: 'اسمح للهواء بالمرور في مجرى ضيق لصوت صافٍ مهموس. لا تفخمها مثل الصاد.', examples: ['سَمَك', 'مَسْجِد', 'شَمْس'], practice: 'سَمَك، صَبْر، مَسْجِد' },
  { letter: 'ظ', name: 'الظاء', group: 'طرف اللسان', place: 'طرف اللسان مع أطراف الثنايا العليا.', tip: 'أظهر طرف اللسان عند أطراف الأسنان العليا مع التفخيم. لا تستبدلها بضاد أو زاي.', examples: ['ظِلّ', 'عَظيم', 'مَحْفوظ'], practice: 'ظِلّ، ذَهَب، عَظيم' },
  { letter: 'ذ', name: 'الذال', group: 'طرف اللسان', place: 'طرف اللسان مع أطراف الثنايا العليا.', tip: 'أظهر طرف اللسان قليلاً بين الأسنان، مع صوت مجهور لين؛ لا تجعلها زاي.', examples: ['ذَهَب', 'هَذا', 'لَذيذ'], practice: 'ذَهَب، زَهْر، هَذا' },
  { letter: 'ث', name: 'الثاء', group: 'طرف اللسان', place: 'طرف اللسان مع أطراف الثنايا العليا.', tip: 'أظهر طرف اللسان قليلاً ودع الهواء يمر؛ حافظ على الهمس ولا تحولها إلى سين.', examples: ['ثَوْب', 'كَثير', 'حَديث'], practice: 'ثَوْب، سَمَك، كَثير' },
  { letter: 'ف', name: 'الفاء', group: 'الشفتان', place: 'باطن الشفة السفلى مع أطراف الثنايا العليا.', tip: 'لامس أطراف الأسنان العليا بباطن الشفة السفلى، ثم أخرج الهواء برفق.', examples: ['فَم', 'مِفْتاح', 'صَيْف'], practice: 'فَم، مِفْتاح، صَيْف' },
  { letter: 'ب', name: 'الباء', group: 'الشفتان', place: 'انطباق الشفتين.', tip: 'أطبق الشفتين ثم افتحهما مع صوت واضح. لا تضف حركة بعد الباء الساكنة.', examples: ['باب', 'حَبْل', 'كِتاب'], practice: 'باب، حَبْل، كِتاب' },
  { letter: 'م', name: 'الميم', group: 'الشفتان', place: 'انطباق الشفتين، مع غنة من الخيشوم.', tip: 'أطبق الشفتين برفق مع استمرار الرنين الأنفي الطبيعي، من غير ضغط زائد.', examples: ['ماء', 'قَمَر', 'قَلَم'], practice: 'ماء، قَمَر، قَلَم' },
  { letter: 'و', name: 'الواو', group: 'الشفتان', place: 'انضمام الشفتين عند كونها حرفاً صحيحاً متحركاً.', tip: 'قرّب الشفتين مع تدويرهما قليلاً. ميّز الواو المتحركة عن واو المد.', examples: ['وَرْد', 'وَلَد', 'سَوْق'], practice: 'وَرْد، وَلَد، سَوْق' },
];

const GROUPS = ['الكل', 'الحلق', 'أقصى اللسان', 'وسط اللسان', 'حافة اللسان', 'طرف اللسان', 'الشفتان'];

function normalizeArabic(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/[\u200f\u200e]/g, '')
    .replace(/[،؛؟,.!؟:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function PronunciationCoach() {
  const [selectedGroup, setSelectedGroup] = useState('الكل');
  const [selectedLetter, setSelectedLetter] = useState('ع');
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const [recognized, setRecognized] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const transcriptRef = useRef('');

  const visibleLessons = useMemo(
    () => LESSONS.filter(lesson => selectedGroup === 'الكل' || lesson.group === selectedGroup),
    [selectedGroup],
  );
  const lesson = LESSONS.find(item => item.letter === selectedLetter) ?? LESSONS[0];

  useEffect(() => () => {
    stopRef.current?.();
    stopSpeaking();
  }, [stopRef]);

  const playExample = () => {
    setError('');
    setFeedback('');
    speak(lesson.practice, {
      onError: message => setError(message),
    }, { rate: 0.85, style: 'soft' });
  };

  const startPractice = async () => {
    if (listening || busy) return;
    if (!canListen()) {
      setError('التعرّف على الكلام غير مدعوم هنا. استخدم تطبيق Android أو متصفح Chrome حديثاً.');
      return;
    }
    try {
      setError('');
      setFeedback('');
      setHeard('');
      transcriptRef.current = '';
      setRecognized(false);
      setBusy(true);
      await prepareVoice();
      setBusy(false);
      setListening(true);
      stopRef.current = listen({
        lang: 'ar-SA',
        onText: text => { transcriptRef.current = text; setHeard(text); },
        onError: message => setError(message),
        onEnd: () => {
          setListening(false);
          stopRef.current = null;
          setPracticeCount(count => count + 1);
          const result = transcriptRef.current.trim();
          if (!result) {
            setFeedback('لم ألتقط كلمات واضحة. استمع إلى المثال مرة أخرى، ثم أعد المحاولة بهدوء.');
            return;
          }
          const expected = normalizeArabic(lesson.practice);
          const actual = normalizeArabic(result);
          const matched = expected.split(' ').filter(Boolean).some(word => actual.includes(word));
          setRecognized(matched);
          setFeedback(matched
            ? 'التقط النظام كلمة أو أكثر من كلمات التدريب. أعد المحاولة ببطء، وركّز على موضع اللسان والشفتين الموضّح أعلاه.'
            : 'لم تتطابق الكلمات الملتقطة مع المثال بوضوح. استمع للنموذج وكرّر الكلمات على مهل.');
        },
      });
    } catch (cause) {
      setBusy(false);
      setListening(false);
      setError(cause instanceof Error ? cause.message : 'تعذّر تشغيل التدريب الصوتي.');
    }
  };

  const stopPractice = () => {
    stopRef.current?.();
    stopRef.current = null;
    setListening(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5" dir="rtl">
      <PageTitle title="مدرّب مخارج الحروف" subtitle="تعلّم موضع الحرف، استمع إلى أمثلته، ثم كرّر التدريب بصوتك خطوة بخطوة." />
      <section className="card space-y-3 border-accent/30 bg-gradient-to-l from-accent/10 via-card to-card">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><AudioLines size={21} /></span>
          <div>
            <h2 className="font-bold">طريقة التدريب</h2>
            <p className="text-xs leading-5 text-muted">استمع ← لاحظ موضع النطق ← كرّر ← راجع الكلمات التي التقطها الجهاز.</p>
          </div>
        </div>
        <p className="text-xs leading-6 text-muted">ملاحظة مهمة: التعرّف الصوتي يساعد على متابعة الكلمات المسموعة، لكنه لا يقيس دقة مخرج الحرف أو صفاته قياساً صوتياً متخصصاً. استخدم إرشادات النطق والتدريب السمعي، ولا تعتبر ظهور الكلمة حكماً نهائياً على صحة المخرج.</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map(group => (
            <button key={group} type="button" onClick={() => setSelectedGroup(group)} className={`rounded-full border px-3 py-1.5 text-xs transition ${selectedGroup === group ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-accent/50'}`}>
              {group}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-10">
          {visibleLessons.map(item => (
            <button key={item.letter} type="button" onClick={() => { setSelectedLetter(item.letter); setHeard(''); transcriptRef.current = ''; setFeedback(''); setError(''); setRecognized(false); stopPractice(); stopSpeaking(); }} aria-pressed={selectedLetter === item.letter} className={`grid aspect-square place-items-center rounded-xl border text-2xl font-bold transition ${selectedLetter === item.letter ? 'border-accent bg-accent/15 text-accent shadow-sm' : 'border-line bg-card text-main hover:border-accent/50'}`}>
              {item.letter}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{lesson.group} · {lesson.name}</p>
            <h2 className="mt-1 text-5xl font-extrabold text-accent">{lesson.letter}</h2>
          </div>
          <button type="button" onClick={playExample} disabled={!canSpeak()} className="btn btn-primary inline-flex items-center gap-2">
            <Volume2 size={17} /> استمع إلى النموذج
          </button>
        </div>
        <div className="rounded-xl border border-line/70 bg-base/60 p-3">
          <h3 className="flex items-center gap-2 text-sm font-bold"><BookOpen size={16} /> موضع خروج الحرف</h3>
          <p className="mt-2 text-sm leading-7">{lesson.place}</p>
          <p className="mt-2 text-sm leading-7 text-muted">{lesson.tip}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold">أمثلة على الحرف</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {lesson.examples.map(word => <span key={word} className="rounded-lg bg-base px-3 py-2 text-sm font-semibold">{word}</span>)}
          </div>
        </div>
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
          <p className="text-xs text-muted">جملة التدريب</p>
          <p className="mt-1 text-lg font-bold leading-8">{lesson.practice}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!listening ? (
            <button type="button" onClick={() => void startPractice()} disabled={busy || !canListen()} className="btn btn-primary inline-flex items-center gap-2">
              <Mic size={17} /> {busy ? 'جارٍ تجهيز الميكروفون…' : 'ابدأ التدريب بصوتك'}
            </button>
          ) : (
            <button type="button" onClick={stopPractice} className="btn btn-danger inline-flex items-center gap-2">
              <MicOff size={17} /> إيقاف التسجيل
            </button>
          )}
          <button type="button" onClick={playExample} className="btn btn-ghost inline-flex items-center gap-2">
            <RotateCcw size={16} /> أعد سماع المثال
          </button>
        </div>
        {listening && <p className="text-sm text-accent" role="status">يستمع الآن… اقرأ جملة التدريب بصوت واضح.</p>}
        {heard && <div className="rounded-xl border border-line p-3"><p className="text-xs text-muted">الكلمات التي التقطها النظام</p><p className="mt-1 text-sm font-semibold">{heard}</p></div>}
        {feedback && <div className={`rounded-xl border p-3 text-sm leading-6 ${recognized ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-line bg-base'}`} role="status">{recognized && <CheckCircle2 size={16} className="mb-1 inline ml-1 text-emerald-500" />}{feedback}</div>}
        {error && <p className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-500" role="alert">{error}</p>}
        <p className="text-[11px] text-muted">محاولاتك في هذه الجلسة: {practiceCount}</p>
      </section>
    </div>
  );
}
