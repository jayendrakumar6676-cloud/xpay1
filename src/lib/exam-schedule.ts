// Helpers for evaluating an exam's scheduled window against the wall clock.
//
// Each exam in `EXAMS` carries a `schedule` object with explicit
// `startAt` / `endAt` ISO-8601 timestamps (with a fixed +05:30 offset, IST).
// These helpers compute whether the exam window is currently
// "upcoming", "open" or "closed" and expose a human-readable countdown
// string for "upcoming" states.

import type { ExamCategory } from "@/lib/exams";

export type ExamWindowStatus = "upcoming" | "open" | "closed" | "no-schedule";

export interface ExamWindow {
  status: ExamWindowStatus;
  /** ms until startAt. Negative when the window has already opened. */
  startsInMs: number;
  /** ms until endAt. Negative when the window has already closed. */
  endsInMs: number;
  /** ISO startAt (parsed). undefined when the exam has no schedule. */
  startAt?: Date;
  endAt?: Date;
}

export function getExamWindow(exam: ExamCategory, now: number = Date.now()): ExamWindow {
  if (!exam.schedule?.startAt || !exam.schedule?.endAt) {
    return { status: "no-schedule", startsInMs: 0, endsInMs: 0 };
  }
  const startAt = new Date(exam.schedule.startAt);
  const endAt = new Date(exam.schedule.endAt);
  const startsInMs = startAt.getTime() - now;
  const endsInMs = endAt.getTime() - now;
  let status: ExamWindowStatus;
  if (startsInMs > 0) status = "upcoming";
  else if (endsInMs > 0) status = "open";
  else status = "closed";
  return { status, startsInMs, endsInMs, startAt, endAt };
}

/**
 * Convert a positive millisecond duration into a short
 * "Nd Hh Mm Ss" / "Hh Mm Ss" / "Mm Ss" / "Ss" countdown string.
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
