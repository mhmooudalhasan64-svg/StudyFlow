import { useEffect, type ComponentType } from 'react';
import {
  BarChart3,
  CalendarCheck,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Timer as TimerIcon,
} from 'lucide-react';
import { useApp } from './store';
import { useHashRoute, type Route } from './lib/route';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import TimerPage from './pages/TimerPage';
import Exams from './pages/Exams';
import Quiz from './pages/Quiz';
import Stats from './pages/Stats';
import SettingsPage from './pages/SettingsPage';

const NAV: { route: Route; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { route: 'home', label: 'الرئيسية', Icon: LayoutDashboard },
  { route: 'plan', label: 'الخطة', Icon: CalendarCheck },
  { route: 'timer', label: 'المؤقت', Icon: TimerIcon },
  { route: 'exams', label: 'الامتحانات', Icon: CalendarClock },
  { route: 'quiz', label: 'الأسئلة', Icon: ListChecks },
  { route: 'stats', label: 'إحصاءات', Icon: BarChart3 },
];

const PAGES: Record<Route, ComponentType> = {
  home: Dashboard,
  plan: Planner,
  timer: TimerPage,
  exams: Exams,
  quiz: Quiz,
  stats: Stats,
  settings: SettingsPage,
};

export default function App() {
  const init = useApp((s) => s.init);
  const ready = useApp((s) => s.ready);
  const tick = useApp((s) => s.tick);
  const theme = useApp((s) => s.settings.theme);
  const updateSettings = useApp((s) => s.updateSettings);
  const route = useHashRoute();

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

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
      {/* الشريط الجانبي (شاشات كبيرة) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 p-4 md:flex">
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
        <div className="mt-auto flex gap-2">
          <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ترويسة الجوال */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line/70 bg-base/80 px-4 py-3 backdrop-blur-md md:hidden">
          <Brand />
          <div className="flex gap-1">
            <HeaderButtons theme={theme} onToggle={() => void updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} />
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10" key={route}>
          <Page />
        </main>

        {/* شريط التنقل السفلي (جوال) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line/70 bg-base/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
          aria-label="التنقل الرئيسي"
        >
          {NAV.map(({ route: r, label, Icon }) => (
            <a
              key={r}
              href={`#/${r}`}
              aria-current={route === r ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition ${
                route === r ? 'text-accent' : 'text-muted'
              }`}
            >
              <Icon size={20} />
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <a href="#/home" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-onaccent">
        <GraduationCap size={20} />
      </span>
      <span className="text-lg font-extrabold tracking-wide">StudyFlow</span>
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
