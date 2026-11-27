import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import {
  deleteMedicalAnalysis,
  listMedicalAnalyses,
  MEDICAL_ANALYSIS_HISTORY_LIMIT,
  saveMedicalAnalysis,
} from './medicalAnalysisHistory';

const result = { title: 'Cardiac function', summary: 'Study summary', keyPoints: ['Point'] };

describe('local medical analysis history', () => {
  beforeEach(async () => {
    await db.medicalAnalyses.clear();
  });

  it('stores structured analysis and metadata without storing the original lecture text', async () => {
    const id = await saveMedicalAnalysis({
      college: 'الطب البشري',
      year: '2',
      subject: 'الفيزيولوجيا',
      sourceName: 'Patient name: Jane Doe.pdf',
      analysis: result,
    }, 100);

    const stored = await db.medicalAnalyses.get(id);
    expect(stored?.analysis).toEqual(result);
    expect(stored?.sourceName).toBe('Patient name: [personal details removed].pdf');
    expect(stored?.createdAt).toBe(100);
    expect(stored).not.toHaveProperty('sourceText');
    expect(stored).not.toHaveProperty('file');
  });

  it('lists newest analyses first and deletes a selected record', async () => {
    const first = await saveMedicalAnalysis({
      college: 'Medicine', year: '1', subject: 'Anatomy', sourceName: 'one.pdf', analysis: result,
    }, 100);
    await saveMedicalAnalysis({
      college: 'Medicine', year: '1', subject: 'Physiology', sourceName: 'two.pdf', analysis: result,
    }, 200);

    const history = await listMedicalAnalyses();
    expect(history.map((item) => item.createdAt)).toEqual([200, 100]);

    await deleteMedicalAnalysis(first);
    expect((await listMedicalAnalyses()).map((item) => item.createdAt)).toEqual([200]);
  });

  it('keeps the history bounded to the newest 30 records', async () => {
    for (let i = 0; i < MEDICAL_ANALYSIS_HISTORY_LIMIT + 2; i += 1) {
      await saveMedicalAnalysis({
        college: 'Medicine', year: '1', subject: 'Subject', sourceName: 'lecture.pdf', analysis: result,
      }, i + 1);
    }

    const history = await listMedicalAnalyses();
    expect(history).toHaveLength(MEDICAL_ANALYSIS_HISTORY_LIMIT);
    expect(history[0].createdAt).toBe(MEDICAL_ANALYSIS_HISTORY_LIMIT + 2);
    expect(history.at(-1)?.createdAt).toBe(3);
  });
});
