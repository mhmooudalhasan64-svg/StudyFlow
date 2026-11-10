import { useEffect, useState, type ComponentType } from 'react';
import {
  Award, BarChart3, BookOpen, Bot, Calculator, CalendarClock, CalendarCheck,
  FileBarChart, GitBranch, Layers, ListChecks, Repeat, Info,
  Settings as SettingsIcon, Timer as TimerIcon, CircleHelp,
} from 'lucide-react';
import { PageTitle } from '../components/ui';

type Item = { href: string; label: string; Icon: ComponentType<{ size?: number; className?: string }> };

const GROUPS: { title: string; description: string; items: Item[] }[] = [
  {
    title: 'التعلم وتنظيم الدراسة',
    description: 'خطط دراستك، تابع المنهاج، وراجع دروسك.',
    items: [
      { href: '#/curriculum', label: 'خطة إنهاء المنهاج', Icon: CalendarCheck },
      { href: '#/library', label: 'مكتبة الكتب', Icon: BookOpen },
      { href: '#/mindmap', label: 'الخرائط الذهنية التفاعلية', Icon: GitBranch },
      { href: '#/review', label: 'المراجعة الذكية', Icon: Repeat },
      { href: '#/cards', label: 'البطاقات التعليمية', Icon: Layers },
    ],
  },
  {
    title: 'الاختبارات والامتحانات',
    description: 'تدرّب، اختبر مستواك، واستعد للامتحان.',
    items: [
      { href: '#/exams', label: 'الامتحانات', Icon: CalendarClock },
      { href: '#/quiz', label: 'بنك الأسئلة والاختبارات', Icon: ListChecks },
      { href: '#/simulator', label: 'محاكي الامتحان', Icon: TimerIcon },
      { href: '#/calc', label: 'حاسبة العلامات', Icon: Calculator },
    ],
  },
  {
    title: 'متابعة التقدم',
    description: 'راجع إنجازاتك واطّلع على تقاريرك.',
    items: [
      { href: '#/achievements', label: 'الإنجازات', Icon: Award },
      { href: '#/reports', label: 'تقارير الدراسة', Icon: FileBarChart },
      { href: '#/stats', label: 'الإحصاءات', Icon: BarChart3 },
    ],
  },
  {
    title: 'المساعدة والتطبيق',
    description: 'المساعد الذكي والإعدادات ومعلومات التطبيق.',
    items: [
      { href: '#/assistant', label: 'المعلّم الذكي', Icon: Bot },
      { href: '#/settings', label: 'الإعدادات', Icon: SettingsIcon },
      { href: '#/help', label: 'شرح أزرار التطبيق', Icon: CircleHelp },
      { href: '#/about', label: 'عن فايورا', Icon: Info },
    ],
  },
];

export default function More() {
  const [simpleMode, setSimpleMode] = useState(() => { try { return localStorage.getItem('studyflow-ui-mode') !== 'advanced'; } catch { return true; } });
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const update = () => { try { setSimpleMode(localStorage.getItem('studyflow-ui-mode') !== 'advanced'); } catch { /* الوضع الحالي */ } };
    window.addEventListener('studyflow:mode-change', update);
    return () => window.removeEventListener('studyflow:mode-change', update);
  }, []);
  const visibleGroups = simpleMode && !showAll
    ? GROUPS.slice(0, 1).map((group) => ({ ...group, items: group.items.filter((item) => ['#/curriculum', '#/library', '#/review'].includes(item.href)) }))
    : GROUPS;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="كل الميزات" subtitle={simpleMode ? "الوضع البسيط يعرض الأدوات الأساسية. بقية الميزات محفوظة ويمكن إظهارها." : "كل أدواتك مرتبة في أقسام واضحة."} />
      {simpleMode && <section className="card flex items-center justify-between gap-3 border-accent/25"><div><p className="font-bold">الوضع البسيط مفعّل</p><p className="mt-1 text-xs text-muted">أظهرنا الأدوات الأساسية فقط لتقليل الازدحام.</p></div><button type="button" className="btn btn-primary shrink-0 !px-3 !py-2 text-xs" onClick={() => setShowAll((v) => !v)}>{showAll ? 'إخفاء الأدوات الإضافية' : 'عرض جميع الميزات'}</button></section>}
      {visibleGroups.map((group) => (
        <section key={group.title} className="space-y-3">
          <div>
            <h2 className="font-bold">{group.title}</h2>
            <p className="mt-1 text-xs text-muted">{group.description}</p>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {group.items.map(({ href, label, Icon }) => (
              <li key={href}>
                <a href={href} className="card flex min-h-14 items-center gap-3 !p-3.5 transition hover:border-accent">
                  <Icon size={20} className="shrink-0 text-accent" />
                  <span className="font-medium">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
