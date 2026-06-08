import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { getScreening, type VoiceQuestion } from "@/lib/voice-questions";
import { EXAMS } from "@/lib/exams";

type Stage = "intro" | "speaking" | "listening" | "feedback" | "result";

interface ScoreEntry { correct: boolean; heard: string; }

// ── mic permission asked ONCE ──
let micGranted = false;
async function ensureMicPermission(): Promise<boolean> {
  if (micGranted) return true;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    micGranted = true;
    return true;
  } catch {
    return false;
  }
}

const LISTEN_TIMEOUT_MS = 15_000; // max 15 s per answer

export default function VoiceScreener() {
  const { examId } = useParams<{ examId: string }>();
  const navigate   = useNavigate();
  const screening  = examId ? getScreening(examId) : null;
  const exam       = EXAMS.find((e) => e.id === examId);

  // ── state ──
  const [stage,      setStage]      = useState<Stage>("intro");
  const [qIndex,     setQIndex]     = useState(0);
  const [scores,     setScores]     = useState<ScoreEntry[]>([]);
  const [transcript, setTranscript] = useState("");
  const [statusText, setStatusText] = useState("Preparing AI…");
  const [statusKind, setStatusKind] = useState<"idle"|"speaking"|"listening"|"correct"|"wrong">("idle");
  const [orbState,   setOrbState]   = useState<"idle"|"speaking"|"listening">("idle");
  const [isListening,setIsListening]= useState(false);   // drives mic button UI
  const [timeLeft,   setTimeLeft]   = useState(0);       // countdown seconds
  const [permError,  setPermError]  = useState(false);
  const [qualified,  setQualified]  = useState(false);
  const [ready,      setReady]      = useState(false);

  // ── refs ──
  const recogRef     = useRef<SpeechRecognition | null>(null);
  const resolveRef   = useRef<((v: string) => void) | null>(null);
  const finalRef     = useRef("");
  const interimRef   = useRef("");
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef     = useRef(0);

  const candidate = (() => {
    try { return JSON.parse(sessionStorage.getItem("xpay-candidate") ?? "{}"); }
    catch { return null; }
  })();

  useEffect(() => {
    if (!candidate?.email) { navigate("/login"); return; }
    if (!screening || !exam) { navigate("/dashboard"); return; }
    ensureMicPermission().then((ok) => {
      if (ok) setReady(true);
      else    setPermError(true);
    });
  }, []);

  // ── speech synthesis ──
  const speak = useCallback((text: string): Promise<void> =>
    new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utt   = new SpeechSynthesisUtterance(text);
      utt.lang    = "en-US";
      utt.rate    = 0.9;
      utt.pitch   = 1.05;
      utt.volume  = 1;
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google"))
                || voices.find((v) => v.lang.startsWith("en"));
      if (pick) utt.voice = pick;
      utt.onstart = () => { setOrbState("speaking"); setStatusKind("speaking"); setStatusText("🤖 AI is speaking…"); };
      utt.onend   = () => { setOrbState("idle"); resolve(); };
      utt.onerror = () => { setOrbState("idle"); resolve(); };
      window.speechSynthesis.speak(utt);
    }), []);

  // ── stop recognition + timer ──
  const stopRec = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch {}
      recogRef.current = null;
    }
    setIsListening(false);
    setOrbState("idle");
    setTimeLeft(0);
  }, []);

  // called by mic button OR timer expiry
  const submitAnswer = useCallback(() => {
    stopRec();
    const answer = (finalRef.current || interimRef.current).trim();
    if (resolveRef.current) {
      resolveRef.current(answer);
      resolveRef.current = null;
    }
  }, [stopRec]);

  // ── speech recognition ──
  const listen = useCallback((): Promise<string> =>
    new Promise((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }

      finalRef.current   = "";
      interimRef.current = "";
      resolveRef.current = resolve;

      const rec = new SR() as SpeechRecognition;
      rec.lang            = "en-US";
      rec.interimResults  = true;
      rec.maxAlternatives = 1;
      rec.continuous      = true;   // ← KEY: don't auto-stop on silence
      recogRef.current    = rec;

      rec.onresult = (e) => {
        let fin = "", intr = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) fin  += e.results[i][0].transcript;
          else                      intr += e.results[i][0].transcript;
        }
        finalRef.current   = fin;
        interimRef.current = intr;
        setTranscript(fin || intr);
      };

      rec.onerror = (e) => {
        // ignore no-speech; only abort on real errors
        if (e.error !== "no-speech") submitAnswer();
      };

      // continuous mode shouldn't auto-end, but safety net:
      rec.onend = () => {
        if (resolveRef.current) {
          // recognition ended prematurely — resolve with what we have
          resolveRef.current((finalRef.current || interimRef.current).trim());
          resolveRef.current = null;
          stopRec();
        }
      };

      rec.start();
      setIsListening(true);
      setOrbState("listening");
      setStatusKind("listening");
      setStatusText("🔴 Listening… speak your answer");
      setTranscript("");

      // countdown timer
      countRef.current = LISTEN_TIMEOUT_MS / 1000;
      setTimeLeft(countRef.current);
      timerRef.current = setInterval(() => {
        countRef.current -= 1;
        setTimeLeft(countRef.current);
        if (countRef.current <= 0) submitAnswer();
      }, 1000);
    }), [stopRec, submitAnswer]);

  // ── main flow ──
  const runFlow = useCallback(async () => {
    if (!screening || !exam || !candidate) return;

    window.speechSynthesis.getVoices();
    await new Promise((r) => setTimeout(r, 400));

    setStage("speaking");
    await speak(`Hello ${candidate.name}! ${screening.intro} You need at least ${screening.passMark} correct to qualify. Let's begin!`);

    const newScores: ScoreEntry[] = [];

    for (let i = 0; i < screening.questions.length; i++) {
      const q = screening.questions[i];
      setQIndex(i);
      setTranscript("");

      // AI speaks question
      setStage("speaking");
      await speak(q.speak);
      await new Promise((r) => setTimeout(r, 500));

      // listen for answer
      setStage("listening");
      const answer = await listen();
      const heard  = answer.trim() || "(no answer heard)";
      setTranscript(heard);
      setIsListening(false);

      // evaluate
      const correct = evaluate(q, answer);
      newScores.push({ correct, heard });
      setScores([...newScores]);

      // feedback
      setStage("feedback");
      setStatusText(correct ? "✅ Correct!" : "❌ Incorrect");
      setStatusKind(correct ? "correct" : "wrong");
      await speak(correct ? `Correct! ${q.explanation}` : `Not quite. ${q.explanation}`);
      await new Promise((r) => setTimeout(r, 300));
    }

    const total  = newScores.filter((s) => s.correct).length;
    const passed = total >= screening.passMark;
    setQualified(passed);
    setStage("result");

    if (passed) {
      await speak(`Congratulations ${candidate.name}! You scored ${total} out of ${screening.questions.length} and qualified for the ${exam.title}. Proceed now!`);
    } else {
      await speak(`Sorry ${candidate.name}. You scored ${total} out of ${screening.questions.length}. You need ${screening.passMark} correct. Please try again.`);
    }
  }, [screening, exam, candidate, speak, listen]);

  useEffect(() => {
    if (ready) runFlow();
  }, [ready]);

  // cleanup on unmount
  useEffect(() => () => {
    window.speechSynthesis.cancel();
    stopRec();
  }, [stopRec]);

  if (!screening || !exam || !candidate) return null;

  function evaluate(q: VoiceQuestion, answer: string): boolean {
    const lower = answer.toLowerCase();
    return q.keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  const qObj = screening.questions[Math.min(qIndex, screening.questions.length - 1)];
  const pct  = stage === "result"
    ? 100
    : ((qIndex) / screening.questions.length) * 100;

  // ═══════════════════════════════ PERMISSION ERROR ══════
  if (permError) return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center shadow-brand">
        <div className="text-5xl mb-4">🎤</div>
        <h2 className="text-xl font-bold mb-2">Microphone Required</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Allow microphone access in your browser then refresh.
        </p>
        <button onClick={() => window.location.reload()}
          className="h-11 w-full rounded-xl bg-brand-gradient text-white font-semibold">
          Refresh & Retry
        </button>
      </div>
    </main>
  );

  // ═══════════════════════════════ RESULT ════════════════
  if (stage === "result") {
    const correct = scores.filter((s) => s.correct).length;
    return (
      <main className="min-h-screen grid place-items-center px-4 py-12 relative">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="glass rounded-2xl p-10 max-w-lg w-full text-center shadow-brand relative z-10">
          <div className="text-6xl mb-3">{qualified ? "🎉" : "😔"}</div>
          <h2 className={`text-3xl font-bold mb-2 ${qualified ? "text-green-400" : "text-red-400"}`}>
            {qualified ? "You Qualified!" : "Not Qualified"}
          </h2>
          <p className="text-muted-foreground mb-6">
            Score: <strong className="text-foreground">{correct} / {screening.questions.length}</strong>
            &nbsp;·&nbsp; Pass mark: {screening.passMark}
          </p>
          <div className="space-y-3 mb-8 text-left">
            {scores.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm border ${
                s.correct ? "bg-green-500/10 border-green-500/25" : "bg-red-500/10 border-red-500/25"
              }`}>
                <span className="text-lg mt-0.5">{s.correct ? "✅" : "❌"}</span>
                <div>
                  <p className="font-medium">{screening.questions[i].display}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">You said: "{s.heard}"</p>
                </div>
              </div>
            ))}
          </div>
          {qualified ? (
            <button
              onClick={() => navigate(examId === "coding" ? `/coding/${examId}` : `/exam/${examId}`)}
              className="h-12 w-full rounded-xl bg-brand-gradient text-white font-bold border-0 hover:opacity-90 transition-all">
              Proceed to {exam.title} →
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => { setStage("intro" as Stage); setScores([]); setQIndex(0); runFlow(); }}
                className="h-12 w-full rounded-xl bg-brand-gradient text-white font-bold border-0 hover:opacity-90 transition-all">
                🔄 Try Again
              </button>
              <button onClick={() => navigate("/dashboard")}
                className="h-11 w-full rounded-xl border border-border bg-transparent text-muted-foreground text-sm hover:bg-muted/20 transition-all">
                ← Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ═══════════════════════════════ MAIN VOICE UI ═════════
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-gradient opacity-15 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo className="h-9" />
          <span className="text-sm text-muted-foreground">
            AI Screening &nbsp;·&nbsp; <span className="text-foreground font-medium">{exam.title}</span>
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 flex flex-col items-center gap-8">

        {/* Progress bar */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Question {Math.min(qIndex + 1, screening.questions.length)} of {screening.questions.length}</span>
            <span>👤 {candidate.name}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/30">
            <div className="h-1.5 rounded-full bg-brand-gradient transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* AI Orb */}
        <div className="relative flex items-center justify-center">
          {[0, 1].map((i) => (
            <span key={i}
              className={`absolute rounded-full border-2 transition-all ${
                orbState === "speaking"  ? "border-primary/50 animate-ping" :
                orbState === "listening" ? "border-red-400/50 animate-ping" :
                "border-primary/10 opacity-0"
              }`}
              style={{ width: `${176 + i * 28}px`, height: `${176 + i * 28}px`, animationDelay: `${i * 0.35}s`, animationDuration: "1.5s" }}
            />
          ))}
          <div className={`relative z-10 h-36 w-36 rounded-full bg-brand-gradient flex items-center justify-center text-6xl shadow-brand transition-transform duration-300 ${
            orbState === "speaking"  ? "scale-110" :
            orbState === "listening" ? "scale-[1.07]" : "scale-100"
          }`}>
            🤖
          </div>
        </div>

        {/* Question card */}
        <div className="glass w-full rounded-2xl p-6 shadow-brand text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Question {qIndex + 1} / {screening.questions.length}
          </p>
          <p className="text-lg font-semibold leading-relaxed">{qObj.display}</p>

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

        {/* Transcript box */}
        <div className={`w-full glass rounded-xl px-5 py-4 text-sm text-center min-h-[56px] transition-all ${
          transcript ? "text-foreground" : "text-muted-foreground italic"
        }`}>
          {transcript || "Your spoken answer will appear here…"}
        </div>

        {/* Mic button + timer */}
        <div className="flex flex-col items-center gap-3">
          {/* Timer ring */}
          {isListening && timeLeft > 0 && (
            <div className="relative w-20 h-20">
              <svg className="absolute inset-0 -rotate-90" width="80" height="80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke={timeLeft <= 5 ? "#ef4444" : "#6366f1"}
                  strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - timeLeft / (LISTEN_TIMEOUT_MS / 1000))}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                />
              </svg>
              <button
                onClick={submitAnswer}
                className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-red-500 text-2xl flex items-center justify-center shadow-[0_0_28px_rgba(239,68,68,0.6)] animate-pulse border-0 cursor-pointer"
              >
                🎤
              </button>
            </div>
          )}

          {!isListening && (
            <div className={`h-16 w-16 rounded-full bg-muted/30 text-2xl flex items-center justify-center opacity-40`}>
              🎤
            </div>
          )}

          <span className="text-xs text-muted-foreground text-center">
            {isListening
              ? `🔴 Listening — click mic to submit (${timeLeft}s left)`
              : stage === "speaking" ? "🤖 AI is speaking…"
              : stage === "feedback" ? "🤖 AI is giving feedback…"
              : "⏳ Please wait…"}
          </span>
        </div>

      </div>
    </main>
  );
}
