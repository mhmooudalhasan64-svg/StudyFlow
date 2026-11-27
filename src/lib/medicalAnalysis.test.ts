import { describe, expect, it } from 'vitest';
import { parseMedicalAnalysis } from './medicalAnalysis';

const source = 'The myocardium contracts to pump blood through the circulatory system.';

describe('parseMedicalAnalysis', () => {
  it('parses a valid structured response and keeps only source-backed evidence', () => {
    const result = parseMedicalAnalysis(JSON.stringify({
      title: 'Cardiac function',
      summary: 'A short summary.',
      terminology: [
        { term: 'Myocardium', meaning: 'عضلة القلب', prefix: '', root: '', suffix: '', evidenceQuote: 'The myocardium contracts' },
        { term: 'Invented term', meaning: 'شرح', evidenceQuote: 'not present in source' },
      ],
      highYield: [
        { fact: 'The myocardium contracts.', why: 'Core function', evidenceQuote: 'The myocardium contracts' },
        { fact: 'Unsupported claim', why: 'No support', evidenceQuote: 'Unsupported source quote' },
      ],
    }), source);

    expect(result.title).toBe('Cardiac function');
    expect(result.terminology).toHaveLength(1);
    expect(result.highYield).toHaveLength(1);
    expect(result.highYield?.[0].evidenceQuote).toBe('The myocardium contracts');
  });

  it('rejects malformed JSON and non-object payloads', () => {
    expect(() => parseMedicalAnalysis('{broken', source)).toThrow('تعذّر قراءة');
    expect(() => parseMedicalAnalysis('[]', source)).toThrow('بنية');
  });

  it('limits output size and rejects malformed comparison table rows', () => {
    const result = parseMedicalAnalysis(JSON.stringify({
      learningObjectives: Array.from({ length: 20 }, (_, i) => 'Objective ' + i),
      comparisonTables: [{
        title: 'Comparison',
        columns: ['A', 'B'],
        rows: [['one', 'two'], ['only one'], ['three', 'four', 'extra']],
      }],
    }), source);

    expect(result.learningObjectives).toHaveLength(8);
    expect(result.comparisonTables).toHaveLength(1);
    expect(result.comparisonTables?.[0].rows).toEqual([['one', 'two']]);
  });

  it('accepts fenced JSON while retaining the same validation', () => {
    const result = parseMedicalAnalysis('```json\n{"title":"Test"}\n```', source);
    expect(result.title).toBe('Test');
  });
});
