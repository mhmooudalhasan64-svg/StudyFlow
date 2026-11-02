import { useEffect, useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { clamp } from '../lib/utils';

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function SubjectDot({ subjectId }: { subjectId: number | null }) {
  const subjects = useApp((s) => s.subjects);
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) return null;
  return (
    <span className="chip">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
      {subject.name}
    </span>
  );
}

export function SubjectSelect({
  value,
  onChange,
  noneLabel = '— بدون مادة —',
  id,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  noneLabel?: string;
  id?: string;
}) {
  const subjects = useApp((s) => s.subjects);
  return (
    <select
      id={id}
      className="input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    >
      <option value="">{noneLabel}</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function ProgressRing({
  pct,
  size = 140,
  stroke = 12,
  gradientId = 'ring-grad',
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  gradientId?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(pct, 0, 1);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(var(--accent))" />
            <stop offset="1" stopColor="rgb(var(--accent2))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle
          data-testid="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** حقل رقمي يُثبَّت عند فقدان التركيز أو Enter مع تقييد القيمة */
export function NumberField({
  label,
  value,
  min,
  max,
  unit,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const n = Math.round(Number(text));
    if (!Number.isFinite(n) || text.trim() === '') {
      setText(String(value));
      return;
    }
    const c = clamp(n, min, max);
    setText(String(c));
    if (c !== value) onCommit(c);
  };

  return (
    <label className="block">
      <span className="label">
        {label}
        {unit ? ` (${unit})` : ''}
      </span>
      <input
        className="input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
}
