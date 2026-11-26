import { db, type MedicalFlashcard } from '../db';

export interface MedicalCardSource {
  title?: string;
  terminology?: { term: string; prefix?: string; root?: string; suffix?: string; meaning: string; evidenceQuote?: string }[];
  highYield?: { fact: string; why?: string; evidenceQuote?: string }[];
}

export type MedicalCardRating = 'again' | 'hard' | 'good' | 'easy';

export function buildMedicalFlashcards(args: {
  analysis: MedicalCardSource;
  college: string;
  year: string;
  subject: string;
  sourceName: string;
  now?: number;
}): Omit<MedicalFlashcard, 'id'>[] {
  const now = args.now ?? Date.now();
  const cards: Omit<MedicalFlashcard, 'id'>[] = [];
  const add = (category: MedicalFlashcard['category'], front: string, back: string, suffix: string) => {
    const cleanFront = front.trim();
    const cleanBack = back.trim();
    if (!cleanFront || !cleanBack) return;
    const cardKey = [args.college, args.year, args.subject, args.sourceName, category, suffix].join('|').toLocaleLowerCase();
    cards.push({
      cardKey, college: args.college, year: args.year, subject: args.subject.trim(),
      sourceName: args.sourceName, category, front: cleanFront, back: cleanBack,
      createdAt: now, dueAt: now, intervalDays: 0, reps: 0, lastReviewedAt: null,
    });
  };

  for (const item of args.analysis.terminology ?? []) {
    const parts = [
      item.prefix ? `Prefix: ${item.prefix}` : '',
      item.root ? `Root: ${item.root}` : '',
      item.suffix ? `Suffix: ${item.suffix}` : '',
    ].filter(Boolean).join(' · ');
    const back = [item.meaning, parts, item.evidenceQuote ? `من المحاضرة: «${item.evidenceQuote}»` : ''].filter(Boolean).join('\n\n');
    add('term', `اشرح المصطلح الطبي: ${item.term}`, back, item.term);
  }

  for (const item of args.analysis.highYield ?? []) {
    const prompt = item.why
      ? `ما المعلومة الأساسية التي تفسّر: ${item.why}`
      : `استرجع المعلومة عالية الأهمية: ${item.fact.slice(0, 110)}`;
    const back = [item.fact, item.why, item.evidenceQuote ? `من المحاضرة: «${item.evidenceQuote}»` : ''].filter(Boolean).join('\n\n');
    add('high_yield', prompt, back, item.fact);
  }
  return cards;
}

/** سلم مراجعة محافظ: 1، 3، 7، 14، 30، 60، 90 يوماً. */
export function scheduleMedicalReview(
  card: Pick<MedicalFlashcard, 'intervalDays' | 'reps'>,
  rating: MedicalCardRating,
  now = Date.now(),
): Pick<MedicalFlashcard, 'dueAt' | 'intervalDays' | 'reps' | 'lastReviewedAt' | 'lastRating'> {
  const goodIntervals = [1, 3, 7, 14, 30, 60, 90];
  const easyIntervals = [3, 7, 14, 30, 60, 90];
  const previousReps = Number.isInteger(card.reps) && card.reps >= 0 ? card.reps : 0;
  const previousInterval = Number.isFinite(card.intervalDays) && card.intervalDays > 0 ? card.intervalDays : 1;
  let intervalDays: number;
  let reps: number;
  if (rating === 'again') {
    intervalDays = 1;
    reps = 0;
  } else if (rating === 'hard') {
    intervalDays = Math.min(90, Math.max(1, Math.ceil(previousInterval * 1.2)));
    reps = previousReps;
  } else {
    const sequence = rating === 'easy' ? easyIntervals : goodIntervals;
    intervalDays = sequence[Math.min(previousReps, sequence.length - 1)];
    reps = previousReps + 1;
  }
  return {
    dueAt: now + intervalDays * 24 * 60 * 60 * 1000,
    intervalDays, reps, lastReviewedAt: now, lastRating: rating,
  };
}

export async function saveMedicalFlashcards(cards: Omit<MedicalFlashcard, 'id'>[]): Promise<number> {
  let added = 0;
  await db.transaction('rw', db.medicalCards, async () => {
    for (const card of cards) {
      const existing = await db.medicalCards.where('cardKey').equals(card.cardKey).first();
      if (!existing) {
        await db.medicalCards.add(card);
        added += 1;
      }
    }
  });
  return added;
}
