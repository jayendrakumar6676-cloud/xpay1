// Uses sessionStorage instead of localStorage so it works inside sandboxed
// iframes (Lovable preview / embedded deployments). All submission data is
// also persisted server-side via postSubmission(), so this is just the
// in-page duplicate-attempt guard.

const KEY = (email: string) => `xpay-attempts::${email.toLowerCase()}`;

export interface AttemptRecord {
  examId: string;
  submittedAt: number;
  violations: number;
  score: number;
  total: number;
  // ms spent on each question, keyed by question id
  timePerQuestion?: Record<number, number>;
  durationMs?: number;
  correctCount?: number;
  attemptedCount?: number;
  accuracy?: number; // 0..1
}

function safeGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* sandboxed — ignore */ }
}

export function getAttempts(email: string): AttemptRecord[] {
  try {
    return JSON.parse(safeGet(KEY(email)) || "[]");
  } catch {
    return [];
  }
}

export function hasAttempted(email: string, examId: string) {
  return getAttempts(email).some((a) => a.examId === examId);
}

export function recordAttempt(email: string, rec: AttemptRecord) {
  const all = getAttempts(email);
  if (all.some((a) => a.examId === rec.examId)) return;
  all.push(rec);
  safeSet(KEY(email), JSON.stringify(all));
}
