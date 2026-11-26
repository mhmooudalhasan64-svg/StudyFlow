import { useState } from 'react';
import { ChevronLeft, ChevronRight, GitBranch, Table2 } from 'lucide-react';

interface MedicalVisualsProps {
  pathways?: { title: string; steps: string[] }[];
  comparisonTables?: { title: string; columns: string[]; rows: string[][] }[];
}

export function MedicalVisuals({ pathways = [], comparisonTables = [] }: MedicalVisualsProps) {
  const [activePathway, setActivePathway] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTable, setActiveTable] = useState(0);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);

  if (!pathways.length && !comparisonTables.length) return null;

  const pathway = pathways[activePathway];
  const table = comparisonTables[activeTable];
  const moveStep = (direction: -1 | 1) => {
    if (!pathway) return;
    setActiveStep((current) => Math.min(pathway.steps.length - 1, Math.max(0, current + direction)));
  };

  return (
    <section className="space-y-4" aria-label="المخططات والجداول الطبية">
      {pathways.length > 0 && (
        <article className="card space-y-4 !p-4 sm:!p-5">
          <div className="flex items-center gap-3">
            <span className="feature-icon feature-icon-blue"><GitBranch size={20}/></span>
            <div><h3 className="font-extrabold">المسارات والآليات</h3><p className="mt-1 text-xs text-muted">تنقّل بين خطوات المسار المستخرج من المحاضرة.</p></div>
          </div>
          {pathways.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="المسارات المتاحة">
              {pathways.map((item, index) => (
                <button key={`${item.title}-${index}`} type="button" role="tab" aria-selected={activePathway === index}
                  onClick={() => { setActivePathway(index); setActiveStep(0); }}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${activePathway === index ? 'bg-accent text-white' : 'border border-line bg-base text-muted'}`}>
                  {item.title}
                </button>
              ))}
            </div>
          )}
          {pathway && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold">{pathway.title}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {pathway.steps.map((step, index) => (
                  <button key={`${index}-${step}`} type="button" onClick={() => setActiveStep(index)}
                    aria-current={activeStep === index ? 'step' : undefined}
                    className={`flex min-h-16 items-start gap-3 rounded-xl border p-3 text-right transition ${activeStep === index ? 'border-accent bg-accent/10' : 'border-line bg-base/60 hover:border-accent/50'}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${activeStep === index ? 'bg-accent text-white' : 'bg-card text-muted'}`}>{index + 1}</span>
                    <span className="pt-1 text-xs leading-6">{step}</span>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-muted">الخطوة {activeStep + 1} من {pathway.steps.length}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moveStep(-1)} disabled={activeStep === 0} aria-label="الخطوة السابقة" className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-40"><ChevronRight size={16}/></button>
                    <button type="button" onClick={() => moveStep(1)} disabled={activeStep >= pathway.steps.length - 1} aria-label="الخطوة التالية" className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-40"><ChevronLeft size={16}/></button>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold leading-7">{pathway.steps[activeStep]}</p>
              </div>
            </div>
          )}
        </article>
      )}

      {comparisonTables.length > 0 && (
        <article className="card space-y-4 !p-4 sm:!p-5">
          <div className="flex items-center gap-3">
            <span className="feature-icon feature-icon-blue"><Table2 size={20}/></span>
            <div><h3 className="font-extrabold">جداول المقارنة التفاعلية</h3><p className="mt-1 text-xs text-muted">اختر الجدول ثم حدّد صفاً للتركيز على عناصر المقارنة.</p></div>
          </div>
          {comparisonTables.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="جداول المقارنة">
              {comparisonTables.map((item, index) => (
                <button key={`${item.title}-${index}`} type="button" role="tab" aria-selected={activeTable === index}
                  onClick={() => { setActiveTable(index); setHighlightedRow(null); }}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${activeTable === index ? 'bg-accent text-white' : 'border border-line bg-base text-muted'}`}>
                  {item.title || `جدول ${index + 1}`}
                </button>
              ))}
            </div>
          )}
          {table && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">{table.title}</h4>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[520px] border-collapse text-right text-xs">
                  <thead className="bg-base">
                    <tr>{table.columns.map((column, index) => <th key={`${column}-${index}`} scope="col" className="border-b border-line px-3 py-3 font-extrabold">{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} onClick={() => setHighlightedRow(highlightedRow === rowIndex ? null : rowIndex)}
                        aria-selected={highlightedRow === rowIndex}
                        className={`cursor-pointer transition ${highlightedRow === rowIndex ? 'bg-accent/10' : 'hover:bg-base/70'}`}>
                        {table.columns.map((_, columnIndex) => <td key={columnIndex} className="border-b border-line/70 px-3 py-3 align-top leading-6">{row[columnIndex] ?? '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted">{highlightedRow === null ? 'اضغط على أي صف لتظليله أثناء المراجعة.' : `تم تحديد الصف ${highlightedRow + 1}.`}</p>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
