import { describe, expect, it } from 'vitest';
import { clipText, detectKind, normalizeText, rowsToText } from './fileText';

describe('fileText', () => {
  it('detects supported kinds by extension, case-insensitive', () => {
    expect(detectKind('ملزمة.PDF')).toBe('pdf');
    expect(detectKind('a.docx')).toBe('docx');
    expect(detectKind('a.xlsx')).toBe('xlsx');
    expect(detectKind('a.csv')).toBe('text');
    expect(detectKind('a.txt')).toBe('text');
    expect(detectKind('a.doc')).toBeNull();
    expect(detectKind('a.xls')).toBeNull();
    expect(detectKind('noext')).toBeNull();
  });

  it('normalizeText collapses blanks and blank lines', () => {
    expect(normalizeText('  a   b \r\n\r\n\r\n\r\n c  ')).toBe('a b\n\nc');
  });

  it('clipText truncates only when too long', () => {
    expect(clipText('abc', 10)).toEqual({ text: 'abc', truncated: false });
    expect(clipText('abcdef', 3)).toEqual({ text: 'abc', truncated: true });
  });

  it('rowsToText joins cells, skips empty rows and trailing empties', () => {
    const rows = [
      ['المادة', 'العلامة'],
      ['فيزياء', 85],
      [null, undefined, ''],
      ['كيمياء', null],
    ];
    expect(rowsToText(rows)).toBe('المادة | العلامة\nفيزياء | 85\nكيمياء');
  });

  it('rowsToText respects the row limit', () => {
    const rows = Array.from({ length: 10 }, (_, i) => [i]);
    expect(rowsToText(rows, 3).split('\n')).toHaveLength(3);
  });
});
