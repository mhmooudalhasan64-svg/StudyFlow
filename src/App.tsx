import { useEffect, useState, type ComponentType } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Calculator as CalcIcon,
  CalendarCheck,
  CalendarClock,
  FileBarChart,
  GitBranch,
  Landmark,
  Layers,
  LayoutDashboard,
  ListChecks,
  MoreHorizontal,
  Moon,
  Repeat,
  Settings as SettingsIcon,
  Sun,
  Timer as TimerIcon,
  WifiOff,
} from 'lucide-react';
import { useApp } from './store';
import { useHashRoute, type Route } from './lib/route';
import Dashboard from './pages/Dashboard';
import About, { Intro } from './pages/About';
import { AlarmRinger } from './components/Alarms';
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

type NavItem = { route: Route; label: string; Icon: ComponentType<{ size?: number }> };

/** الشريط الجانبي (شاشات كبيرة) */
const NAV: NavItem[] = [
  { route: 'home', label: 'الرئيسية', Icon: LayoutDashboard },
  { route: 'plan', label: 'الخطة', Icon: CalendarCheck },
  { route: 'timer', label: 'المؤقت', Icon: TimerIcon },
  { route: 'bac', label: 'البكالوريا', Icon: Landmark },
  { route: 'library', label: 'مكتبة الكتب', Icon: BookOpen },
  { route: 'mindmap', label: 'الخرائط الذهنية', Icon: GitBranch },
  { route: 'quiz', label: 'الأسئلة والاختبارات', Icon: ListChecks },
  { route: 'curriculum', label: 'خطة المنهاج', Icon: CalendarCheck },
  { route: 'review', label: 'المراجعة الذكية', Icon: Repeat },
  { route: 'cards', label: 'البطاقات', Icon: Layers },
  { route: 'simulator', label: 'محاكي الامتحان', Icon: TimerIcon },
  { route: 'calc', label: 'حاسبة العلامات', Icon: CalcIcon },
  { route: 'exams', label: 'الامتحانات', Icon: CalendarClock },
  { route: 'achievements', label: 'الإنجازات', Icon: Award },
  { route: 'reports', label: 'التقارير', Icon: FileBarChart },
  { route: 'stats', label: 'إحصاءات', Icon: BarChart3 },
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
  const route = useHashRoute();
  const online = useOnline();

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
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
      <AlarmRinger />
      {route !== 'assistant' && (
        <a
          href="#/assistant"
          aria-label="افتح المساعد الدراسي SKOVA AI"
          title="اسأل SKOVA AI"
          className="fixed bottom-24 left-4 z-30 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-gradient-to-l from-[#17131f] via-[#342052] to-[#18334c] px-4 py-3 text-white shadow-xl shadow-purple-950/30 transition hover:-translate-y-1 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-400 md:bottom-6 md:left-6"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10">
            <Bot size={20} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#211a30] bg-emerald-400" />
          </span>
          <span className="flex flex-col text-right leading-tight">
            <span className="text-sm font-extrabold tracking-wide">SKOVA AI</span>
            <span className="text-[10px] text-white/75">مساعدك الدراسي</span>
          </span>
        </a>
      )}
      {/* الشريط الجانبي (شاشات كبيرة) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto p-4 md:flex">
        <Brand />
        <nav className="mt-4 flex flex-col gap-1" aria-label="التنقل الرئيسي">
          {NAV.map(({ route: r, label, Icon }) => (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={route === r ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                route === r
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
          <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ترويسة الجوال */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line/70 bg-base/80 px-4 py-3 backdrop-blur-md md:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            {!online && <OfflineChip />}
            <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} />
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10" key={route}>
          <Page />
        </main>

        {/* شريط التنقل السفلي (جوال) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line/70 bg-base/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
          aria-label="التنقل الرئيسي"
        >
          {MOBILE_NAV.map(({ route: r, label, Icon }) => {
            const active = route === r || (r === 'more' && !MOBILE_NAV.some((n) => n.route === route));
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

function HeaderButtons({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  return (
    <>
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
