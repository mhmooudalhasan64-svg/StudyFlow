import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
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
  HelpCircle,
  ChevronDown,
  GraduationCap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useApp } from './store';
import { useHashRoute, type Route } from './lib/route';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import { AlarmRinger } from './components/Alarms';

const APP_BUILD_CODE = 7;

const VoiceTeacher = lazy(() => import('./components/VoiceTeacher'));
const Planner = lazy(() => import('./pages/Planner'));
const TimerPage = lazy(() => import('./pages/TimerPage'));
const Exams = lazy(() => import('./pages/Exams'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Assistant = lazy(() => import('./pages/Assistant'));
const YouTubeStudy = lazy(() => import('./pages/YouTubeStudy'));
const Stats = lazy(() => import('./pages/Stats'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const Bac = lazy(() => import('./pages/Bac'));
const Library = lazy(() => import('./pages/Library'));
const Curriculum = lazy(() => import('./pages/Curriculum'));
const Review = lazy(() => import('./pages/Review'));
const Cards = lazy(() => import('./pages/Cards'));
const Simulator = lazy(() => import('./pages/Simulator'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Reports = lazy(() => import('./pages/Reports'));
const More = lazy(() => import('./pages/More'));
const MindMap = lazy(() => import('./pages/MindMap'));
const Help = lazy(() => import('./pages/Help'));
const Today = lazy(() => import('./pages/Today'));

type NavItem = { route: Route; label: string; Icon: LucideIcon };

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
  youtube: 'أدخل رابط فيديو، ثم أضف نص الترجمة لتسأل AVORA عن محتواه.',
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
  { route: 'assistant', label: 'AVORA AI', keywords: 'مساعد ذكي شرح سؤال' },
  { route: 'youtube', label: 'فيديوهات YouTube', keywords: 'يوتيوب فيديو ترجمة تفريغ تنزيل تحليل شرح' },
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

const PAGES: Record<Route, ComponentType<any>> = {
  home: Dashboard,
  plan: Planner,
  timer: TimerPage,
  exams: Exams,
  quiz: Quiz,
  assistant: Assistant,
  youtube: YouTubeStudy,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [avoraCallOpen, setAvoraCallOpen] = useState(false);
  const [avoraToolsOpen, setAvoraToolsOpen] = useState(false);
  const [updateRequired, setUpdateRequired] = useState(false);
  const route = useHashRoute();
  const online = useOnline();
  const visibleNav = NAV;
  const visibleMobileNav = MOBILE_NAV;
  const searchResults = SEARCH_PAGES.filter((item) => (item.label + ' ' + item.keywords).toLowerCase().includes(searchText.trim().toLowerCase()));

  useEffect(() => {
    setAvoraToolsOpen(false);
  }, [route]);

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkMinimumBuild = async () => {
      if (!navigator.onLine) return;
      const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
      try {
        const response = await fetch(`${apiBase}/api/version`, { cache: 'no-store' });
        if (!response.ok) return;
        const policy = await response.json() as { minimumBuild?: number };
        setUpdateRequired(Number(policy.minimumBuild || 0) > APP_BUILD_CODE);
      } catch {
        // Preserve offline study access if the version service cannot be reached.
      }
    };

    void checkMinimumBuild();
    window.addEventListener('online', checkMinimumBuild);
    return () => window.removeEventListener('online', checkMinimumBuild);
  }, []);

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

  if (updateRequired) {
    return (
      <div className="grid min-h-screen place-items-center bg-base px-6 py-10 text-center">
        <section className="w-full max-w-md rounded-3xl border border-line bg-card p-7 shadow-xl" dir="rtl">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <GraduationCap size={34} />
          </div>
          <h1 className="text-2xl font-black text-main">تحديث مطلوب</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            هذا الإصدار من VAYORA لم يعد معتمداً. ثبّت أحدث إصدار من VAYORA — SAPIENTIA للمتابعة.
          </p>
          <p className="mt-4 text-xs text-muted">Build {APP_BUILD_CODE} · AUREVON TECHNOLOGY</p>
        </section>
      </div>
    );
  }

  const Page = PAGES[route];

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
      {route !== 'assistant' && route !== 'home' && (
        <div className="avora-launcher fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end gap-2 md:bottom-6 md:right-6">
          {avoraToolsOpen && (
            <div id="avora-launcher-menu" className="avora-launcher-menu flex min-w-[13.5rem] flex-col gap-1.5 rounded-2xl border border-line bg-card/95 p-2 shadow-2xl backdrop-blur-xl" role="group" aria-label="أدوات AVORA">
              <button
                type="button"
                onClick={() => { setAvoraToolsOpen(false); setAvoraCallOpen(true); }}
                className="avora-launcher-option"
              >
                <span className="avora-launcher-option-icon"><Phone size={17} /></span>
                <span><strong>مكالمة المعلم</strong><small>محادثة صوتية مباشرة</small></span>
              </button>
              <a
                href="#/assistant"
                onClick={() => setAvoraToolsOpen(false)}
                className="avora-launcher-option"
              >
                <span className="avora-launcher-option-icon"><Bot size={17} /></span>
                <span><strong>المساعد الدراسي</strong><small>محادثة وشرح وملفات</small></span>
              </a>
            </div>
          )}
          <button
            type="button"
            aria-label={avoraToolsOpen ? "إغلاق أدوات AVORA" : "فتح أدوات AVORA"}
            aria-expanded={avoraToolsOpen}
            aria-controls="avora-launcher-menu"
            onClick={() => setAvoraToolsOpen((open) => !open)}
            className="avora-launcher-trigger"
          >
            <span className="avora-launcher-trigger-icon">{avoraToolsOpen ? <X size={19} /> : <Bot size={20} />}</span>
            <span>AVORA</span>
            <ChevronDown size={15} className={avoraToolsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
      )}      <Suspense fallback={null}><VoiceTeacher open={avoraCallOpen} onClose={() => setAvoraCallOpen(false)} /></Suspense>
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
          <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} onSearch={() => setSearchOpen(true)} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ترويسة الجوال */}
        <header className="app-mobile-header sticky top-0 z-10 flex items-center justify-between border-b border-line/70 bg-base/80 px-4 py-3 backdrop-blur-md md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            {!online && <OfflineChip />}
            <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} onSearch={() => setSearchOpen(true)} />
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
          <Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-muted" role="status">جارٍ تحميل الصفحة…</div>}>{route === 'assistant' ? <Assistant onCallOpen={() => setAvoraCallOpen(true)} /> : <Page />}</Suspense>
        </main>

        {/* شريط التنقل السفلي (جوال) */}
        <nav
          className="app-mobile-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line/70 bg-base/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
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
    <a href="#/home" className="vayora-brand flex items-center gap-3" aria-label="VAYORA by AUREVON — الرئيسية">
      <span className="vayora-brand-mark">
        <img src="/logo.webp" alt="" width={38} height={38} className="h-9 w-9 object-contain" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="vayora-brand-name" dir="ltr">VAYORA</span>
        <span className="text-[10px] text-muted">فايورا · منصة تعليمية ذكية</span>
        <span className="vayora-brand-parent mt-1 inline-flex items-center gap-1.5" dir="ltr"><GraduationCap size={12} strokeWidth={2.2} aria-hidden="true" /> AUREVON TECHNOLOGY</span>
      </span>
    </a>
  );
}

function HeaderButtons({ theme, onToggle, onSearch }: { theme: 'dark' | 'light'; onToggle: () => void; onSearch: () => void }) {
  return (
    <>
      <button type="button" onClick={onSearch} aria-label="البحث عن ميزة" title="البحث عن ميزة (Ctrl + K)" className="rounded-xl border border-line bg-card/60 p-2.5 text-muted transition hover:border-accent hover:text-main"><Search size={18} /></button>
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