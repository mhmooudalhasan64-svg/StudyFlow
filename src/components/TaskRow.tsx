import { Check, Trash2 } from 'lucide-react';
import type { Task } from '../db';
import { useApp } from '../store';
import { formatMinutes } from '../lib/utils';
import { SubjectDot } from './ui';

export function TaskRow({ task, deletable = false }: { task: Task; deletable?: boolean }) {
  const toggle = useApp((s) => s.toggleTask);
  const remove = useApp((s) => s.removeTask);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line/70 bg-base/40 px-3 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? 'إلغاء الإنجاز' : 'تحديد كمنجز'}
        onClick={() => void toggle(task.id)}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition ${
          task.done ? 'border-transparent bg-gradient-to-br from-accent to-accent2 text-onaccent' : 'border-line hover:border-accent'
        }`}
      >
        {task.done && <Check size={16} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${task.done ? 'text-muted line-through' : ''}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <SubjectDot subjectId={task.subjectId} />
          <span className="chip">{formatMinutes(task.minutes)}</span>
        </div>
      </div>
      {deletable && (
        <button
          type="button"
          aria-label="حذف المهمة"
          onClick={() => void remove(task.id)}
          className="rounded-lg p-2 text-muted transition hover:bg-bad/10 hover:text-bad"
        >
          <Trash2 size={16} />
        </button>
      )}
    </li>
  );
}
