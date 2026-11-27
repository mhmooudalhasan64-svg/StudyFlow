import { db } from '../db';

/** Removes every MASAR MEDICAL record from this device without touching study data. */
export async function clearMedicalData(): Promise<void> {
  await db.transaction(
    'rw',
    db.medicalCards,
    db.medicalQuestions,
    db.medicalSimulations,
    db.medicalAnalyses,
    async () => {
      await Promise.all([
        db.medicalCards.clear(),
        db.medicalQuestions.clear(),
        db.medicalSimulations.clear(),
        db.medicalAnalyses.clear(),
      ]);
    },
  );
}
