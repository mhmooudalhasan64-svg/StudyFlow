import { useEffect, useState, type ComponentType } from 'react';
import {
  Award, BarChart3, BookOpen, Bot, Calculator, CalendarClock, CalendarCheck,
  FileBarChart, GitBranch, Layers, ListChecks, Repeat, Info,
  Settings as SettingsIcon, Timer as TimerIcon, CircleHelp,
} from 'lucide-react';
import { PageTitle } from '../components/ui';

type Item = { href: string; label: string; Icon: ComponentType<{ size?: number; className?: string }>; tone: string };

const GROUPS: { title: string; description: string; items: Item[] }[] = [
  {
    title: 'التعلم وتنظيم الدراسة',
    description: 'خطط دراستك، تابع المنهاج، وراجع دروسك.',
    items: [
      { href: '#/curriculum', label: 'خطة إنهاء المنهاج', Icon: CalendarCheck, tone: 'cyan' },
      { href: '#/library', label: 'مكتبة الكتب', Icon: BookOpen, tone: 'blue' },
      { href: '#/mindmap', label: 'الخرائط الذهنية التفاعلية', Icon: GitBranch, tone: 'violet' },
      { href: '#/review', label: 'المراجعة الذكية', Icon: Repeat, tone: 'teal' },
      { href: '#/cards', label: 'البطاقات التعليمية', Icon: Layers, tone: 'indigo' },
    ],
  },
  {
    title: 'الاختبارات والامتحانات',
    description: 'تدرّب، اختبر مستواك، واستعد للامتحان.',
    items: [
      { href: '#/exams', label: 'الامتحانات', Icon: CalendarClock, tone: 'amber' },
      { href: '#/quiz', label: 'بنك الأسئلة والاختبارات', Icon: ListChecks, tone: 'emerald' },
      { href: '#/simulator', label: 'محاكي الامتحان', Icon: TimerIcon, tone: 'orange' },
      { href: '#/calc', label: 'حاسبة العلامات', Icon: Calculator, tone: 'sky' },
    ],
  },
  {
    title: 'متابعة التقدم',
    description: 'راجع إنجازاتك واطّلع على تقاريرك.',
    items: [
      { href: '#/achievements', label: 'الإنجازات', Icon: Award, tone: 'yellow' },
      { href: '#/reports', label: 'تقارير الدراسة', Icon: FileBarChart, tone: 'purple' },
      { href: '#/stats', label: 'الإحصاءات', Icon: BarChart3, tone: 'rose' },
    ],
  },
  {
    title: 'المساعدة والتطبيق',
    description: 'المساعد الذكي والإعدادات ومعلومات التطبيق.',
    items: [
      { href: '#/assistant', label: 'SKOVA AI', Icon: Bot, tone: 'violet' },
      { href: '#/settings', label: 'الإعدادات', Icon: SettingsIcon, tone: 'slate' },
      { href: '#/help', label: 'شرح أزرار التطبيق', Icon: CircleHelp, tone: 'cyan' },
      { href: '#/about', label: 'عن التطبيق (متجر سكوڤا)', Icon: Info, tone: 'blue' },
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
            {group.items.map(({ href, label, Icon, tone }) => (
              <li key={href}>
                <a href={href} className="card group flex min-h-[4.6rem] items-center gap-3 !p-3.5 transition hover:-translate-y-0.5 hover:border-accent">
                  <span className={`feature-icon feature-icon-${tone}`} aria-hidden="true"><Icon size={21} /></span>
                  <span className="min-w-0 flex-1 font-semibold">{label}</span>
                  <span className="text-muted opacity-0 transition group-hover:translate-x-[-2px] group-hover:opacity-100" aria-hidden="true">←</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
