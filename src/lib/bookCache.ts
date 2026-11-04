import { db, type BookText } from '../db';

const MAX_SAVED = 5; // نحتفظ بآخر 5 كتب فقط حتى لا تمتلئ ذاكرة الهاتف

export function bookKey(file: { name: string; size: number; lastModified: number }): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export async function getBookText(key: string): Promise<BookText | undefined> {
  return db.bookTexts.get(key);
}

export async function saveBookText(key: string, name: string, pages: string[]): Promise<void> {
  await db.bookTexts.put({ key, name, pages, at: Date.now() });
  const all = await db.bookTexts.orderBy('at').reverse().primaryKeys();
  if (all.length > MAX_SAVED) await db.bookTexts.bulkDelete(all.slice(MAX_SAVED));
}

export interface SavedBook {
  key: string;
  name: string;
  at: number;
  pageCount: number;
}

export async function listBookTexts(): Promise<SavedBook[]> {
  const rows = await db.bookTexts.orderBy('at').reverse().toArray();
  return rows.map((r) => ({ key: r.key, name: r.name, at: r.at, pageCount: r.pages.length }));
}

export async function deleteBookText(key: string): Promise<void> {
  await db.bookTexts.delete(key);
}
