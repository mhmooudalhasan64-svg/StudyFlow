import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Bot,
  Phone,
  CalendarCheck,
  Landmark,
  LayoutDashboard,
  MoreHorizontal,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Timer as TimerIcon,
  WifiOff,
  Search,
  X,
  SlidersHorizontal,
  HelpCircle,
} from 'lucide-react';
import { useApp } from './store';
import { useHashRoute, type Route } from './lib/route';
import Dashboard from './pages/Dashboard';
import About, { Intro } from './pages/About';
import { AlarmRinger } from './components/Alarms';
import VoiceTeacher from './components/VoiceTeacher';
import { primeAudio } from './lib/sound';
import Planner from './pages/Planner';
import TimerPage from './pages/TimerPage';
import Exams from './pages/Exams';
import Quiz from './pages/Quiz';
import Assistant from './pages/Assistant';
import Stats from './pages/Stats';
import SettingsPage from './pages/SettingsPage';
import Bac from './pages/Bac';
import Library from './pages/Library';
import Curriculum from './pages/Curriculum';
import Review from './pages/Review';
import Cards from './pages/Cards';
import Simulator from './pages/Simulator';
import Calculator from './pages/Calculator';
import Achievements from './pages/Achievements';
import Reports from './pages/Reports';
import More from './pages/More';
import MindMap from './pages/MindMap';
import Help from './pages/Help';
import Today from './pages/Today';

type NavItem = { route: Route; label: string; Icon: ComponentType<{ size?: number }> };

const PAGE_HINTS: Partial<Record<Route, string>> = {
  home: 'هذه الصفحة تجمع ملخص يومك. ابدأ من زر جلسة التركيز أو افتح لوحة يومي الدراسي.',
  plan: 'أضف مهامك وحدد المادة والمدة، ثم تابع إنجازها من هنا.',
  timer: 'اختر التركيز أو الاستراحة، وحدد المادة قبل بدء الجلسة.',
  bac: 'ستجد هنا أدوات وموارد مرتبطة بمرحلة البكالوريا.',
  more: 'كل الأدوات موجودة هنا. استخدم البحث للوصول لأي صفحة بسرعة.',
  library: 'أضف ملفاتك وكتبك، ثم افتحها عند الحاجة.',
  review: 'ابدأ بالعناصر المستحقة وسجّل ما تذكرته لتتحدد المراجعة التالية.',
  cards: 'افتح البطاقة وحاول تذكر الإجابة قبل إظهار الوجه الآخر.',
  stats: 'تعرض الإحصاءات ما سجلته فعلياً من جلسات وإجابات.',
  assistant: 'اكتب سؤالك أو أرفق ملفاً. إذا فتحت المساعد من صفحة أخرى فسيعرف سياقها.',
  today: 'هذه لوحة مختصرة تجمع مهامك ومراجعاتك ووقت تركيزك لهذا اليوم.',
};

const SEARCH_PAGES: { route: Route; label: string; keywords: string }[] = [
  { route: 'home', label: 'الرئيسية', keywords: 'ملخص تقدم اليوم' },
  { route: 'today', label: 'يومي الدراسي', keywords: 'مهام اليوم مراجعات مستحقة وقت التركيز' },
  { route: 'plan', label: 'الخطة', keywords: 'جدول مهام تنظيم أسبوع' },
  { route: 'timer', label: 'المؤقت', keywords: 'تركيز بومودورو استراحة' },
  { route: 'bac', label: 'البكالوريا', keywords: 'فرع مواد بكالوريا' },
  { route: 'curriculum', label: 'خطة إنهاء المنهاج', keywords: 'دروس وحدات إنجاز' },
  { route: 'library', label: 'مكتبة الكتب', keywords: 'PDF ملفات كتب' },
  { route: 'mindmap', label: 'الخرائط الذهنية', keywords: 'أفكار مخطط' },
  { route: 'review', label: 'المراجعة الذكية', keywords: 'تكرار متباعد مستحق' },
  { route: 'cards', label: 'البطاقات التعليمية', keywords: 'حفظ سؤال جواب' },
  { route: 'exams', label: 'الامتحانات', keywords: 'مواعيد امتحان' },
  { route: 'quiz', label: 'بنك الأسئلة والاختبارات', keywords: 'أسئلة تدريب اختبار' },
  { route: 'simulator', label: 'محاكي الامتحان', keywords: 'امتحان تجريبي وقت' },
  { route: 'calc', label: 'حاسبة العلامات', keywords: 'معدل درجات' },
  { route: 'stats', label: 'الإحصاءات', keywords: 'نقاط ضعف دقة تقدم' },
  { route: 'reports', label: 'التقارير', keywords: 'ملخص دراسة' },
  { route: 'achievements', label: 'الإنجازات', keywords: 'أوسمة تحفيز' },
  { route: 'assistant', label: 'SKOVA AI', keywords: 'مساعد ذكي شرح سؤال' },
  { route: 'settings', label: 'الإعدادات', keywords: 'صوت مظهر نسخ احتياطي مواد' },
  { route: 'help', label: 'شرح أزرار التطبيق', keywords: 'دليل مساعدة تعليمات' },
];

/** التنقل المختصر؛ جميع الصفحات متاحة من «كل الميزات» */
const NAV: NavItem[] = [
  { route: 'home', label: 'الرئيسية', Icon: LayoutDashboard },
  { route: 'plan', label: 'الخطة', Icon: CalendarCheck },
  { route: 'timer', label: 'المؤقت', Icon: TimerIcon },
  { route: 'bac', label: 'البكالوريا', Icon: Landmark },
  { route: 'more', label: 'كل الميزات', Icon: MoreHorizontal },
];

/** شريط الجوال السفلي: الأهم فقط والباقي في «المزيد» */
const MOBILE_NAV: NavItem[] = [
  { route: 'home', label: 'الرئيسية', Icon: LayoutDashboard },
  { route: 'plan', label: 'الخطة', Icon: CalendarCheck },
  { route: 'timer', label: 'المؤقت', Icon: TimerIcon },
  { route: 'bac', label: 'البكالوريا', Icon: Landmark },
  { route: 'more', label: 'المزيد', Icon: MoreHorizontal },
];

const PAGES: Record<Route, ComponentType> = {
  home: Dashboard,
  plan: Planner,
  timer: TimerPage,
  exams: Exams,
  quiz: Quiz,
  assistant: Assistant,
  stats: Stats,
  settings: SettingsPage,
  bac: Bac,
  library: Library,
  mindmap: MindMap,
  curriculum: Curriculum,
  review: Review,
  cards: Cards,
  simulator: Simulator,
  calc: Calculator,
  achievements: Achievements,
  reports: Reports,
  more: More,
  about: About,
  help: Help,
  today: Today,
};

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function App() {
  const init = useApp((s) => s.init);
  const ready = useApp((s) => s.ready);
  const tick = useApp((s) => s.tick);
  const theme = useApp((s) => s.settings.theme);
  const updateSettings = useApp((s) => s.updateSettings);
  const [introDone, setIntroDone] = useState(false);
  const [simpleMode, setSimpleMode] = useState(() => {
    try { return localStorage.getItem('studyflow-ui-mode') !== 'advanced'; } catch { return true; }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [skovaCallOpen, setSkovaCallOpen] = useState(false);
  const [assistantPosition, setAssistantPosition] = useState<{ left: number; top: number } | null>(() => {
    try {
      const saved = localStorage.getItem('studyflow-assistant-position');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return Number.isFinite(parsed.left) && Number.isFinite(parsed.top)
        ? { left: parsed.left, top: parsed.top }
        : null;
    } catch {
      return null;
    }
  });
  const assistantDrag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const ignoreAssistantClick = useRef(false);
  const route = useHashRoute();
  const online = useOnline();
  const visibleNav = simpleMode ? NAV.filter((item) => ['home', 'plan', 'timer', 'more'].includes(item.route)) : NAV;
  const visibleMobileNav = simpleMode ? MOBILE_NAV.filter((item) => ['home', 'plan', 'timer', 'more'].includes(item.route)) : MOBILE_NAV;
  const searchResults = SEARCH_PAGES.filter((item) => (item.label + ' ' + item.keywords).toLowerCase().includes(searchText.trim().toLowerCase()));

  useEffect(() => {
    try { setHintVisible(Boolean(PAGE_HINTS[route]) && localStorage.getItem('studyflow-hint-' + route) !== '1'); }
    catch { setHintVisible(Boolean(PAGE_HINTS[route])); }
  }, [route]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleMode = () => {
    setSimpleMode((current) => {
      const next = !current;
      try { localStorage.setItem('studyflow-ui-mode', next ? 'simple' : 'advanced'); } catch { /* التبديل يعمل لهذه الجلسة */ }
      window.dispatchEvent(new Event('studyflow:mode-change'));
      return next;
    });
  };

  useEffect(() => {
    void init();
  }, [init]);

  // مؤقت يعمل حتى عند التنقل بين الصفحات
  useEffect(() => {
    const id = window.setInterval(() => void tick(), 500);
    const onVisible = () => document.visibilityState === 'visible' && void tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tick]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-muted" role="status">
        جارٍ التحميل…
      </div>
    );
  }

  const Page = PAGES[route];

  if (!introDone) {
    return (
      <Intro
        onStart={() => {
          primeAudio();
          setIntroDone(true);
        }}
      />
    );
  }

  return (
    <div className="app-shell mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
      <AlarmRinger />
      {searchOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-3 pt-[12vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="البحث عن ميزة" className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line p-3"><Search size={19} className="text-accent" /><input autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="ابحث عن أي صفحة أو ميزة..." value={searchText} onChange={(event) => setSearchText(event.target.value)} /><kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-muted sm:inline">ESC</kbd><button type="button" aria-label="إغلاق البحث" onClick={() => setSearchOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-base"><X size={18} /></button></div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {searchResults.length ? searchResults.map((item) => <a key={item.route} href={`#/${item.route}`} onClick={() => { setSearchOpen(false); setSearchText(''); }} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-base"><span>{item.label}</span><span className="text-xs text-muted">فتح الصفحة ←</span></a>) : <p className="p-5 text-center text-sm text-muted">لا توجد نتيجة. جرّب كلمة أخرى.</p>}
            </div>
            <p className="border-t border-line px-3 py-2 text-[11px] text-muted">اختصار البحث: Ctrl + K أو ⌘ + K</p>
          </section>
        </div>
      )}
      <button
          type="button"
          aria-label="ابدأ مكالمة صوتية مع المعلم SKOVA، واسحب الزر لتغيير مكانه"
          title="مكالمة المعلم الصوتية — اضغط للاتصال أو اسحب الزر لتحريكه"
          style={assistantPosition ? { left: assistantPosition.left, top: assistantPosition.top } : undefined}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            assistantDrag.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              left: rect.left,
              top: rect.top,
              moved: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = assistantDrag.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (!drag.moved && Math.hypot(dx, dy) < 6) return;
            drag.moved = true;
            const rect = event.currentTarget.getBoundingClientRect();
            setAssistantPosition({
              left: Math.max(8, Math.min(window.innerWidth - rect.width - 8, drag.left + dx)),
              top: Math.max(8, Math.min(window.innerHeight - rect.height - 8, drag.top + dy)),
            });
          }}
          onPointerUp={(event) => {
            const drag = assistantDrag.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (drag.moved) {
              const rect = event.currentTarget.getBoundingClientRect();
              const position = {
                left: Math.max(8, Math.min(window.innerWidth - rect.width - 8, drag.left + event.clientX - drag.x)),
                top: Math.max(8, Math.min(window.innerHeight - rect.height - 8, drag.top + event.clientY - drag.y)),
              };
              setAssistantPosition(position);
              try {
                localStorage.setItem('studyflow-assistant-position', JSON.stringify(position));
              } catch {
                // يبقى تحريك الزر متاحاً حتى إن تعذر حفظ الموقع
              }
              ignoreAssistantClick.current = true;
            }
            assistantDrag.current = null;
          }}
          onPointerCancel={() => { assistantDrag.current = null; }}
          onClick={() => {
            if (ignoreAssistantClick.current) {
              ignoreAssistantClick.current = false;
              return;
            }
            setSkovaCallOpen(true);
          }}
          className={`fixed z-30 inline-flex touch-none select-none items-center gap-2 rounded-full border border-emerald-300/20 bg-gradient-to-l from-[#102d2a] via-[#145447] to-[#123d4c] px-3 py-2 text-white shadow-xl shadow-emerald-950/30 transition hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 cursor-grab active:cursor-grabbing ${assistantPosition ? '' : 'bottom-24 left-4 md:bottom-6 md:left-6'}`}
        >
          <span className="relative grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-white/10">
            <Phone size={16} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#16483e] bg-emerald-300" />
          </span>
          <span className="flex flex-col text-right leading-tight">
            <span className="text-xs font-extrabold tracking-wide">مكالمة المعلم</span>
            <span className="text-[9px] text-white/75">SKOVA الصوتي</span>
          </span>
      </button>
      <a
        href="#/assistant"
        aria-label="فتح المساعد الدراسي النصي"
        title="المساعد الدراسي — محادثة نصية مع SKOVA"
        className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-gradient-to-l from-[#21152f] via-[#392052] to-[#263653] px-3 py-2 text-white shadow-xl shadow-purple-950/30 transition hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400 md:bottom-6 md:right-6"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-white/10">
          <Bot size={16} />
        </span>
        <span className="flex flex-col text-right leading-tight">
          <span className="text-xs font-extrabold tracking-wide">المساعد</span>
          <span className="text-[9px] text-white/75">محادثة نصية</span>
        </span>
      </a>
      <VoiceTeacher open={skovaCallOpen} onClose={() => setSkovaCallOpen(false)} />
      {/* الشريط الجانبي (شاشات كبيرة) */}
      <aside className="app-sidebar sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto p-4 md:flex">
        <Brand />
        <nav className="mt-4 flex flex-col gap-1" aria-label="التنقل الرئيسي">
          {visibleNav.map(({ route: r, label, Icon }) => (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={(route === r || (r === 'more' && !visibleNav.some((n) => n.route === route))) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                route === r || (r === 'more' && !visibleNav.some((n) => n.route === route))
                  ? 'bg-gradient-to-l from-accent/20 to-accent2/20 text-accent'
                  : 'text-muted hover:bg-card/70 hover:text-main'
              }`}
            >
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 pt-3">
          {!online && <OfflineChip />}
          <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} simpleMode={simpleMode} onToggleMode={toggleMode} onSearch={() => setSearchOpen(true)} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ترويسة الجوال */}
        <header className="app-mobile-header sticky top-0 z-10 flex items-center justify-between border-b border-line/70 bg-base/80 px-4 py-3 backdrop-blur-md md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            {!online && <OfflineChip />}
            <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} simpleMode={simpleMode} onToggleMode={toggleMode} onSearch={() => setSearchOpen(true)} />
          </div>
        </header>

        <main className="app-main flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10" key={route}>
          {hintVisible && PAGE_HINTS[route] && (
            <div className="mx-auto mb-4 flex max-w-4xl items-start gap-3 rounded-2xl border border-accent/25 bg-accent/5 p-3 text-sm" role="status">
              <HelpCircle size={18} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1"><p className="font-bold">تلميحة سريعة</p><p className="mt-1 leading-6 text-muted">{PAGE_HINTS[route]}</p></div>
              <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => { setHintVisible(false); try { localStorage.setItem('studyflow-hint-' + route, '1'); } catch { /* لا يؤثر على الاستخدام */ } }}>فهمت</button>
            </div>
          )}
          <Page />
        </main>

        {/* شريط التنقل السفلي (جوال) */}
        <nav
          className={`app-mobile-nav fixed inset-x-0 bottom-0 z-20 grid ${simpleMode ? "grid-cols-4" : "grid-cols-5"} border-t border-line/70 bg-base/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden`}
          aria-label="التنقل الرئيسي"
        >
          {visibleMobileNav.map(({ route: r, label, Icon }) => {
            const active = route === r || (r === 'more' && !visibleMobileNav.some((n) => n.route === route));
            return (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              <Icon size={20} />
              {label}
            </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function OfflineChip() {
  return (
    <span className="chip text-bad" role="status">
      <WifiOff size={13} /> دون إنترنت
    </span>
  );
}

function Brand() {
  return (
    <a href="#/home" className="flex items-center gap-2.5">
      <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl object-cover" />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-extrabold tracking-wide">StudyFlow</span>
        <span className="text-[10px] text-muted">مستقبلك يبدأ</span>
      </span>
    </a>
  );
}

function HeaderButtons({ theme, onToggle, simpleMode, onToggleMode, onSearch }: { theme: 'dark' | 'light'; onToggle: () => void; simpleMode: boolean; onToggleMode: () => void; onSearch: () => void }) {
  return (
    <>
      <button type="button" onClick={onSearch} aria-label="البحث عن ميزة" title="البحث عن ميزة (Ctrl + K)" className="rounded-xl border border-line bg-card/60 p-2.5 text-muted transition hover:border-accent hover:text-main"><Search size={18} /></button>
      <button type="button" onClick={onToggleMode} aria-label={simpleMode ? 'التبديل إلى الوضع المتقدم' : 'التبديل إلى الوضع البسيط'} title={simpleMode ? 'الوضع البسيط — اضغط لإظهار كل الأزرار' : 'الوضع المتقدم — اضغط لتبسيط الأزرار'} className={`rounded-xl border border-line bg-card/60 p-2.5 transition hover:border-accent hover:text-main ${simpleMode ? 'text-accent' : 'text-muted'}`}><SlidersHorizontal size={18} /></button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
        className="rounded-xl border border-line bg-card/60 p-2.5 text-muted transition hover:border-accent hover:text-main"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <a
        href="#/settings"
        aria-label="الإعدادات"
        className="rounded-xl border border-line bg-card/60 p-2.5 text-muted transition hover:border-accent hover:text-main"
      >
        <SettingsIcon size={18} />
      </a>
    </>
  );
}