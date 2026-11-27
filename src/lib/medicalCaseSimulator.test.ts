import { describe, expect, it } from 'vitest';
import { parseMedicalCase } from './medicalCaseSimulator';

const makeCase = () => ({
  caseTitle: 'حالة تعليمية افتراضية',
  specialty: 'الطب البشري',
  setting: 'قاعة محاكاة',
  opening: 'وصف أولي افتراضي لا يكشف الإجابة.',
  stations: ['history', 'examination', 'investigations', 'differential'].map((stage) => ({
    stage, title: 'محطة', prompt: 'ما الخطوة التعليمية الأنسب؟',
    options: ['A', 'B', 'C', 'D'], answerIndex: 1,
    feedback: ['شرح A', 'شرح B', 'شرح C', 'شرح D'],
    rationale: 'شرح الاستدلال', scoringCriteria: 'معيار التقييم', sourceQuote: '',
  })),
  finalSummary: 'ملخص',
  learningObjectives: ['هدف'],
  safetyNote: 'للتعلم فقط',
});

describe('medical OSCE case parser', () => {
  it('accepts exactly four ordered and complete stations', () => {
    expect(parseMedicalCase(JSON.stringify(makeCase())).stations).toHaveLength(4);
  });
  it('rejects missing OSCE stations', () => {
    const invalid = makeCase();
    invalid.stations.pop();
    expect(() => parseMedicalCase(JSON.stringify(invalid))).toThrow();
  });
  it('rejects a station with fewer than four answer options', () => {
    const invalid = makeCase();
    invalid.stations[1].options.pop();
    expect(() => parseMedicalCase(JSON.stringify(invalid))).toThrow();
  });
  it('rejects string answer indexes instead of coercing them', () => {
    const invalid = makeCase();
    invalid.stations[0].answerIndex = '1' as unknown as number;
    expect(() => parseMedicalCase(JSON.stringify(invalid))).toThrow();
  });
  it('rejects a station in the wrong sequence', () => {
    const invalid = makeCase();
    invalid.stations[0].stage = 'differential';
    expect(() => parseMedicalCase(JSON.stringify(invalid))).toThrow();
  });

  it('requires a literal source quote for every station when a lecture is supplied', () => {
    const draft = makeCase();
    const source = 'معلومة تعليمية موثقة في المحاضرة الطبية.';
    draft.stations.forEach((station) => { station.sourceQuote = 'معلومة تعليمية'; });
    expect(parseMedicalCase(JSON.stringify(draft), source).stations).toHaveLength(4);
    draft.stations[2].sourceQuote = 'اقتباس غير موجود';
    expect(() => parseMedicalCase(JSON.stringify(draft), source)).toThrow();
  });

  it('requires rationale and scoring criteria for every station', () => {
    const draft = makeCase();
    draft.stations[0].rationale = '';
    expect(() => parseMedicalCase(JSON.stringify(draft))).toThrow();
  });

  it('rejects oversized model output and lecture source', () => {
    expect(() => parseMedicalCase(' '.repeat(100_001))).toThrow('حجم بيانات');
    expect(() => parseMedicalCase(JSON.stringify(makeCase()), 'x'.repeat(8_001))).toThrow('حجم بيانات');
  });

  it('caps generated station and case text lengths', () => {
    const large = makeCase();
    large.opening = 'o'.repeat(2_000);
    large.stations[0].prompt = 'p'.repeat(2_000);
    const parsed = parseMedicalCase(JSON.stringify(large));
    expect(parsed.opening).toHaveLength(1_600);
    expect(parsed.stations[0].prompt).toHaveLength(1_200);
  });
});
