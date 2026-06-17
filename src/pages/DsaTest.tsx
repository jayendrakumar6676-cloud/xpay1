// Unified DSA exam — one session containing:
//   Section A · 10 MCQs
//   Section B · 2 standard coding problems
//   Section C · 2 advanced coding problems
//
// Single timer, single camera/mic stream, single violation counter,
// single submit. The candidate writes everything here only.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getExam, prepareExam, type Question } from "@/lib/exams";
import { hasAttempted, recordAttempt } from "@/lib/exam-attempts";
import {
  CODING_QUESTIONS, SUPPORTED_LANGUAGES, getCodingQuestionsForExam,
  type CodingQuestion, type LanguageId,
} from "@/lib/coding-questions";
import { runOnce } from "@/lib/code-runner";
import {
  hasCodingSubmission, saveCodingSubmission, type QuestionResult,
} from "@/lib/coding-submissions";
import { postSubmission } from "@/lib/api";
import ExamWindowGate from "@/components/ExamWindowGate";
import { getExamWindow } from "@/lib/exam-schedule";

const PRISM_LANG: Record<LanguageId, string> = {
  python: "python", javascript: "javascript", java: "java", cpp: "cpp", c: "c",
};
const langLabel: Record<LanguageId, string> = {
  python: "main.py", javascript: "main.js", java: "Main.java", cpp: "main.cpp", c: "main.c",
};

const MAX_VIOLATIONS = 3;
type Phase = "gate" | "instructions" | "permissions" | "running" | "submitted" | "blocked";

interface CodeState {
  language: LanguageId;
  code: string;
  lastRun?: { passed: number; total: number; logs: string };
}

type ItemKind = "mcq" | "coding" | "advanced";
interface Item {
  kind: ItemKind;
  index: number;        // index within its section (1-based for display)
  mcq?: Question;       // present when kind === "mcq"
  coding?: CodingQuestion; // present when kind === "coding" | "advanced"
}

const EXAM_ID = "dsa";

export default function DsaTest() {
  const navigate = useNavigate();
  const exam = getExam(EXAM_ID)!;

  // --- top-level state ---
  const [phase, setPhase] = useState<Phase>("gate");
  const [candidate, setCandidate] = useState<{ name?: string; email: string } | null>(null);
  const [permError, setPermError] = useState<string | null>(null);

  // --- exam content ---
  const [mcqQuestions, setMcqQuestions] = useState<Question[]>([]);
  const standardQs = useMemo(() => getCodingQuestionsForExam(EXAM_ID, "standard"), []);
  const advancedQs = useMemo(() => getCodingQuestionsForExam(EXAM_ID, "advanced"), []);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    mcqQuestions.forEach((q, i) => out.push({ kind: "mcq", index: i + 1, mcq: q }));
    standardQs.forEach((q, i) => out.push({ kind: "coding", index: i + 1, coding: q }));
    advancedQs.forEach((q, i) => out.push({ kind: "advanced", index: i + 1, coding: q }));
    return out;
  }, [mcqQuestions, standardQs, advancedQs]);

  // --- per-question state ---
  const [current, setCurrent] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [codeState, setCodeState] = useState<Record<string, CodeState>>({});
  const [timeLeft, setTimeLeft] = useState(exam.durationMin * 60);
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // --- proctoring refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finishedRef = useRef(false);
  const examStartRef = useRef<number>(Date.now());

  // --- gate: load candidate + initial state ---
  useEffect(() => {
    const raw = sessionStorage.getItem("xpay-candidate");
    if (!raw) { navigate("/login"); return; }
    const c = JSON.parse(raw);
    setCandidate(c);
    if (hasAttempted(c.email, EXAM_ID) || hasCodingSubmission(c.email, EXAM_ID)) {
      setPhase("blocked"); return;
    }
    setMcqQuestions(prepareExam(exam));
    setPhase("instructions");
  }, [exam, navigate]);

  // Seed code state once we know the coding questions
  useEffect(() => {
    setCodeState((prev) => {
      const next = { ...prev };
      for (const q of [...standardQs, ...advancedQs]) {
        if (!next[q.id]) next[q.id] = { language: "python", code: SUPPORTED_LANGUAGES[0].starter };
      }
      return next;
    });
  }, [standardQs, advancedQs]);

  // --- helpers ---
  const cur = items[current];
  const codingCur = cur?.coding ? codeState[cur.coding.id] : undefined;

  const setLanguage = (lang: LanguageId) => {
    if (!cur?.coding) return;
    const def = SUPPORTED_LANGUAGES.find((l) => l.id === lang)!;
    setCodeState((s) => ({ ...s, [cur.coding!.id]: { ...s[cur.coding!.id], language: lang, code: def.starter } }));
  };
  const setCode = (code: string) => {
    if (!cur?.coding) return;
    setCodeState((s) => ({ ...s, [cur.coding!.id]: { ...s[cur.coding!.id], code } }));
  };

  // --- submit ---
  const submit = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);

    // Grade coding problems
    const results: QuestionResult[] = [];
    let totalCodingMarks = 0, totalCodingPossible = 0;
    for (const q of [...standardQs, ...advancedQs]) {
      const st = codeState[q.id] || { language: "python" as LanguageId, code: "" };
      const perCase: QuestionResult["perCase"] = [];
      let passed = 0;
      for (const tc of q.testCases) {
        try {
          const r = await runOnce(st.language, st.code, tc.stdin, tc.expected);
          perCase.push({ hidden: tc.hidden, passed: r.passed, stdout: r.stdout, expected: tc.expected, stderr: r.stderr });
          if (r.passed) passed++;
        } catch {
          perCase.push({ hidden: tc.hidden, passed: false, stdout: "", expected: tc.expected, stderr: "Runner error" });
        }
      }
      const fraction = q.testCases.length > 0 ? passed / q.testCases.length : 0;
      const earned = Math.round(q.marks * fraction * 100) / 100;
      totalCodingMarks += earned;
      totalCodingPossible += q.marks;
      results.push({ questionId: q.id, language: st.language, code: st.code, passed, total: q.testCases.length, marksEarned: earned, perCase });
    }

    // Grade MCQs
    const mark = exam.marksPerQuestion;
    const neg = mark * exam.negativeMarkFraction;
    let mcqScore = 0, correctCount = 0, attemptedCount = 0;
    for (const q of mcqQuestions) {
      const given = mcqAnswers[q.id];
      if (given === undefined) continue;
      attemptedCount++;
      if (given === q.answer) { mcqScore += mark; correctCount++; }
      else mcqScore -= neg;
    }
    const mcqTotal = mcqQuestions.length * mark;

    const durationMs = Date.now() - examStartRef.current;
    const totalMarks = mcqScore + totalCodingMarks;
    const totalPossible = mcqTotal + totalCodingPossible;

    if (candidate) {
      // Local attempt record (MCQ part)
      recordAttempt(candidate.email, {
        examId: EXAM_ID, submittedAt: Date.now(), violations,
        score: mcqScore, total: mcqTotal,
        durationMs, correctCount, attemptedCount,
        accuracy: mcqTotal > 0 ? mcqScore / mcqTotal : 0,
      });
      // Local coding submission (coding parts)
      saveCodingSubmission(candidate.email, {
        examId: EXAM_ID, submittedAt: Date.now(), violations,
        results, totalMarks: totalCodingMarks, totalPossible: totalCodingPossible,
      });

      // Single combined payload to the server — kind:"dsa"
      void postSubmission({
        // The server already understands "mcq" and "coding". We send "dsa"
        // as a custom kind and include BOTH `answers` and `results` blocks.
        kind: "coding",
        examId: EXAM_ID,
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        submittedAt: Date.now(),
        violations,
        totalMarks,
        totalPossible,
        accuracy: totalPossible > 0 ? totalMarks / totalPossible : 0,
        durationMs,
        results,
        answers: Object.fromEntries(
          mcqQuestions.map((q) => [q.id, {
            question: q.q,
            given: mcqAnswers[q.id],
            correct: q.answer,
            options: q.options,
          }])
        ),
        score: mcqScore,
        total: mcqTotal,
        correctCount,
        attemptedCount,
      });
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* noop */ });
    setSubmitting(false);
    setPhase("submitted");
  }, [candidate, mcqQuestions, mcqAnswers, standardQs, advancedQs, codeState, violations, exam]);

  // --- violation tracking ---
  const flagViolation = useCallback((reason: string) => {
    setViolations((v) => {
      const next = v + 1;
      if (next >= MAX_VIOLATIONS) {
        toast.error("Exam auto-submitted: too many violations.");
        setTimeout(() => { void submit(); }, 200);
      } else {
        toast.warning(`Warning ${next}/${MAX_VIOLATIONS}: ${reason}`);
      }
      return next;
    });
  }, [submit]);

  // --- proctoring listeners (only while running) ---
  useEffect(() => {
    if (phase !== "running") return;
    const onVisibility = () => { if (document.hidden) flagViolation("Tab/window switched."); };
    const onBlur = () => flagViolation("Window lost focus.");
    const onContext = (e: MouseEvent) => { e.preventDefault(); flagViolation("Right-click disabled."); };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const inEditor = (e.target as HTMLElement)?.dataset?.codeEditor === "true";
      if (k === "f12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k))) {
        e.preventDefault(); flagViolation("DevTools blocked."); return;
      }
      if (!inEditor && (e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "s", "p", "u"].includes(k)) {
        e.preventDefault(); flagViolation("Shortcut blocked outside editor.");
      }
      if (k === "printscreen") flagViolation("Screenshot attempt.");
    };
    const onFs = () => { if (!document.fullscreenElement && !finishedRef.current) flagViolation("Exited fullscreen."); };
    const camCheck = setInterval(() => {
      const tracks = streamRef.current?.getTracks() ?? [];
      if (tracks.length === 0 || tracks.some((t) => t.readyState !== "live")) flagViolation("Camera/microphone disabled.");
    }, 5000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      clearInterval(camCheck);
    };
  }, [phase, flagViolation]);

  // --- countdown ---
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { clearInterval(id); void submit(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, submit]);

  // --- camera wiring ---
  useEffect(() => {
    if (phase !== "running") return;
    examStartRef.current = Date.now();
    const v = videoRef.current, s = streamRef.current;
    if (!v || !s) return;
    v.srcObject = s; v.muted = true; v.playsInline = true;
    const tryPlay = () => v.play().catch(() => { /* noop */ });
    tryPlay();
    v.onloadedmetadata = tryPlay;
  }, [phase]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const requestPermissions = async () => {
    setPermError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      try { await containerRef.current?.requestFullscreen?.(); } catch { /* ignore */ }
      setPhase("running");
    } catch {
      setPermError("Camera & microphone access is required. Please allow and retry.");
    }
  };

  const runSampleTests = async () => {
    if (!cur?.coding || !codingCur) return;
    const q = cur.coding;
    const visible = q.testCases.filter((t) => !t.hidden);
    let passed = 0;
    const logs: string[] = [];
    for (let i = 0; i < visible.length; i++) {
      const tc = visible[i];
      const r = await runOnce(codingCur.language, codingCur.code, tc.stdin, tc.expected);
      const ok = r.passed; if (ok) passed++;
      logs.push(
        `── Sample ${i + 1} ${ok ? "✅ PASSED" : "❌ FAILED"}\nInput:\n${tc.stdin || "(empty)"}\nExpected:\n${tc.expected}\nGot:\n${r.stdout || "(no output)"}\n` +
        (r.stderr ? `Stderr:\n${r.stderr}\n` : ""),
      );
    }
    setCodeState((s) => ({ ...s, [q.id]: { ...s[q.id], lastRun: { passed, total: visible.length, logs: logs.join("\n") } } }));
    if (passed === visible.length && visible.length > 0) toast.success(`All ${visible.length} sample tests passed`);
    else toast.error(`${passed}/${visible.length} sample tests passed`);
  };

  const mmss = useMemo(() => {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const s = (timeLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [timeLeft]);

  const sectionLabel = (k: ItemKind) =>
    k === "mcq" ? "Section A · MCQ" : k === "coding" ? "Section B · Coding" : "Section C · Advanced Coding";

  // Counts for progress summary
  const totalItems = items.length;
  const answeredMcqCount = mcqQuestions.filter((q) => mcqAnswers[q.id] !== undefined).length;
  const codedCount = [...standardQs, ...advancedQs].filter((q) => {
    const s = codeState[q.id];
    if (!s) return false;
    return s.code.trim() !== SUPPORTED_LANGUAGES.find((l) => l.id === s.language)!.starter.trim();
  }).length;
  const overallProgress = totalItems > 0 ? ((answeredMcqCount + codedCount) / totalItems) * 100 : 0;

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  if (!candidate) return null;

  // Outside the scheduled DSA exam window? Show the countdown gate.
  if (phase !== "blocked" && phase !== "submitted") {
    const win = getExamWindow(exam);
    if (win.status === "upcoming" || win.status === "closed") {
      return <ExamWindowGate exam={exam} />;
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen select-none bg-background">
      {phase === "running" && (
        <div className="fixed bottom-4 right-4 z-50 overflow-hidden rounded-xl border-2 border-[var(--brand-blue)] shadow-brand bg-black">
          <video ref={videoRef} className="h-24 w-32 object-cover" playsInline autoPlay muted />
          <div className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> REC
          </div>
        </div>
      )}

      {phase === "blocked" && (
        <CenterCard>
          <Logo className="mx-auto h-12" />
          <h1 className="mt-6 text-2xl font-bold text-brand-gradient">Already Attempted</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You have already submitted the <strong>DSA Test</strong>. Each exam can be attempted only once.
          </p>
          <Link to="/dashboard">
            <Button data-testid="dsa-blocked-back-btn" className="mt-6 w-full bg-brand-gradient border-0 text-white font-semibold">
              Back to Dashboard
            </Button>
          </Link>
        </CenterCard>
      )}

      {phase === "instructions" && (
        <div className="grid min-h-screen place-items-center px-4 py-10">
          <Card className="max-w-2xl w-full glass shadow-brand">
            <CardContent className="p-8">
              <div className="text-center">
                <Logo className="mx-auto h-12" />
                <h1 className="mt-6 text-2xl font-bold text-brand-gradient" data-testid="dsa-instructions-title">
                  DSA Test — Instructions
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  One single exam with three sections. You will write everything inside this window.
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Stat label="Section A · MCQs" value={`${mcqQuestions.length} questions`} />
                <Stat label="Section B · Coding" value={`${standardQs.length} problems`} />
                <Stat label="Section C · Advanced Coding" value={`${advancedQs.length} problems`} />
                <Stat label="Total Duration" value={`${exam.durationMin} min`} />
              </div>
              <ul className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
                <li>• <strong>Section A (MCQs)</strong>: +{exam.marksPerQuestion} for correct, −{(exam.marksPerQuestion * exam.negativeMarkFraction).toFixed(2)} for wrong, 0 if unattempted.</li>
                <li>• <strong>Sections B &amp; C (Coding)</strong>: graded against visible + hidden test cases, partial credit allowed. Languages: Python, JS, Java, C++, C.</li>
                <li>• Read input from STDIN, write output to STDOUT.</li>
                <li>• Runs in fullscreen. Camera &amp; microphone must stay ON throughout.</li>
                <li>• Tab-switch, right-click, copy-paste (outside the editor), DevTools and screenshots are blocked.</li>
                <li>• After {MAX_VIOLATIONS} violations the exam auto-submits.</li>
                <li>• Single attempt only. You will submit everything together.</li>
              </ul>
              <div className="mt-6 flex gap-3">
                <Link to="/dashboard" className="flex-1">
                  <Button data-testid="dsa-instructions-cancel-btn" variant="outline" className="w-full">Cancel</Button>
                </Link>
                <Button
                  data-testid="dsa-instructions-continue-btn"
                  onClick={() => setPhase("permissions")}
                  className="flex-1 h-11 bg-brand-gradient border-0 text-white font-semibold"
                >
                  I understand — Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "permissions" && (
        <CenterCard>
          <Logo className="mx-auto h-12" />
          <h1 className="mt-6 text-2xl font-bold text-brand-gradient">Camera & Microphone</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Required for proctoring throughout the DSA exam.
          </p>
          <div className="mx-auto my-6 grid h-28 w-full max-w-xs place-items-center rounded-xl border border-dashed border-border bg-muted/40 text-4xl">
            🎥 🎙️
          </div>
          {permError && <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{permError}</p>}
          <Button
            data-testid="dsa-permissions-allow-btn"
            onClick={requestPermissions}
            className="h-11 w-full bg-brand-gradient border-0 text-white font-semibold"
          >
            Allow & Start DSA Test
          </Button>
          <Link to="/dashboard"><Button variant="ghost" className="mt-3 w-full">Cancel</Button></Link>
        </CenterCard>
      )}

      {phase === "running" && cur && (
        <div className="mx-auto max-w-[1400px] px-4 py-4">
          {/* Header */}
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl glass px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Logo className="h-8" />
              <Badge variant="secondary" data-testid="dsa-header-section">{sectionLabel(cur.kind)}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive" data-testid="dsa-violations">
                ⚠ {violations}/{MAX_VIOLATIONS}
              </span>
              <span className="rounded-full bg-ink-gradient px-4 py-1 font-mono font-semibold text-white" data-testid="dsa-timer">
                ⏱ {mmss}
              </span>
              <Button
                data-testid="dsa-submit-btn"
                size="sm"
                disabled={submitting || timeLeft > (exam.durationMin * 60) / 2}
                title={timeLeft > (exam.durationMin * 60) / 2 ? "Submit unlocks at the half-time mark" : ""}
                onClick={() => {
                  const msg = `You have answered ${answeredMcqCount}/${mcqQuestions.length} MCQs and worked on ${codedCount}/${standardQs.length + advancedQs.length} coding problems. Submit the entire DSA test now?`;
                  if (window.confirm(msg)) void submit();
                }}
                className="bg-brand-gradient border-0 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? "Submitting…"
                  : timeLeft > (exam.durationMin * 60) / 2
                    ? `Submit (in ${Math.ceil(((exam.durationMin * 60) / 2 - (exam.durationMin * 60 - timeLeft)) / 60)}m)`
                    : "Submit Test"}
              </Button>
            </div>
          </header>

          {/* Overall progress */}
          <div className="mb-3 rounded-xl glass px-4 py-2.5">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Question {current + 1} of {totalItems}</span>
              <span>{answeredMcqCount}/{mcqQuestions.length} MCQs · {codedCount}/{standardQs.length + advancedQs.length} coding worked on</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Section navigator */}
          <SectionNavigator
            items={items}
            current={current}
            onGo={setCurrent}
            mcqAnswers={mcqAnswers}
            codeState={codeState}
          />

          {/* Body */}
          <div className="mt-4">
            {cur.kind === "mcq" && cur.mcq && (
              <McqPanel
                q={cur.mcq}
                chosen={mcqAnswers[cur.mcq.id]}
                onChoose={(i) => setMcqAnswers({ ...mcqAnswers, [cur.mcq!.id]: i })}
              />
            )}
            {(cur.kind === "coding" || cur.kind === "advanced") && cur.coding && codingCur && (
              <CodingPanel
                q={cur.coding}
                st={codingCur}
                onLanguage={setLanguage}
                onCode={setCode}
                onRunSamples={runSampleTests}
              />
            )}
          </div>

          {/* Bottom nav */}
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} data-testid="dsa-prev-btn">
              ← Previous
            </Button>
            {current < totalItems - 1 ? (
              <Button onClick={() => setCurrent((c) => Math.min(totalItems - 1, c + 1))} className="bg-brand-gradient border-0 text-white font-semibold" data-testid="dsa-next-btn">
                Next →
              </Button>
            ) : (() => {
              const halfReached = timeLeft <= (exam.durationMin * 60) / 2;
              return (
                <Button
                  onClick={() => { if (window.confirm("This is the last question. Submit the DSA test now?")) void submit(); }}
                  disabled={submitting || !halfReached}
                  title={!halfReached ? "Submit unlocks at the half-time mark" : ""}
                  className="bg-brand-gradient border-0 text-white font-semibold disabled:opacity-50"
                  data-testid="dsa-submit-final-btn"
                >
                  {submitting ? "Submitting…" : halfReached ? "Submit Test" : "Submit (locked)"}
                </Button>
              );
            })()}
          </div>
        </div>
      )}

      {phase === "submitted" && (
        <CenterCard>
          <Logo className="mx-auto h-12" />
          <div className="mx-auto mt-6 grid h-16 w-16 place-items-center rounded-full bg-brand-gradient text-3xl text-white">✓</div>
          <h1 className="mt-4 text-2xl font-bold text-brand-gradient">DSA Test Submitted</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            All three sections (MCQs, Coding, Advanced Coding) have been recorded.
            Results will be shared by the invigilator.
          </p>
          <Link to="/dashboard">
            <Button data-testid="dsa-submitted-back-btn" className="mt-6 h-11 w-full bg-brand-gradient border-0 text-white font-semibold">
              Back to Dashboard
            </Button>
          </Link>
        </CenterCard>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SectionNavigator({
  items, current, onGo, mcqAnswers, codeState,
}: {
  items: Item[];
  current: number;
  onGo: (idx: number) => void;
  mcqAnswers: Record<number, number>;
  codeState: Record<string, CodeState>;
}) {
  const groups: { kind: ItemKind; from: number; to: number; label: string; color: string }[] = [];
  let i = 0;
  while (i < items.length) {
    const k = items[i].kind;
    const from = i;
    while (i < items.length && items[i].kind === k) i++;
    groups.push({
      kind: k,
      from,
      to: i - 1,
      label:
        k === "mcq" ? "Section A · MCQs" :
        k === "coding" ? "Section B · Coding" :
                         "Section C · Advanced Coding",
      color:
        k === "mcq" ? "from-indigo-500 to-cyan-400" :
        k === "coding" ? "from-sky-500 to-emerald-400" :
                         "from-fuchsia-500 to-orange-400",
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-3" data-testid="dsa-section-nav">
          {groups.map((g, gi) => {
            const placement = gi === 0 ? "Left" : gi === 1 ? "Middle" : "Right";
            const total = g.to - g.from + 1;
            const answeredCount = items.slice(g.from, g.to + 1).filter((it) => {
              if (it.kind === "mcq") return it.mcq && mcqAnswers[it.mcq.id] !== undefined;
              return it.coding && codeState[it.coding.id] && codeState[it.coding.id].code.trim() !==
                SUPPORTED_LANGUAGES.find((l) => l.id === codeState[it.coding.id].language)!.starter.trim();
            }).length;
            return (
              <div key={g.label} className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3">
                {/* Section header */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full bg-gradient-to-r ${g.color} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white`}>
                    {placement} · {g.label.split("·")[0].trim()}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {answeredCount}/{total}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {g.label.split("·")[1]?.trim() ?? ""}
                  {g.kind === "mcq" && " — choose one option"}
                  {g.kind === "coding" && " — 2 standard problems"}
                  {g.kind === "advanced" && " — 2 advanced problems"}
                </div>
                {/* Question buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {items.slice(g.from, g.to + 1).map((it, j) => {
                    const idx = g.from + j;
                    const isMcq = it.kind === "mcq";
                    const answered = isMcq
                      ? it.mcq && mcqAnswers[it.mcq.id] !== undefined
                      : it.coding && codeState[it.coding.id] && codeState[it.coding.id].code.trim() !==
                        SUPPORTED_LANGUAGES.find((l) => l.id === codeState[it.coding.id].language)!.starter.trim();
                    return (
                      <button
                        key={idx}
                        data-testid={`dsa-nav-q-${idx + 1}`}
                        onClick={() => onGo(idx)}
                        className={`h-9 min-w-[2.6rem] rounded-lg px-2 text-xs font-semibold transition-smooth ${
                          idx === current
                            ? "bg-brand-gradient text-white shadow-brand"
                            : answered
                            ? "bg-[var(--brand-green)]/30 text-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                        title={isMcq ? `MCQ ${it.index}` : `${g.kind === "coding" ? "Coding" : "Advanced"} ${it.index}: ${it.coding?.title ?? ""}`}
                      >
                        {isMcq ? `Q${idx + 1}` : `Q${idx + 1}`}
                      </button>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-gradient" /> Current</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--brand-green)]/40" /> Done</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted" /> Pending</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function McqPanel({
  q, chosen, onChoose,
}: {
  q: Question;
  chosen: number | undefined;
  onChoose: (i: number) => void;
}) {
  return (
    <Card className="shadow-brand">
      <CardContent className="p-6 sm:p-8">
        <h2 className="text-base font-semibold leading-relaxed sm:text-lg" data-testid="dsa-mcq-question">{q.q}</h2>
        <div className="mt-6 space-y-3" data-testid="dsa-mcq-options">
          {q.options.map((opt, i) => {
            const checked = chosen === i;
            return (
              <button
                key={i}
                data-testid={`dsa-mcq-option-${i}`}
                onClick={() => onChoose(i)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-smooth ${
                  checked
                    ? "border-transparent bg-brand-gradient text-white shadow-brand"
                    : "border-border bg-card hover:border-[var(--brand-blue)] hover:bg-accent/40"
                }`}
              >
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${checked ? "bg-white/25" : "bg-muted"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CodingPanel({
  q, st, onLanguage, onCode, onRunSamples,
}: {
  q: CodingQuestion;
  st: CodeState;
  onLanguage: (l: LanguageId) => void;
  onCode: (s: string) => void;
  onRunSamples: () => Promise<void> | void;
}) {
  const [running, setRunning] = useState(false);
  const run = async () => { setRunning(true); try { await onRunSamples(); } finally { setRunning(false); } };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Left — problem */}
      <Card className="shadow-brand">
        <CardContent className="p-6 max-h-[72vh] overflow-y-auto" data-testid="dsa-coding-problem">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{q.title}</h2>
            <Badge variant={q.difficulty === "Easy" ? "secondary" : q.difficulty === "Medium" ? "default" : "destructive"}>
              {q.difficulty} · {q.marks} marks
            </Badge>
          </div>
          <pre className="mt-4 whitespace-pre-wrap text-sm text-foreground">{q.prompt}</pre>
          <Section title="Input Format">{q.inputFormat}</Section>
          <Section title="Output Format">{q.outputFormat}</Section>
          <Section title="Constraints">
            <ul className="list-inside list-disc">{q.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </Section>
          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sample I/O</h3>
          {q.sample.map((s, i) => (
            <div key={i} className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono">
              <div className="text-muted-foreground">Input</div>
              <pre className="whitespace-pre-wrap">{s.input}</pre>
              <div className="mt-2 text-muted-foreground">Output</div>
              <pre className="whitespace-pre-wrap">{s.output}</pre>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Right — editor */}
      <Card className="shadow-brand">
        <CardContent className="p-4 flex flex-col gap-3 max-h-[72vh]" data-testid="dsa-coding-editor">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <select
                value={st.language}
                onChange={(e) => onLanguage(e.target.value as LanguageId)}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium"
                data-testid="dsa-language-select"
              >
                {SUPPORTED_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <Button size="sm" variant="outline" onClick={run} disabled={running} data-testid="dsa-run-samples-btn">
              {running ? "Running…" : "▶ Run Sample Tests"}
            </Button>
          </div>

          {/* VS Code-styled editor */}
          <div className="vscode-editor flex flex-col" data-code-editor="true">
            <div className="vscode-titlebar">
              <span className="vscode-dot" style={{ background: "#ff5f56" }} />
              <span className="vscode-dot" style={{ background: "#ffbd2e" }} />
              <span className="vscode-dot" style={{ background: "#27c93f" }} />
              <span className="ml-3 opacity-70">XPay · DSA Test</span>
              <span className="ml-auto opacity-50">UTF-8 · LF</span>
            </div>
            <div style={{ background: "#2d2d2d", borderBottom: "1px solid #1a1a1a" }}>
              <span className="vscode-tab">{langLabel[st.language]}</span>
            </div>
            <div style={{ maxHeight: "40vh", overflow: "auto", background: "#1e1e1e" }}>
              <Editor
                value={st.code}
                onValueChange={onCode}
                highlight={(code) =>
                  Prism.highlight(code, Prism.languages[PRISM_LANG[st.language]] || Prism.languages.clike, PRISM_LANG[st.language])
                }
                padding={14}
                textareaId="dsa-vscode-textarea"
                textareaClassName="vscode-textarea"
                preClassName="vscode-pre"
                style={{
                  fontFamily:
                    '"Fira Code", "JetBrains Mono", "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 14,
                  lineHeight: 1.55,
                  minHeight: "38vh",
                  outline: "none",
                  color: "#d4d4d4",
                  caretColor: "#ffffff",
                }}
              />
            </div>
            <div className="vscode-statusbar">
              <span>{SUPPORTED_LANGUAGES.find((l) => l.id === st.language)?.label}</span>
              <span>Ln {st.code.split("\n").length}</span>
              <span>{st.code.length} chars</span>
              <span className="ml-auto">⚡ XPay Exam Portal</span>
            </div>
          </div>

          <div className="overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-xs font-mono" data-testid="dsa-sample-output">
            {st.lastRun ? (
              <>
                <div className={`mb-2 font-semibold ${st.lastRun.passed === st.lastRun.total ? "text-emerald-600" : "text-destructive"}`}>
                  {st.lastRun.passed}/{st.lastRun.total} sample tests passed
                </div>
                <pre className="whitespace-pre-wrap">{st.lastRun.logs}</pre>
              </>
            ) : (
              <span className="text-muted-foreground">Run sample tests to see output here.</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="max-w-md w-full glass shadow-brand">
        <CardContent className="p-8 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-brand-gradient">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

// Avoid unused-import warning for CODING_QUESTIONS (kept for future seed use)
void CODING_QUESTIONS;
