/**
 * VoiceScreener — Complete, battle-tested implementation
 *
 * KEY DESIGN DECISIONS:
 * 1. MediaStream kept ALIVE for the entire screening session.
 *    Chrome requires an active audio stream (or prior user-gesture permission)
 *    for SpeechRecognition to work. Stopping the stream between questions
 *    causes "not-allowed" errors. We open it ONCE, keep it open, close at end.
 *
 * 2. All mutable logic lives in useRef callbacks (fnRef pattern).
 *    This eliminates ALL stale-closure bugs in async flows and rolling restarts.
 *
 * 3. Rolling-restart pattern for SpeechRecognition:
 *    Chrome auto-stops recognition after ~8s of silence.
 *    We restart automatically on onend until `submittedRef` is true.
 *    This gives the candidate the full 2-minute window to answer.
 *
 * 4. Mic permission asked ONCE via a visible "Start Screening" button
 *    (user-gesture required by browsers). Stream stays open until result.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { EXAMS } from "@/lib/exams";
import { getScreening, type VoiceQuestion } from "@/lib/voice-questions";

// ─────────────────────────────────────────────────────────────────────────────
// TTS — returns Promise that resolves when utterance ends
// ─────────────────────────────────────────────────────────────────────────────
function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang   = "en-US";
    u.rate   = 0.88;
    u.pitch  = 1.05;
    u.volume = 1;
    const vs = window.speechSynthesis.getVoices();
    u.voice  =
      vs.find((v) => v.lang.startsWith("en") && /Google|Natural|Neural/i.test(v.name)) ??
      vs.find((v) => v.lang.startsWith("en")) ??
      null;
    u.onend   = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

function waitVoices(): Promise<void> {
  return new Promise((r) => {
    if (window.speechSynthesis.getVoices().length) { r(); return; }
    const cb = () => { window.speechSynthesis.removeEventListener("voiceschanged", cb); r(); };
    window.speechSynthesis.addEventListener("voiceschanged", cb);
    setTimeout(r, 2500);
  });
}

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

const LISTEN_SEC = 120; // 2 minutes per question

type Phase = "idle" | "starting" | "speaking" | "listening" | "feedback" | "result";

// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceScreener() {
  const { examId } = useParams<{ examId: string }>();
  const navigate   = useNavigate();
  const screening  = examId ? getScreening(examId) : null;
  const exam       = EXAMS.find((e) => e.id === examId);

  // ── UI state ──
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [qIndex,     setQIndex]     = useState(0);
  const [transcript, setTranscript] = useState("");
  const [aiText,     setAiText]     = useState("");
  const [timeLeft,   setTimeLeft]   = useState(LISTEN_SEC);
  const [scores,     setScores]     = useState<{ correct: boolean; heard: string }[]>([]);
  const [qualified,  setQualified]  = useState(false);
  const [permErr,    setPermErr]    = useState(""); // error message string

  // ── stable refs (never stale) ──
  const streamRef    = useRef<MediaStream | null>(null);  // kept alive
  const recRef       = useRef<SpeechRecognition | null>(null);
  const submittedRef = useRef(true);   // true = not listening (default safe)
  const resolveRef   = useRef<((s: string) => void) | null>(null);
  const accumRef     = useRef("");
  const interimRef   = useRef("");
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef     = useRef(LISTEN_SEC);
  const runningRef   = useRef(false);
  const phaseRef     = useRef<Phase>("idle"); // mirror of phase for use inside closures

  // keep phaseRef in sync
  function goPhase(p: Phase) { phaseRef.current = p; setPhase(p); }

  const candidate = (() => {
    try { return JSON.parse(sessionStorage.getItem("xpay-candidate") ?? "{}"); }
    catch { return null; }
  })();

  // redirect guards
  useEffect(() => {
    if (!candidate?.email) { navigate("/login"); return; }
    if (!screening || !exam) { navigate("/dashboard"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cleanup on unmount — close stream, cancel TTS, kill recognition
  useEffect(() => () => {
    window.speechSynthesis.cancel();
    killRec();
    closeStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers (pure ref-based, no closure issues) ──────────────────────────

  function closeStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function killRec() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recRef.current) { try { recRef.current.abort(); } catch {} recRef.current = null; }
  }

  // Called when user clicks mic button OR timer hits 0
  function submitAnswer() {
    if (submittedRef.current) return; // guard: only once per question
    submittedRef.current = true;
    killRec();
    goPhase("feedback");
    const answer = (accumRef.current + (interimRef.current ? " " + interimRef.current : "")).trim();
    setTranscript(answer || "(no answer)");
    resolveRef.current?.(answer);
    resolveRef.current = null;
  }

  // startRec is stored in a ref so onend always calls the latest version
  const startRecRef = useRef<() => void>(() => {});
  startRecRef.current = function startRec() {
    if (submittedRef.current) return; // already submitted, don't restart

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setPermErr("SpeechRecognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const rec: SpeechRecognition = new SR();
    rec.lang            = "en-US";
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.continuous      = false; // short sessions + rolling restart = most reliable
    recRef.current      = rec;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let fin = "", intr = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin  += e.results[i][0].transcript;
        else                      intr += e.results[i][0].transcript;
      }
      if (fin) accumRef.current += (accumRef.current ? " " : "") + fin;
      interimRef.current = intr;
      setTranscript((accumRef.current + (intr ? " " + intr : "")).trim());
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      recRef.current = null;
      if (e.error === "aborted") return; // we called abort(), ignore
      if (e.error === "not-allowed") {
        setPermErr("Microphone permission was denied. Please allow mic access and refresh.");
        submittedRef.current = true; // stop restarts
        return;
      }
      // no-speech, audio-capture, network errors — just restart
      if (!submittedRef.current) setTimeout(() => startRecRef.current(), 400);
    };

    rec.onend = () => {
      recRef.current = null;
      // Rolling restart: keep listening until user submits
      if (!submittedRef.current) setTimeout(() => startRecRef.current(), 300);
    };

    try {
      rec.start();
    } catch (err) {
      recRef.current = null;
      if (!submittedRef.current) setTimeout(() => startRecRef.current(), 500);
    }
  };

  // ── listen(): blocks until user submits or timer expires ─────────────────
  function listenForAnswer(): Promise<string> {
    return new Promise((resolve) => {
      // reset per-question state
      submittedRef.current = false;
      resolveRef.current   = resolve;
      accumRef.current     = "";
      interimRef.current   = "";

      setTranscript("");
      goPhase("listening");
      setAiText("🔴 Listening\u2026 speak your answer clearly");

      // start first recognition session
      startRecRef.current();

      // countdown timer
      countRef.current = LISTEN_SEC;
      setTimeLeft(LISTEN_SEC);
      timerRef.current = setInterval(() => {
        countRef.current -= 1;
        setTimeLeft(countRef.current);
        if (countRef.current <= 0) {
          clearInterval(timerRef.current!); timerRef.current = null;
          submitAnswer();
        }
      }, 1000);
    });
  }

  // ── keyword evaluator ─────────────────────────────────────────────────────
  function evaluate(q: VoiceQuestion, answer: string): boolean {
    const lower = answer.toLowerCase();
    return q.keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  // ── main screening flow ───────────────────────────────────────────────────
  async function runFlow() {
    if (!screening || !exam || !candidate || runningRef.current) return;
    runningRef.current = true;

    goPhase("starting");
    setAiText("⏳ Requesting microphone\u2026");

    // 1. Open mic stream ONCE and keep it alive
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
        ? "Microphone permission denied. Please allow mic access in browser settings, then refresh."
        : "Could not access microphone. Please check your device settings and refresh.";
      setPermErr(msg);
      runningRef.current = false;
      return;
    }

    await waitVoices();
    await new Promise((r) => setTimeout(r, 300));

    // 2. Intro speech
    goPhase("speaking");
    setAiText("🤖 AI is speaking\u2026");
    await speakText(
      `Hello ${candidate.name}! ${screening.intro} ` +
      `You need at least ${screening.passMark} correct answers to qualify. ` +
      `You have 2 minutes to answer each question. Let's begin!`
    );

    const newScores: { correct: boolean; heard: string }[] = [];

    for (let i = 0; i < screening.questions.length; i++) {
      const q = screening.questions[i];
      setQIndex(i);
      setTranscript("");

      // 3. AI speaks the question
      goPhase("speaking");
      setAiText(`🤖 Question ${i + 1} of ${screening.questions.length}: ${q.display}`);
      await speakText(q.speak);

      // Short pause — lets TTS audio fully flush before mic opens
      await new Promise((r) => setTimeout(r, 800));

      // 4. Listen — blocks here until user submits or 2 min expires
      const answer = await listenForAnswer();
      const heard  = answer || "(no answer)";

      // 5. Evaluate
      const correct = evaluate(q, answer);
      newScores.push({ correct, heard });
      setScores([...newScores]);

      // 6. Feedback
      goPhase("feedback");
      const fbText = correct
        ? `Correct! ${q.explanation}`
        : `Not quite. ${q.explanation}`;
      setAiText((correct ? "✅ " : "❌ ") + fbText);
      await speakText(fbText);
      await new Promise((r) => setTimeout(r, 500));
    }

    // 7. Result
    const total  = newScores.filter((s) => s.correct).length;
    const passed = total >= screening.passMark;
    setQualified(passed);
    closeStream(); // done — release mic
    goPhase("result");

    const resultMsg = passed
      ? `Congratulations ${candidate.name}! You scored ${total} out of ${screening.questions.length} and qualified for ${exam.title}. You may now proceed.`
      : `Sorry ${candidate.name}. You scored ${total} out of ${screening.questions.length}. You need ${screening.passMark} correct to qualify. Please try again.`;
    setAiText(resultMsg);
    await speakText(resultMsg);
    runningRef.current = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (!screening || !exam || !candidate) return null;

  const qObj        = screening.questions[Math.min(qIndex, screening.questions.length - 1)];
  const pct         = phase === "result" ? 100 : (qIndex / screening.questions.length) * 100;
  const R           = 40;
  const CIRCUM      = 2 * Math.PI * R;
  const dashOff     = CIRCUM * (1 - timeLeft / LISTEN_SEC);
  const isListening = phase === "listening";
  const isLow       = timeLeft <= 30;

  // ══ PERMISSION / BROWSER ERROR ══════════════════════════════════════════
  if (permErr) return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center shadow-brand">
        <div className="text-5xl mb-4">🎤</div>
        <h2 className="text-xl font-bold mb-2">Microphone Required</h2>
        <p className="text-sm text-muted-foreground mb-5">{permErr}</p>
        <button onClick={() => window.location.reload()}
          className="h-11 w-full rounded-xl bg-brand-gradient text-white font-semibold border-0 cursor-pointer">
          Refresh &amp; Retry
        </button>
      </div>
    </main>
  );

  // ══ IDLE — "Start Screening" gate (user-gesture grants mic) ═════════════
  if (phase === "idle") return (
    <main className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center shadow-brand relative z-10">
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-2xl font-bold mb-2">AI Voice Screening</h2>
        <p className="text-muted-foreground text-sm mb-1">
          <strong className="text-foreground">{exam.title}</strong>
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          {screening.questions.length} questions &middot; {screening.passMark} correct to qualify &middot; 2 min each
        </p>
        <div className="glass rounded-xl p-4 mb-6 text-xs text-muted-foreground text-left space-y-1.5 border border-border">
          <p>🎤 Your microphone will be enabled once you click Start</p>
          <p>🔇 Find a quiet place and speak clearly</p>
          <p>⏱ You have 2 minutes per question</p>
          <p>🔴 Click the mic button to submit each answer early</p>
        </div>
        <button
          onClick={runFlow}
          className="h-12 w-full rounded-xl bg-brand-gradient text-white font-bold border-0 cursor-pointer hover:opacity-90 transition-all text-base">
          🎤 Start Screening
        </button>
      </div>
    </main>
  );

  // ══ RESULT ═══════════════════════════════════════════════════════════════
  if (phase === "result") {
    const correctCount = scores.filter((s) => s.correct).length;
    return (
      <main className="min-h-screen grid place-items-center px-4 py-12 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="glass rounded-2xl p-10 max-w-lg w-full text-center shadow-brand relative z-10">
          <div className="text-6xl mb-3">{qualified ? "🎉" : "😔"}</div>
          <h2 className={`text-3xl font-bold mb-2 ${qualified ? "text-green-400" : "text-red-400"}`}>
            {qualified ? "You Qualified!" : "Not Qualified"}
          </h2>
          <p className="text-muted-foreground mb-6">
            Score: <strong className="text-foreground">{correctCount}&nbsp;/&nbsp;{screening.questions.length}</strong>
            &nbsp;&middot;&nbsp;Pass mark: {screening.passMark}
          </p>
          <div className="space-y-3 mb-8 text-left">
            {scores.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm border ${
                s.correct ? "bg-green-500/10 border-green-500/25" : "bg-red-500/10 border-red-500/25"
              }`}>
                <span className="text-xl mt-0.5">{s.correct ? "✅" : "❌"}</span>
                <div>
                  <p className="font-medium">{screening.questions[i]?.display}</p>
                  <p className="text-xs text-muted-foreground mt-1">You said: &ldquo;{s.heard}&rdquo;</p>
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
              <button onClick={() => {
                setScores([]); setQIndex(0); setTranscript("");
                setAiText(""); setPermErr("");
                runningRef.current = false;
                goPhase("idle");
              }}
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

  // ══ MAIN SCREENING UI ════════════════════════════════════════════════════
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-gradient opacity-15 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo className="h-9" />
          <span className="text-sm text-muted-foreground">
            AI Screening&nbsp;&middot;&nbsp;
            <span className="text-foreground font-medium">{exam.title}</span>
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 flex flex-col items-center gap-8">

        {/* Progress */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Question {Math.min(qIndex + 1, screening.questions.length)}&nbsp;of&nbsp;{screening.questions.length}</span>
            <span>👤&nbsp;{candidate.name}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/30">
            <div className="h-1.5 rounded-full bg-brand-gradient transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* AI Orb */}
        <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
          {[0, 1].map((i) => (
            <span key={i}
              className={`absolute rounded-full border-2 ${
                phase === "speaking"  ? "border-primary/50 animate-ping" :
                phase === "listening" ? "border-red-400/50 animate-ping" :
                "border-transparent"
              }`}
              style={{
                width: 172 + i * 30, height: 172 + i * 30,
                top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                animationDelay: `${i * 0.45}s`,
                animationDuration: "1.6s",
              }}
            />
          ))}
          <div className={`relative z-10 h-36 w-36 rounded-full bg-brand-gradient
            flex items-center justify-center text-6xl shadow-brand select-none
            transition-transform duration-300
            ${ phase === "speaking" ? "scale-110" : phase === "listening" ? "scale-105" : "scale-100" }`}>
            🤖
          </div>
        </div>

        {/* AI text bubble */}
        {aiText && (
          <div className="glass w-full rounded-2xl px-6 py-4 border border-border shadow-brand">
            <p className="text-sm font-medium leading-relaxed text-center">{aiText}</p>
          </div>
        )}

        {/* Question card */}
        <div className="glass w-full rounded-2xl p-6 shadow-brand text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Question {qIndex + 1} / {screening.questions.length}
          </p>
          <p className="text-lg font-semibold leading-relaxed">{qObj.display}</p>

          <span className={`inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full text-sm font-medium border ${
            phase === "starting"  ? "bg-muted/20 border-border text-muted-foreground" :
            phase === "speaking"  ? "bg-primary/15 border-primary/30 text-primary" :
            phase === "listening" ? "bg-red-500/15 border-red-400/30 text-red-400" :
            phase === "feedback" && scores[scores.length - 1]?.correct
              ? "bg-green-500/15 border-green-400/30 text-green-400"
            : phase === "feedback"
              ? "bg-red-500/15 border-red-400/30 text-red-400"
            : "bg-muted/20 border-border text-muted-foreground"
          }`}>
            {{ starting: "⏳ Initialising…",
               speaking:  "🤖 AI speaking…",
               listening: "🔴 Listening — speak now",
               feedback:  scores[scores.length - 1]?.correct ? "✅ Correct!" : "❌ Incorrect",
               result:    "",
               idle:      "",
            }[phase]}
          </span>
        </div>

        {/* Live transcript */}
        <div className={`w-full glass rounded-xl px-5 py-4 text-sm text-center
          min-h-[64px] leading-relaxed border transition-all ${
          transcript ? "text-foreground border-primary/25" : "text-muted-foreground italic border-border"
        }`}>
          {transcript || (isListening ? "Speak now\u2026 I\u2019m listening \ud83c\udf99\ufe0f" : "Your answer will appear here\u2026")}
        </div>

        {/* Mic button + countdown */}
        <div className="flex flex-col items-center gap-4 pb-8">

          {/* SVG ring + mic button */}
          <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
            <svg className="absolute inset-0" width="112" height="112"
              style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
              <circle cx="56" cy="56" r={R} fill="none"
                stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
              {isListening && (
                <circle cx="56" cy="56" r={R} fill="none"
                  stroke={isLow ? "#ef4444" : "#6366f1"}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={CIRCUM}
                  strokeDashoffset={dashOff}
                  style={{ transition: "stroke-dashoffset 0.95s linear, stroke 0.5s" }}
                />
              )}
            </svg>
            <button
              onClick={() => { if (isListening) submitAnswer(); }}
              disabled={!isListening}
              aria-label={isListening ? `Submit answer, ${fmtTime(timeLeft)} remaining` : "Waiting for AI"}
              style={{ width: 72, height: 72 }}
              className={`relative z-10 rounded-full border-0 flex items-center justify-center
                text-3xl transition-all select-none
                ${ isListening
                  ? `bg-red-500 cursor-pointer shadow-[0_0_32px_rgba(239,68,68,0.6)]
                     hover:scale-105 active:scale-95
                     ${ isLow ? "animate-pulse" : "" }`
                  : "bg-muted/30 opacity-35 cursor-not-allowed"
                }`}
            >
              🎤
            </button>
          </div>

          {/* countdown */}
          {isListening && (
            <span className={`text-4xl font-bold tabular-nums ${
              isLow ? "text-red-400" : "text-primary"
            }`}>
              {fmtTime(timeLeft)}
            </span>
          )}

          {/* status hint */}
          <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            {isListening
              ? "🔴 Mic active \u00b7 speak your answer \u00b7 click \ud83c\udfa4 to submit early"
              : phase === "speaking"  ? "🤖 AI is speaking, please wait\u2026"
              : phase === "feedback"  ? "🤖 Feedback playing, next question coming\u2026"
              : phase === "starting"  ? "⏳ Starting up, please wait\u2026"
              : ""}
          </p>
        </div>

      </div>
    </main>
  );
}
