export interface MedicalAnalysisResult {
  title?: string;
  summary?: string;
  learningObjectives?: string[];
  keyPoints?: string[];
  terminology?: { term: string; prefix: string; root: string; suffix: string; meaning: string; evidenceQuote: string }[];
  highYield?: { fact: string; why: string; evidenceQuote: string }[];
  comparisonTables?: { title: string; columns: string[]; rows: string[][] }[];
  pathways?: { title: string; steps: string[] }[];
  reviewQuestions?: { question: string; answer: string; explanation: string }[];
  limitations?: string[];
}

export function parseMedicalAnalysis(raw: string, sourceText: string): MedicalAnalysisResult {
  if (typeof raw !== 'string' || raw.length > 100_000 || typeof sourceText !== 'string' || sourceText.length > 8_000) {
    throw new Error('حجم بيانات التحليل غير صالح. قلّل حجم المحاضرة وأعد المحاولة.');
  }
  const cleaned = raw.trim().replace(/^`{3}(?:json)?\s*/i, '').replace(/\s*`{3}$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('وصل رد غير منسق من دليل. أعد المحاولة.');

  let value: unknown;
  try {
    value = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error('تعذّر قراءة نتائج التحليل. أعد المحاولة أو قلّل حجم النص.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('بنية نتائج التحليل غير صالحة.');
  }

  const data = value as Record<string, unknown>;
  const list = (item: unknown): unknown[] => Array.isArray(item) ? item : [];
  const str = (item: unknown, max = 1200): string =>
    typeof item === 'string' ? item.trim().slice(0, max) : '';
  const strings = (item: unknown, maxItems: number, maxLength = 500): string[] =>
    list(item).slice(0, maxItems * 2).filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => str(entry, maxLength)).filter(Boolean).slice(0, maxItems);
  const objects = (item: unknown): Record<string, unknown>[] =>
    list(item).slice(0, 40).filter((entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === 'object' && !Array.isArray(entry));

  const terminology = objects(data.terminology).map((item) => ({
    term: str(item.term, 160),
    prefix: str(item.prefix, 100),
    root: str(item.root, 100),
    suffix: str(item.suffix, 100),
    meaning: str(item.meaning, 500),
    evidenceQuote: str(item.evidenceQuote, 500),
  })).filter((item) =>
    item.term && item.meaning && item.evidenceQuote && sourceText.includes(item.evidenceQuote)
  ).slice(0, 15);

  const highYield = objects(data.highYield).map((item) => ({
    fact: str(item.fact, 600),
    why: str(item.why, 500),
    evidenceQuote: str(item.evidenceQuote, 500),
  })).filter((item) =>
    item.fact && item.evidenceQuote && sourceText.includes(item.evidenceQuote)
  ).slice(0, 10);

  const comparisonTables = objects(data.comparisonTables).map((item) => {
    const columns = strings(item.columns, 6, 100);
    const rows = list(item.rows).slice(0, 40).filter(Array.isArray)
      .map((row) => (row as unknown[]).map((cell) => str(cell, 300)))
      .filter((row) => columns.length > 0 && row.length === columns.length && row.every(Boolean))
      .slice(0, 20);
    return { title: str(item.title, 160), columns, rows };
  }).filter((item) => item.title && item.columns.length > 0 && item.rows.length > 0).slice(0, 4);

  const pathways = objects(data.pathways).map((item) => ({
    title: str(item.title, 160),
    steps: strings(item.steps, 12, 300),
  })).filter((item) => item.title && item.steps.length > 0).slice(0, 4);

  const reviewQuestions = objects(data.reviewQuestions).map((item) => ({
    question: str(item.question, 300),
    answer: str(item.answer, 300),
    explanation: str(item.explanation, 500),
  })).filter((item) => item.question && item.answer).slice(0, 8);

  return {
    title: str(data.title, 160),
    summary: str(data.summary, 1600),
    learningObjectives: strings(data.learningObjectives, 8),
    keyPoints: strings(data.keyPoints, 12),
    terminology,
    highYield,
    comparisonTables,
    pathways,
    reviewQuestions,
    limitations: strings(data.limitations, 12),
  };
}
