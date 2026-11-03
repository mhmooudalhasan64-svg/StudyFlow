import type { Branch, Grade, Subject } from '../db';

export interface BranchInfo {
  id: Branch;
  label: string;
  /** المواد الأساسية للفرع. القائمة افتراضية ويمكن للطالب تعديل المواد من الإعدادات. */
  subjects: string[];
}

export const BRANCHES: Record<Branch, BranchInfo> = {
  scientific: {
    id: 'scientific',
    label: 'البكالوريا العلمي',
    subjects: ['العربية', 'الإنجليزية', 'الرياضيات', 'الفيزياء', 'الكيمياء', 'علوم الحياة', 'التربية الدينية'],
  },
  literary: {
    id: 'literary',
    label: 'البكالوريا الأدبي',
    subjects: ['العربية', 'الإنجليزية', 'التاريخ', 'الجغرافيا', 'الفلسفة', 'التربية الدينية'],
  },
};

export const BRANCH_LIST: BranchInfo[] = [BRANCHES.scientific, BRANCHES.literary];

export const GRADES: { id: Grade; label: string }[] = [
  { id: 10, label: 'العاشر' },
  { id: 11, label: 'الحادي عشر' },
  { id: 12, label: 'البكالوريا (الثالث الثانوي)' },
];

/** مواد الفرع الموجودة فعلاً لدى الطالب، بترتيب الفرع */
export function branchSubjects(subjects: readonly Subject[], branch: Branch): Subject[] {
  const names = BRANCHES[branch].subjects;
  const out: Subject[] = [];
  for (const n of names) {
    const s = subjects.find((x) => x.name === n);
    if (s) out.push(s);
  }
  return out;
}

/** أسماء مواد الفرع غير الموجودة بعد */
export function missingBranchSubjects(subjects: readonly Subject[], branch: Branch): string[] {
  return BRANCHES[branch].subjects.filter((n) => !subjects.some((s) => s.name === n));
}
