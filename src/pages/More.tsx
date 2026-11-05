import type { ComponentType } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Calculator,
  CalendarClock,
  CalendarCheck,
  FileBarChart,
  GitBranch,
  Layers,
  ListChecks,
  Repeat,
  Info,
  Settings as SettingsIcon,
  Timer as TimerIcon,
} from 'lucide-react';
import { PageTitle } from '../components/ui';

const ITEMS: { href: string; label: string; Icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { href: '#/exams', label: 'الامتحانات', Icon: CalendarClock },
  { href: '#/quiz', label: 'بنك الأسئلة والاختبارات', Icon: ListChecks },
  { href: '#/library', label: 'مكتبة الكتب', Icon: BookOpen },
  { href: '#/mindmap', label: 'الخرائط الذهنية التفاعلية', Icon: GitBranch },
  { href: '#/curriculum', label: 'خطة إنهاء المنهاج', Icon: CalendarCheck },
  { href: '#/review', label: 'المراجعة الذكية', Icon: Repeat },
  { href: '#/cards', label: 'البطاقات التعليمية', Icon: Layers },
  { href: '#/simulator', label: 'محاكي الامتحان', Icon: TimerIcon },
  { href: '#/calc', label: 'حاسبة العلامات', Icon: Calculator },
  { href: '#/achievements', label: 'الإنجازات', Icon: Award },
  { href: '#/reports', label: 'تقارير الدراسة', Icon: FileBarChart },
  { href: '#/stats', label: 'الإحصاءات', Icon: BarChart3 },
  { href: '#/assistant', label: 'SKOVA AI', Icon: Bot },
  { href: '#/settings', label: 'الإعدادات', Icon: SettingsIcon },
  { href: '#/about', label: 'عن التطبيق (متجر سكوڤا)', Icon: Info },
];

export default function More() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="المزيد" />
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ITEMS.map(({ href, label, Icon }) => (
          <li key={href}>
            <a href={href} className="card flex items-center gap-3 !p-3.5 transition hover:border-accent">
              <Icon size={20} className="text-accent" />
              <span className="font-medium">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
