import { db } from '../db';

let medicalDataEpoch = 0;

/** Snapshot used to prevent asynchronous work started before a clear from writing afterward. */
export function getMedicalDataEpoch(): number {
  return medicalDataEpoch;
}

/** Removes every MASAR MEDICAL record from this device without touching study data. */
export async function clearMedicalData(): Promise<void> {
  medicalDataEpoch += 1;
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
