import { db } from '../db';

/** الجداول التي تدخل في النسخة الاحتياطية. الكتب (ملفات PDF) خارجها لكبر حجمها. */
export const BACKUP_TABLES = [
  'subjects',
  'tasks',
  'sessions',
  'exams',
  'questions',
  'attempts',
  'settings',
  'lessons',
  'cards',
  'marks',
  'results',
] as const;

export interface BackupFile {
  app: 'studyflow';
  version: 1;
  exportedAt: number;
  tables: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const name of BACKUP_TABLES) tables[name] = await db.table(name).toArray();
  const file: BackupFile = { app: 'studyflow', version: 1, exportedAt: Date.now(), tables };
  return JSON.stringify(file);
}

/** يتحقق من النص ويرمي خطأ بالعربية إن لم يكن نسخة صالحة */
export function parseBackup(json: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('الملف ليس نسخة احتياطية صالحة');
  }
  const o = raw as Partial<BackupFile> | null;
  if (!o || o.app !== 'studyflow' || o.version !== 1 || typeof o.tables !== 'object' || o.tables === null)
    throw new Error('الملف ليس نسخة احتياطية من StudyFlow');
  for (const name of BACKUP_TABLES) {
    if (!Array.isArray(o.tables[name])) throw new Error(`النسخة ناقصة: الجدول «${name}» مفقود`);
  }
  return o as BackupFile;
}

/** يستبدل بيانات التطبيق بمحتوى النسخة (الكتب لا تُمسّ) */
export async function importBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', BACKUP_TABLES.map((n) => db.table(n)), async () => {
    for (const name of BACKUP_TABLES) {
      const t = db.table(name);
      await t.clear();
      const rows = file.tables[name];
      if (rows.length > 0) await t.bulkPut(rows);
    }
  });
}
