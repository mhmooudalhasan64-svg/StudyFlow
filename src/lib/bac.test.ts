import { describe, expect, it } from 'vitest';
import type { Subject } from '../db';
import { BRANCHES, branchSubjects, missingBranchSubjects } from './bac';

const subj = (id: number, name: string): Subject => ({ id, name, color: '#fff' });

describe('baccalaureate branches', () => {
  it('has both a scientific and a literary branch', () => {
    expect(BRANCHES.scientific.subjects).toContain('الفيزياء');
    expect(BRANCHES.literary.subjects).toContain('الفلسفة');
    expect(BRANCHES.literary.subjects).not.toContain('الفيزياء');
  });

  it('branchSubjects keeps branch order and ignores others', () => {
    const list = [subj(1, 'الفيزياء'), subj(2, 'العربية'), subj(3, 'الفلسفة')];
    expect(branchSubjects(list, 'scientific').map((s) => s.name)).toEqual(['العربية', 'الفيزياء']);
  });

  it('missingBranchSubjects lists what is not added yet', () => {
    const list = [subj(1, 'العربية'), subj(2, 'الإنجليزية'), subj(3, 'التربية الدينية')];
    expect(missingBranchSubjects(list, 'literary')).toEqual(['التاريخ', 'الجغرافيا', 'الفلسفة']);
    expect(missingBranchSubjects(list, 'scientific')).toContain('الرياضيات');
  });
});
