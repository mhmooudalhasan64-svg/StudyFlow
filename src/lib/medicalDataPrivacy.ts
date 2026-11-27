import { db } from '../db';

let medicalDataEpoch = 0;
let medicalDataClearing = false;

/** Snapshot used to prevent asynchronous work started before a clear from writing afterward. */
export function getMedicalDataEpoch(): number {
  return medicalDataEpoch;
}

export function isMedicalDataClearing(): boolean {
  return medicalDataClearing;
}

/** Removes every MASAR MEDICAL record from this device without touching study data. */
export async function clearMedicalData(): Promise<void> {
  medicalDataClearing = true;
  medicalDataEpoch += 1;
  try {
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
  } finally {
    // Also invalidate work that began while the transaction was clearing records.
    medicalDataEpoch += 1;
    medicalDataClearing = false;
  }
}
