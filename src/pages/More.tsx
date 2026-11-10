import type { LucideIcon } from 'lucide-react';
import {
  Award, BarChart3, BookOpen, Bot, Calculator, CalendarClock, CalendarCheck,
  FileBarChart, GitBranch, Layers, ListChecks, Repeat, Info,
  Settings as SettingsIcon, Timer as TimerIcon, CircleHelp, Youtube, AudioLines,
} from 'lucide-react';
import { PageTitle } from '../components/ui';

type Item = { href: string; label: string; Icon: LucideIcon; tone: string };

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
    title: 'تدريب النطق',
    description: 'تعلّم مخارج الحروف العربية واستمع إلى نماذج صوتية ثم تدرّب بصوتك.',
    items: [
      { href: '#/pronunciation', label: 'مدرّب مخارج الحروف', Icon: AudioLines, tone: 'violet' },
    ],
  },
  {
    title: 'التعلم المرئي',
    description: 'شاهد الدروس على YouTube وحلّل محتواها مع AVORA.',
    items: [
      { href: '#/youtube', label: 'فيديوهات YouTube', Icon: Youtube, tone: 'rose' },
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
      { href: '#/assistant', label: 'AVORA AI', Icon: Bot, tone: 'violet' },
      { href: '#/settings', label: 'الإعدادات', Icon: SettingsIcon, tone: 'slate' },
      { href: '#/help', label: 'شرح أزرار التطبيق', Icon: CircleHelp, tone: 'cyan' },
      { href: '#/about', label: 'عن المنصة (VAYORA)', Icon: Info, tone: 'blue' },
    ],
  },
];

export default function More() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="كل الميزات" subtitle="جميع أدوات VAYORA متاحة هنا، مرتبة حسب الاستخدام." />
      {GROUPS.map((group) => (
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
