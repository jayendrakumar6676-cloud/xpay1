// Shown when a candidate tries to enter an exam page outside its
// scheduled window (either before it opens, or after it has closed).
// Displays a live countdown to the start of the next window.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ExamCategory } from "@/lib/exams";
import { getExamWindow, formatCountdown } from "@/lib/exam-schedule";

interface Props {
  exam: ExamCategory;
}

export default function ExamWindowGate({ exam }: Props) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const win = getExamWindow(exam, now);
  const isClosed = win.status === "closed";
  const isUpcoming = win.status === "upcoming";

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="max-w-md w-full glass shadow-brand">
        <CardContent className="p-8 text-center">
          <Logo className="mx-auto h-12" />
          <h1 className="mt-6 text-2xl font-bold text-brand-gradient" data-testid="exam-window-title">
            {isClosed ? "Exam Window Closed" : "Exam Has Not Started"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            <strong>{exam.title}</strong>
            {exam.schedule && (
              <>
                <br />
                Scheduled: <strong>{exam.schedule.date}</strong>, {exam.schedule.time}
              </>
            )}
          </p>

          {isUpcoming && (
            <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-5">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Time remaining to start
              </div>
              <div
                className="mt-2 font-mono text-2xl font-bold text-brand-gradient"
                data-testid="exam-window-countdown"
              >
                {formatCountdown(win.startsInMs)}
              </div>
            </div>
          )}

          {isClosed && (
            <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-5 text-sm text-destructive">
              This exam's scheduled window has already closed. Please contact
              the invigilator if you missed it.
            </div>
          )}

          <Link to="/dashboard">
            <Button
              data-testid="exam-window-back-btn"
              className="mt-6 w-full bg-brand-gradient border-0 text-white font-semibold"
            >
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
