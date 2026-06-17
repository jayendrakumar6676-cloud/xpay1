import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EXAMS } from "@/lib/exams";
import { getAttempts } from "@/lib/exam-attempts";
import { getCodingSubmissions } from "@/lib/coding-submissions";
import { getExamWindow, formatCountdown } from "@/lib/exam-schedule";

interface Candidate { username?: string; name?: string; email: string; loginAt: number }

export default function Dashboard() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [codingDoneIds, setCodingDoneIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const raw = sessionStorage.getItem("xpay-candidate");
    if (!raw) { navigate("/login"); return; }
    const c: Candidate = JSON.parse(raw);
    setCandidate(c);
    setAttemptedIds(new Set(getAttempts(c.email).map((a) => a.examId)));
    setCodingDoneIds(new Set(getCodingSubmissions(c.email).map((s) => s.examId)));
  }, [navigate]);

  // Refresh the "now" reference every second so the countdown chips tick down.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const logout = () => {
    sessionStorage.removeItem("xpay-candidate");
    navigate("/login");
  };

  if (!candidate) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo className="h-9" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline" data-testid="dashboard-greeting">
              <span className="text-muted-foreground">Welcome,</span>{" "}
              <span className="font-semibold text-brand-gradient">Mr. {candidate.username || candidate.name || "Candidate"}</span>
            </span>
            <Link to="/submissions"><Button variant="ghost" size="sm">Invigilator</Button></Link>
            <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10 overflow-hidden rounded-3xl bg-ink-gradient p-8 text-white shadow-brand sm:p-12 relative">
          <div className="relative z-10">
            <p className="text-sm uppercase tracking-widest text-white/70">Welcome back</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Choose your <span className="text-brand-gradient">XPay Assessment</span>
            </h1>
            <p className="mt-3 max-w-xl text-white/80">
              Each test can be attempted <strong>only once</strong>. Camera &amp; microphone
              access is required. Tab-switching, copy/paste and right-click are monitored.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand-gradient opacity-40 blur-3xl" />
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMS.map((exam) => {
            const done = attemptedIds.has(exam.id) || (exam.id === "dsa" && codingDoneIds.has("dsa"));
            const win = getExamWindow(exam, now);
            const blockedByWindow = !done && (win.status === "upcoming" || win.status === "closed");

            // direct routing — no voice screening gate
            const target =
              exam.id === "dsa"    ? "/dsa" :
              exam.id === "coding" ? `/coding/${exam.id}` :
                                     `/exam/${exam.id}`;

            const startBadgeText =
              done ? "Completed"
              : win.status === "upcoming" ? `Starts in ${formatCountdown(win.startsInMs)}`
              : win.status === "open"     ? `Open · closes in ${formatCountdown(win.endsInMs)}`
              : win.status === "closed"   ? "Window closed"
              : "Available";

            return (
              <Card key={exam.id} className={`relative overflow-hidden transition-smooth ${
                done ? "opacity-70" : (blockedByWindow ? "opacity-80" : "hover:shadow-brand hover:-translate-y-1")
              }`}>
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${exam.accent}`} />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">{exam.icon}</div>
                    <div className="flex flex-col items-end gap-1">
                      {done ? (
                        <Badge variant="secondary" data-testid={`dashboard-status-${exam.id}`}>Completed</Badge>
                      ) : win.status === "open" ? (
                        <Badge className="bg-brand-gradient text-white border-0" data-testid={`dashboard-status-${exam.id}`}>Open</Badge>
                      ) : win.status === "upcoming" ? (
                        <Badge variant="outline" data-testid={`dashboard-status-${exam.id}`}>Upcoming</Badge>
                      ) : win.status === "closed" ? (
                        <Badge variant="destructive" data-testid={`dashboard-status-${exam.id}`}>Closed</Badge>
                      ) : (
                        <Badge className="bg-brand-gradient text-white border-0" data-testid={`dashboard-status-${exam.id}`}>Available</Badge>
                      )}
                      {exam.schedule && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Round {exam.schedule.round}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="mt-3 text-lg">{exam.title}</CardTitle>
                  <CardDescription>{exam.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {exam.schedule && (
                    <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed" data-testid={`dashboard-schedule-${exam.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{exam.schedule.date}</span>
                        <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold text-white">
                          {exam.schedule.durationLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-muted-foreground">⏱ {exam.schedule.time}</div>
                      {!done && win.status !== "no-schedule" && (
                        <div className="mt-1 font-mono text-[10px] font-semibold text-brand-gradient" data-testid={`dashboard-countdown-${exam.id}`}>
                          {startBadgeText}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="mb-4 text-xs text-muted-foreground">
                    {exam.id === "dsa"
                      ? `${exam.questions.length} MCQs + 2 coding + 2 advanced coding · single ${exam.durationMin}-min exam · Proctored`
                      : `${exam.questions.length} questions · ${exam.durationMin} min · Proctored`}
                  </p>
                  {done ? (
                    <Button disabled className="w-full" variant="secondary" data-testid={`dashboard-done-${exam.id}`}>Already submitted</Button>
                  ) : blockedByWindow ? (
                    <Button
                      disabled
                      className="w-full"
                      variant="secondary"
                      data-testid={`dashboard-locked-${exam.id}`}
                      title={win.status === "upcoming" ? `Starts in ${formatCountdown(win.startsInMs)}` : "Exam window closed"}
                    >
                      {win.status === "upcoming" ? `Starts in ${formatCountdown(win.startsInMs)}` : "Window Closed"}
                    </Button>
                  ) : (
                    <Link to={target}>
                      <Button data-testid={`dashboard-start-${exam.id}`} className="w-full bg-brand-gradient border-0 text-white font-semibold transition-smooth hover:opacity-95">
                        Start →
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
