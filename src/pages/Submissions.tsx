// Invigilator-only page. Lists every submission saved by the FastAPI server
// (under /app/submissions/<exam>/<file>.json). Shows a full per-question
// breakdown of each candidate's submitted answers (no candidate score shown
// to the candidate side — only the invigilator sees this).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listSubmissions, getSubmission, type ServerSubmissionListItem, type ServerSubmission } from "@/lib/api";

const INVIGILATOR_PIN = "xpay-2026";

// -- Submission shape extensions used by the invigilator view --
interface McqAnswerRecord {
  question: string;
  options?: string[];
  given?: number;        // index chosen (or undefined)
  correct?: number;      // index of the correct option (for invigilator only)
}
interface CodingResultRecord {
  questionId: string;
  language?: string;
  code?: string;
  passed?: number;
  total?: number;
  marksEarned?: number;
  perCase?: {
    hidden?: boolean;
    passed?: boolean;
    stdout?: string;
    expected?: string;
    stderr?: string;
  }[];
}

type Sub = ServerSubmission & {
  answers?: Record<string, McqAnswerRecord>;
  results?: CodingResultRecord[];
  score?: number;
  total?: number;
  totalMarks?: number;
  totalPossible?: number;
  correctCount?: number;
  attemptedCount?: number;
  durationMs?: number;
  username?: string;
};

function fmtTime(ms?: number): string {
  if (!ms || ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function displayName(it: { candidateName?: string; candidateEmail?: string }): string {
  const n = it.candidateName?.trim();
  return n ? `Mr. ${n}` : (it.candidateEmail ?? "—");
}

export default function SubmissionsPage() {
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [items, setItems] = useState<ServerSubmissionListItem[]>([]);
  const [serverDown, setServerDown] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Sub | null>(null);
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState<"breakdown" | "json">("breakdown");

  const refresh = async () => {
    const res = await fetch("/api/health").catch(() => null);
    if (!res || !res.ok) { setServerDown(true); setItems([]); return; }
    setServerDown(false);
    setItems(await listSubmissions());
  };

  useEffect(() => { if (ok) refresh(); }, [ok]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    getSubmission(selected).then((d) => setDetail(d as Sub));
  }, [selected]);

  if (!ok) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <Card className="max-w-sm w-full glass shadow-brand">
          <CardContent className="p-8">
            <Logo className="mx-auto h-12" />
            <h1 className="mt-6 text-center text-xl font-bold text-brand-gradient">Invigilator Access</h1>
            <Input
              data-testid="invigilator-pin"
              type="password" value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder="Enter invigilator PIN" className="mt-6"
              onKeyDown={(e) => { if (e.key === "Enter") pin === INVIGILATOR_PIN ? setOk(true) : alert("Wrong PIN"); }}
            />
            <Button data-testid="invigilator-unlock" onClick={() => pin === INVIGILATOR_PIN ? setOk(true) : alert("Wrong PIN")}
              className="mt-3 w-full bg-brand-gradient text-white border-0">Unlock</Button>
            <Link to="/login"><Button variant="ghost" className="mt-2 w-full">Back</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = items.filter((it) =>
    !filter
    || (it.candidateName || "").toLowerCase().includes(filter.toLowerCase())
    || (it.candidateEmail || "").toLowerCase().includes(filter.toLowerCase())
    || it.examId.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo className="h-9" />
          <div className="flex items-center gap-2">
            <Badge>Invigilator Mode</Badge>
            <Button variant="outline" size="sm" onClick={refresh} data-testid="invigilator-refresh">Refresh</Button>
            <Link to="/login"><Button variant="ghost" size="sm">Exit</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold">All Candidate Submissions</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} submissions stored on server. Click any candidate to see their
          full per-question response.
        </p>

        {serverDown && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            ⚠ Backend submissions API is not reachable.
          </div>
        )}

        <Input
          data-testid="invigilator-filter"
          value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by candidate name or exam…" className="mt-4 max-w-md"
        />

        <div className="mt-6 grid gap-4 md:grid-cols-[360px,1fr]">
          {/* List */}
          <Card>
            <CardContent className="p-2 max-h-[78vh] overflow-y-auto">
              {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">No submissions.</p>}
              {filtered.map((it) => (
                <button
                  key={it.file}
                  data-testid={`invigilator-row-${it.file}`}
                  onClick={() => setSelected(it.file)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-smooth ${
                    selected === it.file ? "bg-brand-gradient text-white" : "hover:bg-accent"
                  }`}
                >
                  <div className="font-semibold">{displayName(it)}</div>
                  <div className={`text-xs ${selected === it.file ? "text-white/80" : "text-muted-foreground"}`}>
                    {it.examId} · {new Date(it.submittedAt).toLocaleString()}
                  </div>
                  <div className={`text-xs ${selected === it.file ? "text-white/80" : "text-muted-foreground"}`}>
                    {it.kind === "coding"
                      ? `Score ${(it.totalMarks ?? 0).toFixed(2)}/${it.totalPossible ?? "?"}`
                      : `Score ${(it.score ?? 0).toFixed(2)}/${it.total ?? "?"}`} · ⚠ {it.violations}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Detail */}
          <Card>
            <CardContent className="p-5 max-h-[78vh] overflow-y-auto" data-testid="invigilator-detail">
              {!detail && <p className="text-sm text-muted-foreground">Select a submission to see the candidate's full answer sheet.</p>}
              {detail && (
                <div>
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold" data-testid="invigilator-candidate-name">{displayName(detail)}</h2>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {detail.examId} · Submitted {new Date(detail.submittedAt).toLocaleString()} · ⚠ {detail.violations}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={viewMode === "breakdown" ? "default" : "outline"}
                        onClick={() => setViewMode("breakdown")}
                        className={viewMode === "breakdown" ? "bg-brand-gradient border-0 text-white" : ""}
                        data-testid="invigilator-view-breakdown">Breakdown</Button>
                      <Button size="sm" variant={viewMode === "json" ? "default" : "outline"}
                        onClick={() => setViewMode("json")}
                        className={viewMode === "json" ? "bg-brand-gradient border-0 text-white" : ""}
                        data-testid="invigilator-view-json">Raw JSON</Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/api/submissions/${selected}`} download>Download</a>
                      </Button>
                    </div>
                  </div>

                  {/* Score summary chips */}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {detail.score !== undefined && (
                      <span className="rounded-full bg-muted px-3 py-1">
                        MCQ score: <strong>{(detail.score ?? 0).toFixed(2)}/{detail.total ?? "?"}</strong>
                      </span>
                    )}
                    {detail.correctCount !== undefined && (
                      <span className="rounded-full bg-muted px-3 py-1">
                        Correct: <strong>{detail.correctCount}</strong>
                      </span>
                    )}
                    {detail.attemptedCount !== undefined && (
                      <span className="rounded-full bg-muted px-3 py-1">
                        Attempted: <strong>{detail.attemptedCount}</strong>
                      </span>
                    )}
                    {detail.totalMarks !== undefined && (
                      <span className="rounded-full bg-muted px-3 py-1">
                        Coding score: <strong>{(detail.totalMarks ?? 0).toFixed(2)}/{detail.totalPossible ?? "?"}</strong>
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-3 py-1">Duration: <strong>{fmtTime(detail.durationMs)}</strong></span>
                  </div>

                  {viewMode === "json" ? (
                    <pre className="mt-5 max-h-[58vh] overflow-auto rounded-md bg-[#0b1020] p-3 font-mono text-xs text-green-100">
                      {JSON.stringify(detail, null, 2)}
                    </pre>
                  ) : (
                    <div className="mt-5 space-y-6">
                      {/* MCQ breakdown */}
                      {detail.answers && Object.keys(detail.answers).length > 0 && (
                        <section data-testid="invigilator-mcq-section">
                          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-gradient">
                            MCQ Responses
                          </h3>
                          <ol className="space-y-3">
                            {Object.entries(detail.answers).map(([qid, ans], idx) => {
                              const given = ans.given;
                              const correct = ans.correct;
                              const isCorrect = given !== undefined && given === correct;
                              const isWrong = given !== undefined && correct !== undefined && given !== correct;
                              const isUnanswered = given === undefined;
                              return (
                                <li key={qid} className="rounded-xl border border-border bg-card/60 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Q{idx + 1} <span className="opacity-50">({qid})</span>
                                      </div>
                                      <div className="mt-1 text-sm font-medium leading-relaxed">{ans.question}</div>
                                    </div>
                                    {isCorrect && <Badge className="bg-emerald-500/15 text-emerald-600 border-0">Correct</Badge>}
                                    {isWrong && <Badge className="bg-destructive/15 text-destructive border-0">Wrong</Badge>}
                                    {isUnanswered && <Badge variant="secondary">Unanswered</Badge>}
                                  </div>
                                  {ans.options && (
                                    <ul className="mt-3 space-y-1.5">
                                      {ans.options.map((opt, i) => {
                                        const wasGiven = i === given;
                                        const isRight = i === correct;
                                        const color =
                                          wasGiven && isRight ? "border-emerald-500/60 bg-emerald-500/10"
                                          : wasGiven && !isRight ? "border-destructive/60 bg-destructive/10"
                                          : isRight ? "border-emerald-500/40 bg-emerald-500/5"
                                          : "border-border bg-card";
                                        return (
                                          <li key={i} className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${color}`}>
                                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
                                              {String.fromCharCode(65 + i)}
                                            </span>
                                            <span className="flex-1">{opt}</span>
                                            {wasGiven && <span className="text-[10px] font-bold uppercase text-foreground/70">Selected</span>}
                                            {isRight && !wasGiven && <span className="text-[10px] font-bold uppercase text-emerald-600">Correct</span>}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </section>
                      )}

                      {/* Coding breakdown */}
                      {detail.results && detail.results.length > 0 && (
                        <section data-testid="invigilator-coding-section">
                          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-gradient">
                            Coding Submissions
                          </h3>
                          <div className="space-y-4">
                            {detail.results.map((r, idx) => {
                              const passed = r.passed ?? 0;
                              const total = r.total ?? 0;
                              const ok = total > 0 && passed === total;
                              return (
                                <div key={r.questionId + idx} className="rounded-xl border border-border bg-card/60 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {r.questionId}
                                      </div>
                                      <div className="mt-1 text-sm font-bold">Language: {r.language ?? "—"}</div>
                                    </div>
                                    <Badge className={ok ? "bg-emerald-500/15 text-emerald-600 border-0" : "bg-amber-500/15 text-amber-700 border-0"}>
                                      {passed}/{total} tests · {(r.marksEarned ?? 0).toFixed(2)} marks
                                    </Badge>
                                  </div>
                                  {r.code && (
                                    <details className="mt-3">
                                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Show submitted code</summary>
                                      <pre className="mt-2 max-h-[40vh] overflow-auto rounded-md bg-[#0b1020] p-3 font-mono text-xs text-green-100">{r.code}</pre>
                                    </details>
                                  )}
                                  {r.perCase && r.perCase.length > 0 && (
                                    <details className="mt-2">
                                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Show test case results ({r.perCase.length})</summary>
                                      <ul className="mt-2 space-y-1.5 text-xs">
                                        {r.perCase.map((tc, ti) => (
                                          <li key={ti} className={`rounded-md border px-3 py-1.5 ${tc.passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
                                            <span className="font-semibold">Case {ti + 1}</span>
                                            {tc.hidden ? <span className="ml-2 text-[10px] uppercase text-muted-foreground">hidden</span> : null}
                                            <span className={`ml-2 font-semibold ${tc.passed ? "text-emerald-600" : "text-destructive"}`}>
                                              {tc.passed ? "PASS" : "FAIL"}
                                            </span>
                                            {!tc.passed && tc.stderr && (
                                              <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-destructive">{tc.stderr}</pre>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </details>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}

                      {!detail.answers && !detail.results && (
                        <p className="text-sm text-muted-foreground">This submission has no MCQ or coding payload (legacy format). Use Raw JSON to inspect.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
