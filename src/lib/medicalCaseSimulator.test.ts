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
    rationale: 'شرح الاستدلال', scoringCriteria: 'معيار التقييم',
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
});
