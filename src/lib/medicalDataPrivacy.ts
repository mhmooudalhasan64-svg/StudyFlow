import { db } from '../db';

let medicalDataEpoch = 0;
let medicalDataClearing = false;
let medicalDataClearPromise: Promise<void> | null = null;

/** Snapshot used to prevent asynchronous work started before a clear from writing afterward. */
export function getMedicalDataEpoch(): number {
  return medicalDataEpoch;
}

export function isMedicalDataClearing(): boolean {
  return medicalDataClearing;
}

/** Throws when a medical write belongs to work invalidated by a local data purge. */
export function assertMedicalDataWriteAllowed(expectedEpoch: number): void {
  if (medicalDataClearing || expectedEpoch !== medicalDataEpoch) {
    throw new Error('Medical data is being cleared or this operation is stale.');
  }
}

/** Removes every MASAR MEDICAL record from this device without touching study data. */
export function clearMedicalData(): Promise<void> {
  // Coalesce rapid/repeated clear requests into one transaction. Otherwise an
  // earlier clear could release the lock while a second clear is still queued.
  if (medicalDataClearPromise) return medicalDataClearPromise;

  medicalDataClearing = true;
  medicalDataEpoch += 1;
  medicalDataClearPromise = (async () => {
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
      medicalDataClearPromise = null;
    }
  })();
  return medicalDataClearPromise;
}
