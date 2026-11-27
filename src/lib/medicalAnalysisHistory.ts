import { db, type MedicalAnalysisRecord } from '../db';
import { assertMedicalDataWriteAllowed, getMedicalDataEpoch } from './medicalDataPrivacy';
import { sanitizeMedicalMetadata, sanitizeMedicalSourceName } from './medicalDataSanitization';

export const MEDICAL_ANALYSIS_HISTORY_LIMIT = 30;

/** Saves only the structured result and lecture metadata; source text/files are never persisted here. */
export async function saveMedicalAnalysis(
  record: Omit<MedicalAnalysisRecord, 'id' | 'createdAt'>,
  now = Date.now(),
): Promise<number> {
  const epoch = getMedicalDataEpoch();
  assertMedicalDataWriteAllowed(epoch);
  return db.transaction('rw', db.medicalAnalyses, async () => {
    assertMedicalDataWriteAllowed(epoch);
    const id = await db.medicalAnalyses.add({ ...record, subject: sanitizeMedicalMetadata(record.subject), sourceName: sanitizeMedicalSourceName(record.sourceName), createdAt: now });
    if (id == null) throw new Error('تعذّر تحديد سجل التحليل المحفوظ.');
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
  const epoch = getMedicalDataEpoch();
  assertMedicalDataWriteAllowed(epoch);
  await db.transaction('rw', db.medicalAnalyses, async () => {
    assertMedicalDataWriteAllowed(epoch);
    await db.medicalAnalyses.delete(id);
  });
}
