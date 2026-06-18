// Uses sessionStorage instead of localStorage so it works inside sandboxed
// iframes. The authoritative record lives server-side (postSubmission).

const KEY = (email: string) => `xpay-coding::${email.toLowerCase()}`;

export interface QuestionResult {
  questionId: string;
  language: string;
  code: string;
  passed: number;          // hidden + visible passed
  total: number;
  marksEarned: number;
  perCase: { hidden: boolean; passed: boolean; stdout: string; expected: string; stderr?: string }[];
}

export interface CodingSubmission {
  examId: string;
  submittedAt: number;
  violations: number;
  results: QuestionResult[];
  totalMarks: number;
  totalPossible: number;
}

function safeGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* sandboxed */ }
}

export function getCodingSubmissions(email: string): CodingSubmission[] {
  try { return JSON.parse(safeGet(KEY(email)) || "[]"); }
  catch { return []; }
}

export function hasCodingSubmission(email: string, examId: string) {
  return getCodingSubmissions(email).some((s) => s.examId === examId);
}

export function saveCodingSubmission(email: string, sub: CodingSubmission) {
  const all = getCodingSubmissions(email);
  if (all.some((s) => s.examId === sub.examId)) return;
  all.push(sub);
  safeSet(KEY(email), JSON.stringify(all));
}

// ---- Invigilator helpers ----
export function listAllCandidates(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("xpay-coding::")) out.push(k.replace("xpay-coding::", ""));
    }
  } catch { /* sandboxed */ }
  return out;
}
