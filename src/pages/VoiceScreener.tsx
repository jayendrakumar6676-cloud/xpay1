import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { getScreening, type VoiceQuestion } from "@/lib/voice-questions";
import { EXAMS } from "@/lib/exams";

type Stage = "intro" | "speaking" | "listening" | "feedback" | "result";
interface ScoreEntry { correct: boolean; heard: string; }

// ─── mic permission: asked ONCE globally ───────────────────────────────────
let micGranted = false;
async function ensureMicPermission(): Promise<boolean> {
  if (micGranted) return true;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    micGranted = true;
    return true;
  } catch { return false; }
}

const TIMEOUT_SEC = 15;

export default function VoiceScreener() {
  const { examId } = useParams<{ examId: string }>();
  const navigate   = useNavigate();
  const screening  = examId ? getScreening(examId) : null;
  const exam       = EXAMS.find((e) => e.id === examId);

  // ─── UI state ───────────────────────────────────────────────────────────
  const [stage,       setStage]       = useState<Stage>("intro");
  const [qIndex,      setQIndex]      = useState(0);
  const [scores,      setScores]      = useState<ScoreEntry[]>([]);
  const [transcript,  setTranscript]  = useState("");
  const [statusText,  setStatusText]  = useState("Preparing AI\u2026");
  const [statusKind,  setStatusKind]  = useState<"idle"|"speaking"|"listening"|"correct"|"wrong">("idle");
  const [orbState,    setOrbState]    = useState<"idle"|"speaking"|"listening">("idle");
  const [isListening, setIsListening] = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(TIMEOUT_SEC);
  const [permError,   setPermError]   = useState(false);
  const [qualified,   setQualified]   = useState(false);
  const [ready,       setReady]       = useState(false);

  // ─── refs (never cause re-render, no stale closure risk) ────────────────
  const recogRef    = useRef<SpeechRecognition | null>(null);
  const resolveRef  = useRef<((v: string) => void) | null>(null);
  const finalRef    = useRef("");
  const interimRef  = useRef("");
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef    = useRef(TIMEOUT_SEC);
  const doneRef     = useRef(false); // guard: prevent double-resolve

  // ─── candidate ──────────────────────────────────────────────────────────
  const candidate = (() => {
    try { return JSON.parse(sessionStorage.getItem("xpay-candidate") ?? "{}"); }
    catch { return null; }
  })();

  // ─── init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!candidate?.email) { navigate("/login"); return; }
    if (!screening || !exam) { navigate("/dashboard"); return; }
    ensureMicPermission().then((ok) => {
      if (ok) setReady(true); else setPermError(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => () => {
    window.speechSynthesis.cancel();
    killRec();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── kill recognition + timer (pure-ref, no deps) ───────────────────────
  function killRec() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recogRef.current) { try { recogRef.current.stop(); } catch {} recogRef.current = null; }
  }

  // ─── finalize answer (called by mic btn OR timer) ────────────────────────
  // Uses only refs → zero stale-closure risk
  function finalizeAnswer() {
    if (doneRef.current) return;   // already resolved this question
    doneRef.current = true;
    killRec();
    setIsListening(false);
    setOrbState("idle");
    setTimeLeft(0);
    const answer = (finalRef.current || interimRef.current).trim();
    if (resolveRef.current) {
      resolveRef.current(answer);
      resolveRef.current = null;
    }
  }

  // ─── speech synthesis ────────────────────────────────────────────────────
  const speak = useCallback((text: string): Promise<void> =>
    new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang   = "en-US"; utt.rate = 0.9; utt.pitch = 1.05; utt.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google"))
                || voices.find((v) => v.lang.startsWith("en"));
      if (pick) utt.voice = pick;
      utt.onstart = () => { setOrbState("speaking"); setStatusKind("speaking"); setStatusText("🤖 AI is speaking\u2026"); };
      utt.onend   = () => { setOrbState("idle"); resolve(); };
      utt.onerror = () => { setOrbState("idle"); resolve(); };
      window.speechSynthesis.speak(utt);
    }), []);

  // ─── listen: returns a Promise that resolves ONLY when user submits ──────
  const listen = useCallback((): Promise<string> =>
    new Promise((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }

      // reset all answer state
      finalRef.current   = "";
      interimRef.current = "";
      doneRef.current    = false;
      resolveRef.current = resolve;

      const rec = new SR() as SpeechRecognition;
      rec.lang           = "en-US";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous     = true;  // stays open until we call .stop()
      recogRef.current   = rec;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let fin = "", intr = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) fin  += e.results[i][0].transcript;
          else                      intr += e.results[i][0].transcript;
        }
        finalRef.current   = fin;
        interimRef.current = intr;
        setTranscript(fin || intr);
      };

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === "no-speech" || e.error === "aborted") return; // ignore harmless
        finalizeAnswer();
      };

      // onend fires when .stop() is called — only finalise if not done yet
      rec.onend = () => {
        if (!doneRef.current) finalizeAnswer();
      };

      rec.start();

      setIsListening(true);
      setOrbState("listening");
      setStatusKind("listening");
      setStatusText("🔴 Listening\u2026 speak your answer");
      setTranscript("");

      // ── countdown timer ──
      countRef.current = TIMEOUT_SEC;
      setTimeLeft(TIMEOUT_SEC);

      timerRef.current = setInterval(() => {
        countRef.current -= 1;
        setTimeLeft(countRef.current);
        if (countRef.current <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          finalizeAnswer();
        }
      }, 1000);
    }),
  // listen has NO dependencies — everything accessed via refs or setters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // ─── evaluate ────────────────────────────────────────────────────────────
  function evaluate(q: VoiceQuestion, answer: string): boolean {
    const lower = answer.toLowerCase();
    return q.keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  // ─── main flow ───────────────────────────────────────────────────────────
  const runFlow = useCallback(async () => {
    if (!screening || !exam || !candidate) return;

    // ensure voices are loaded
    if (!window.speechSynthesis.getVoices().length) {
      await new Promise<void>((r) => {
        window.speechSynthesis.onvoiceschanged = () => r();
        setTimeout(r, 1500); // fallback
      });
    }
    await new Promise((r) => setTimeout(r, 300));

    setStage("speaking");
    await speak(
      `Hello ${candidate.name}! ${screening.intro} ` +
      `You need at least ${screening.passMark} correct to qualify. Let's begin!`
    );

    const newScores: ScoreEntry[] = [];

    for (let i = 0; i < screening.questions.length; i++) {
      const q = screening.questions[i];
      setQIndex(i);
      setTranscript("");

      // 1. AI speaks the question
      setStage("speaking");
      await speak(q.speak);
      await new Promise((r) => setTimeout(r, 600)); // short pause before mic opens

      // 2. Wait for candidate's spoken answer
      setStage("listening");
      const answer = await listen();               // ← BLOCKS here until mic btn or timeout
      const heard  = answer || "(no answer heard)";
      setTranscript(heard);

      // 3. Evaluate
      const correct = evaluate(q, answer);
      newScores.push({ correct, heard });
      setScores([...newScores]);

      // 4. AI gives feedback
      setStage("feedback");
      setStatusText(correct ? "✅ Correct!" : "❌ Incorrect");
      setStatusKind(correct ? "correct" : "wrong");
      await speak(correct ? `Correct! ${q.explanation}` : `Not quite. ${q.explanation}`);
      await new Promise((r) => setTimeout(r, 400));
    }

    // 5. Final result
    const total  = newScores.filter((s) => s.correct).length;
    const passed = total >= screening.passMark;
    setQualified(passed);
    setStage("result");
    setStatusText("📊 Screening complete");
    setStatusKind("idle");

    await speak(
      passed
        ? `Congratulations ${candidate.name}! You scored ${total} out of ${screening.questions.length} and qualified for the ${exam.title}. You may now proceed.`
        : `Sorry ${candidate.name}. You scored ${total} out of ${screening.questions.length}. You need at least ${screening.passMark} correct to qualify. Please try again.`
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, listen]);

  useEffect(() => { if (ready) runFlow(); }, [ready, runFlow]);

  if (!screening || !exam || !candidate) return null;

  const TOTAL_S  = TIMEOUT_SEC;
  const radius   = 34;
  const circum   = 2 * Math.PI * radius;
  const dashOff  = circum * (1 - timeLeft / TOTAL_S);

  const qObj = screening.questions[Math.min(qIndex, screening.questions.length - 1)];
  const pct  = stage === "result" ? 100 : (qIndex / screening.questions.length) * 100;

  // ═══════════════════ PERMISSION ERROR ═══════════════════════
  if (permError) return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center shadow-brand">
        <div className="text-5xl mb-4">🎤</div>
        <h2 className="text-xl font-bold mb-2">Microphone Required</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Allow microphone access in your browser, then refresh.
        </p>
        <button onClick={() => window.location.reload()}
          className="h-11 w-full rounded-xl bg-brand-gradient text-white font-semibold border-0 cursor-pointer">
          Refresh &amp; Retry
        </button>
      </div>
    </main>
  );

  // ═══════════════════ RESULT ══════════════════════════════════
  if (stage === "result") {
    const correctCount = scores.filter((s) => s.correct).length;
    return (
      <main className="min-h-screen grid place-items-center px-4 py-12 relative">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="glass rounded-2xl p-10 max-w-lg w-full text-center shadow-brand relative z-10">
          <div className="text-6xl mb-3">{qualified ? "🎉" : "😔"}</div>
          <h2 className={`text-3xl font-bold mb-2 ${qualified ? "text-green-400" : "text-red-400"}`}>
            {qualified ? "You Qualified!" : "Not Qualified"}
          </h2>
          <p className="text-muted-foreground mb-6">
            Score: <strong className="text-foreground">{correctCount}&nbsp;/&nbsp;{screening.questions.length}</strong>
            &nbsp;·&nbsp;Pass mark: {screening.passMark}
          </p>
          <div className="space-y-3 mb-8 text-left">
            {scores.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm border ${
                s.correct ? "bg-green-500/10 border-green-500/25" : "bg-red-500/10 border-red-500/25"
              }`}>
                <span className="text-xl mt-0.5">{s.correct ? "✅" : "❌"}</span>
                <div>
                  <p className="font-medium">{screening.questions[i]?.display}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">You said: &ldquo;{s.heard}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
          {qualified ? (
            <button
              onClick={() => navigate(examId === "coding" ? `/coding/${examId}` : `/exam/${examId}`)}
              className="h-12 w-full rounded-xl bg-brand-gradient text-white font-bold border-0 cursor-pointer hover:opacity-90 transition-all">
              Proceed to {exam.title} →
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => { setStage("intro"); setScores([]); setQIndex(0); runFlow(); }}
                className="h-12 w-full rounded-xl bg-brand-gradient text-white font-bold border-0 cursor-pointer hover:opacity-90 transition-all">
                🔄 Try Again
              </button>
              <button onClick={() => navigate("/dashboard")}
                className="h-11 w-full rounded-xl border border-border bg-transparent text-muted-foreground text-sm cursor-pointer hover:bg-muted/20 transition-all">
                ← Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ═══════════════════ MAIN VOICE UI ═══════════════════════════
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-gradient opacity-15 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo className="h-9" />
          <span className="text-sm text-muted-foreground">
            AI Screening &nbsp;·&nbsp;
            <span className="text-foreground font-medium">{exam.title}</span>
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 flex flex-col items-center gap-8">

        {/* ── Progress ── */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Question {Math.min(qIndex + 1, screening.questions.length)}&nbsp;of&nbsp;{screening.questions.length}</span>
            <span>👤 {candidate.name}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/30">
            <div className="h-1.5 rounded-full bg-brand-gradient transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* ── AI Orb ── */}
        <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
          {[0, 1].map((i) => (
            <span key={i} className={`absolute rounded-full border-2 ${
              orbState === "speaking"  ? "border-primary/50 animate-ping" :
              orbState === "listening" ? "border-red-400/50 animate-ping" :
              "border-transparent"
            }`}
              style={{
                width:  176 + i * 28,
                height: 176 + i * 28,
                animationDelay:    `${i * 0.4}s`,
                animationDuration: "1.6s",
                top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
              }}
            />
          ))}
          <div className={`relative z-10 h-36 w-36 rounded-full bg-brand-gradient flex items-center justify-center text-6xl shadow-brand transition-transform duration-300 select-none ${
            orbState === "speaking"  ? "scale-110" :
            orbState === "listening" ? "scale-105" : "scale-100"
          }`}>
            🤖
          </div>
        </div>

        {/* ── Question card ── */}
        <div className="glass w-full rounded-2xl p-6 shadow-brand text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Question {qIndex + 1} / {screening.questions.length}
          </p>
          <p className="text-lg font-semibold leading-relaxed">{qObj.display}</p>

          {/* status pill */}
          <div className={`inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full text-sm font-medium border ${
            statusKind === "speaking"  ? "bg-primary/15 border-primary/30 text-primary" :
            statusKind === "listening" ? "bg-red-500/15 border-red-400/30 text-red-400" :
            statusKind === "correct"   ? "bg-green-500/15 border-green-400/30 text-green-400" :
            statusKind === "wrong"     ? "bg-red-500/15 border-red-400/30 text-red-400" :
            "bg-muted/20 border-border text-muted-foreground"
          }`}>
            {statusText}
          </div>
        </div>

        {/* ── Live transcript ── */}
        <div className={`w-full glass rounded-xl px-5 py-4 text-sm text-center min-h-[56px] ${
          transcript ? "text-foreground" : "text-muted-foreground italic"
        }`}>
          {transcript || "Your spoken answer will appear here\u2026"}
        </div>

        {/* ── Mic + countdown ── */}
        <div className="flex flex-col items-center gap-3 pb-6">

          {/* SVG countdown ring + mic button */}
          <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
            {/* track */}
            <svg className="absolute inset-0" width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="40" cy="40" r={radius} fill="none"
                stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
              {/* progress arc — only shown while listening */}
              {isListening && (
                <circle cx="40" cy="40" r={radius} fill="none"
                  stroke={timeLeft <= 5 ? "#ef4444" : "#6366f1"}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circum}
                  strokeDashoffset={dashOff}
                  style={{ transition: "stroke-dashoffset 0.95s linear, stroke 0.3s ease" }}
                />
              )}
            </svg>

            {/* mic button */}
            <button
              onClick={() => isListening && finalizeAnswer()}
              disabled={!isListening}
              aria-label={isListening ? `Submit answer (${timeLeft}s left)` : "Waiting"}
              className={`relative z-10 h-14 w-14 rounded-full border-0 text-2xl flex items-center justify-center transition-all select-none
                ${ isListening
                  ? "bg-red-500 cursor-pointer shadow-[0_0_28px_rgba(239,68,68,0.55)]"
                  : "bg-muted/30 opacity-40 cursor-not-allowed"
                }`}
            >
              🎤
            </button>
          </div>

          {/* countdown number */}
          {isListening && (
            <span className={`text-2xl font-bold tabular-nums ${
              timeLeft <= 5 ? "text-red-400" : "text-primary"
            }`}>
              {timeLeft}s
            </span>
          )}

          {/* helper label */}
          <span className="text-xs text-muted-foreground text-center">
            {isListening
              ? "🔴 Click mic to submit your answer"
              : stage === "speaking" ? "🤖 AI is speaking, please wait…"
              : stage === "feedback" ? "🤖 AI is giving feedback…"
              : "⏳ Please wait…"}
          </span>
        </div>

      </div>
    </main>
  );
}
