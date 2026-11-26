export type MedicalStationStage = 'history' | 'examination' | 'investigations' | 'differential';

export interface MedicalCaseStation {
  stage: MedicalStationStage;
  title: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  feedback: string[];
  rationale: string;
  scoringCriteria: string;
}

export interface MedicalCaseDraft {
  caseTitle: string;
  specialty: string;
  setting: string;
  opening: string;
  stations: MedicalCaseStation[];
  finalSummary: string;
  learningObjectives: string[];
  safetyNote: string;
}

const STAGES: MedicalStationStage[] = ['history', 'examination', 'investigations', 'differential'];

export function parseMedicalCase(raw: string): MedicalCaseDraft {
  const cleaned = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('وصل رد غير منسق من دليل.');
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error('تعذّرت قراءة الحالة السريرية. أعد المحاولة.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('بنية الحالة السريرية غير صالحة.');
  const data = parsed as Record<string, unknown>;
  const str = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  if (!str(data.caseTitle) || !str(data.opening)) throw new Error('الحالة لا تحتوي عنواناً أو عرضاً افتتاحياً.');
  if (!Array.isArray(data.stations) || data.stations.length !== 4) throw new Error('يجب أن تتضمن المحاكاة أربع محطات OSCE بالضبط.');
  const stations: MedicalCaseStation[] = [];
  for (let index = 0; index < STAGES.length; index += 1) {
    const value = data.stations[index];
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('إحدى محطات المحاكاة غير صالحة.');
    const station = value as Record<string, unknown>;
    const options = Array.isArray(station.options) ? station.options.filter((v): v is string => typeof v === 'string').map((v) => v.trim()) : [];
    const feedback = Array.isArray(station.feedback) ? station.feedback.filter((v): v is string => typeof v === 'string').map((v) => v.trim()) : [];
    const answerIndex = Number(station.answerIndex);
    if (station.stage !== STAGES[index] || !str(station.title) || !str(station.prompt) ||
      options.length !== 4 || options.some((v) => !v) || feedback.length !== 4 || feedback.some((v) => !v) ||
      !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      throw new Error('محطة غير مكتملة: تحقق من ترتيب المراحل وأربعة الخيارات وتفسيراتها.');
    }
    stations.push({
      stage: STAGES[index], title: str(station.title), prompt: str(station.prompt),
      options, answerIndex, feedback, rationale: str(station.rationale),
      scoringCriteria: str(station.scoringCriteria),
    });
  }
  const objectives = Array.isArray(data.learningObjectives)
    ? data.learningObjectives.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean).slice(0, 8)
    : [];
  return {
    caseTitle: str(data.caseTitle), specialty: str(data.specialty), setting: str(data.setting),
    opening: str(data.opening), stations, finalSummary: str(data.finalSummary),
    learningObjectives: objectives, safetyNote: str(data.safetyNote),
  };
}
