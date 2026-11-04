/**
 * استخراج النص من ملفات PDF و Word (docx) و Excel (xlsx) و txt/csv داخل المتصفح.
 * لا يُرفع الملف نفسه إلى أي خادم: يُرسل نصّه المقتطع فقط مع سؤال الطالب إلى المساعد.
 * المكتبات الثقيلة تُحمَّل عند الحاجة فقط حتى لا يثقل التطبيق.
 */

export type FileKind = 'pdf' | 'docx' | 'xlsx' | 'text';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 ميغابايت
export const MAX_TEXT_CHARS = 8000; // حد النص المرسل إلى المساعد
export const ACCEPT = '.pdf,.docx,.xlsx,.txt,.csv';

const MAX_PDF_PAGES = 60;
const MAX_SHEETS = 8;
const MAX_ROWS = 400;

export interface ExtractedFile {
  name: string;
  text: string;
  /** هل اقتُطع النص لطوله */
  truncated: boolean;
  /** طول النص الأصلي قبل الاقتطاع */
  originalChars: number;
}

export class FileTextError extends Error {}

export function detectKind(fileName: string): FileKind | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'txt' || ext === 'csv') return 'text';
  return null;
}

/** يوحّد المسافات والأسطر الفارغة */
export function normalizeText(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function clipText(text: string, max: number = MAX_TEXT_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max), truncated: true };
}

/** يحوّل صفوف جدول إلى نص: خلايا مفصولة بـ « | » وكل صف في سطر */
export function rowsToText(rows: readonly (readonly unknown[])[], maxRows = MAX_ROWS): string {
  return rows
    .slice(0, maxRows)
    .map((row) => row.map((c) => (c === null || c === undefined ? '' : String(c).trim())).join(' | ').replace(/(\s\|\s)+$/g, ''))
    .filter((line) => line.trim() !== '')
    .join('\n');
}

async function readPdf(file: File): Promise<string> {
  // @ts-ignore: مسار النسخة القديمة (legacy) يدعم متصفحات أكثر
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // @ts-ignore: ‎?url يعيد عنوان ملف العامل (worker) من Vite
  const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default as string;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
  let out = '';
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out +=
      (content.items as { str?: string; hasEOL?: boolean }[])
        .map((it) => (typeof it.str === 'string' ? it.str + (it.hasEOL ? '\n' : ' ') : ''))
        .join('') + '\n\n';
    if (out.length > MAX_TEXT_CHARS * 3) break; // يكفي ما جمعناه
  }
  return out;
}

async function readDocx(file: File): Promise<string> {
  // @ts-ignore: نسخة المتصفح من mammoth
  const mod = await import('mammoth/mammoth.browser');
  const mammoth = (mod as { default?: unknown }).default ?? mod;
  const res = await (mammoth as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }).extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return res.value;
}

async function readXlsx(file: File): Promise<string> {
  // @ts-ignore: read-excel-file
  const mod = await import('read-excel-file');
  const read = ((mod as { default?: unknown }).default ?? mod) as (
    f: File,
    o?: { sheet?: string | number; getSheets?: boolean },
  ) => Promise<unknown[][] | { name: string }[]>;

  const sheets = (await read(file, { getSheets: true })) as { name: string }[];
  const parts: string[] = [];
  for (const s of sheets.slice(0, MAX_SHEETS)) {
    const rows = (await read(file, { sheet: s.name })) as unknown[][];
    const text = rowsToText(rows);
    if (text) parts.push(`## ورقة: ${s.name}\n${text}`);
  }
  return parts.join('\n\n');
}

export async function extractFileText(file: File): Promise<ExtractedFile> {
  const kind = detectKind(file.name);
  if (!kind) {
    throw new FileTextError('نوع الملف غير مدعوم. المدعوم: PDF و Word (docx) و Excel (xlsx) و txt و csv.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new FileTextError('الملف كبير (الحد 10 ميغابايت).');
  }

  let raw: string;
  try {
    raw = kind === 'pdf' ? await readPdf(file) : kind === 'docx' ? await readDocx(file) : kind === 'xlsx' ? await readXlsx(file) : await file.text();
  } catch (e) {
    if (e instanceof FileTextError) throw e;
    throw new FileTextError('تعذّرت قراءة الملف. تأكد أنه سليم وغير محمي بكلمة سر.');
  }

  const full = normalizeText(raw);
  if (full.length < 20) {
    throw new FileTextError(
      kind === 'pdf'
        ? 'لا يوجد نص قابل للقراءة في هذا الـPDF. غالباً هو صور ممسوحة ضوئياً (سكان)، وهذا لا أستطيع قراءته.'
        : 'الملف فارغ أو لا يحتوي نصاً.',
    );
  }
  const { text, truncated } = clipText(full);
  return { name: file.name, text, truncated, originalChars: full.length };
}
