// DSA Test hub — shows the three sections (MCQs, Coding, Advanced Coding).
// Each section can be attempted only once; status badges reflect that.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getExam } from "@/lib/exams";
import { getAttempts } from "@/lib/exam-attempts";
import { getCodingQuestionsForExam } from "@/lib/coding-questions";
import { getCodingSubmissions } from "@/lib/coding-submissions";

interface Candidate { name?: string; email: string; loginAt: number }

interface SectionMeta {
  id: "mcq" | "standard" | "advanced";
  title: string;
  description: string;
  icon: string;
  accent: string;
  route: string;
  details: string;
  done: boolean;
  testid: string;
}

export default function DsaTest() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("xpay-candidate");
    if (!raw) { navigate("/login"); return; }
    setCandidate(JSON.parse(raw));
  }, [navigate]);

  // recompute status when window regains focus (after returning from a sub-section)
  useEffect(() => {
    const onFocus = () => setRefresh((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const sections: SectionMeta[] = useMemo(() => {
    if (!candidate) return [];
    void refresh; // re-evaluate on focus
    const mcqs = getExam("dsa");
    const standardQs = getCodingQuestionsForExam("dsa", "standard");
    const advancedQs = getCodingQuestionsForExam("dsa", "advanced");

    const attemptedMcq = getAttempts(candidate.email).some((a) => a.examId === "dsa");
    const codingSubs = getCodingSubmissions(candidate.email);
    const doneStandard = codingSubs.some((s) => s.examId === "dsa-standard");
    const doneAdvanced = codingSubs.some((s) => s.examId === "dsa-advanced");

    return [
      {
        id: "mcq",
        title: "Section 1 · MCQs",
        description: "10 multiple-choice questions on Data Structures & Algorithms.",
        details: `${mcqs?.questions.length ?? 0} questions · ${mcqs?.durationMin ?? 20} min · Proctored`,
        icon: "🧠",
        accent: "from-indigo-500 to-cyan-400",
        route: "/exam/dsa",
        done: attemptedMcq,
        testid: "dsa-section-mcq",
      },
      {
        id: "standard",
        title: "Section 2 · Coding",
        description: "2 standard coding problems — write & run code in the LeetCode-style editor.",
        details: `${standardQs.length} problems · 60 min · Proctored`,
        icon: "💻",
        accent: "from-sky-500 to-emerald-400",
        route: "/coding/dsa/standard",
        done: doneStandard,
        testid: "dsa-section-coding",
      },
      {
        id: "advanced",
        title: "Section 3 · Advanced Coding",
        description: "2 advanced coding problems — strict time & space complexity constraints.",
        details: `${advancedQs.length} problems · 60 min · Proctored`,
        icon: "⚡",
        accent: "from-fuchsia-500 to-orange-400",
        route: "/coding/dsa/advanced",
        done: doneAdvanced,
        testid: "dsa-section-advanced",
      },
    ];
  }, [candidate, refresh]);

  if (!candidate) return null;

  const completed = sections.filter((s) => s.done).length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 glass border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard"><Logo className="h-9" /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {candidate.name ? `${candidate.name} · ` : ""}{candidate.email}
            </span>
            <Link to="/dashboard">
              <Button variant="outline" size="sm" data-testid="dsa-back-to-dashboard">← Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10 overflow-hidden rounded-3xl bg-ink-gradient p-8 text-white shadow-brand sm:p-12 relative">
          <div className="relative z-10">
            <p className="text-sm uppercase tracking-widest text-white/70">DSA Test</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Three sections, <span className="text-brand-gradient">one assessment</span>
            </h1>
            <p className="mt-3 max-w-2xl text-white/80">
              Attempt the three sections in any order. Each section is proctored and can be
              taken <strong>only once</strong>. Make sure your camera &amp; microphone are
              working before you begin.
            </p>
            <p className="mt-4 text-sm text-white/70" data-testid="dsa-progress">
              Progress: <strong>{completed} / {sections.length}</strong> sections submitted
            </p>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand-gradient opacity-40 blur-3xl" />
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s, idx) => (
            <Card
              key={s.id}
              data-testid={s.testid}
              className={`relative overflow-hidden transition-smooth ${
                s.done ? "opacity-70" : "hover:shadow-brand hover:-translate-y-1"
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.accent}`} />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{s.icon}</div>
                  <div className="flex flex-col items-end gap-1">
                    {s.done
                      ? <Badge variant="secondary" data-testid={`${s.testid}-done`}>Submitted</Badge>
                      : <Badge className="bg-brand-gradient text-white border-0">Available</Badge>
                    }
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Section {idx + 1}
                    </span>
                  </div>
                </div>
                <CardTitle className="mt-3 text-lg">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-xs text-muted-foreground">{s.details}</p>
                {s.done ? (
                  <Button disabled className="w-full" variant="secondary" data-testid={`${s.testid}-disabled`}>
                    Already submitted
                  </Button>
                ) : (
                  <Link to={s.route}>
                    <Button
                      data-testid={`${s.testid}-start`}
                      className="w-full bg-brand-gradient border-0 text-white font-semibold transition-smooth hover:opacity-95"
                    >
                      Start Section →
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
