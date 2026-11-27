import { db, type MedicalAnalysisRecord } from '../db';

export const MEDICAL_ANALYSIS_HISTORY_LIMIT = 30;

/** Saves only the structured result and lecture metadata; source text/files are never persisted here. */
export async function saveMedicalAnalysis(
  record: Omit<MedicalAnalysisRecord, 'id' | 'createdAt'>,
  now = Date.now(),
): Promise<number> {
  return db.transaction('rw', db.medicalAnalyses, async () => {
    const id = await db.medicalAnalyses.add({ ...record, createdAt: now });
    const count = await db.medicalAnalyses.count();
    if (count > MEDICAL_ANALYSIS_HISTORY_LIMIT) {
      const oldest = await db.medicalAnalyses.orderBy('createdAt')
        .limit(count - MEDICAL_ANALYSIS_HISTORY_LIMIT).primaryKeys();
      await db.medicalAnalyses.bulkDelete(oldest);
    }
    return id;
  });
}

export async function listMedicalAnalyses(): Promise<MedicalAnalysisRecord[]> {
  return db.medicalAnalyses.orderBy('createdAt').reverse().limit(MEDICAL_ANALYSIS_HISTORY_LIMIT).toArray();
}

export async function deleteMedicalAnalysis(id: number): Promise<void> {
  await db.medicalAnalyses.delete(id);
}
