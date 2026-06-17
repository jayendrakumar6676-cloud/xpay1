# XPay Exam Portal — PRD

## Original Problem Statement
Import the GitHub project `https://github.com/jayendrakumar6676-cloud/mindmeld-proctor`
(XPay Exam Portal) completely, get it running, then iteratively add/update
exam content, login & dashboard UI, half-time submit constraints, and a
detailed invigilator review dashboard.

## Project Overview
A self-contained proctored exam application (originally designed for local
laptop use). Candidates log in with a username + access code, take MCQ exams
(Aptitude / DSA / Technical / Basic Understanding) or a Coding round with
proctoring violations tracking. Submissions are stored as JSON files on the
host. An invigilator dashboard at `/submissions` (PIN-gated) lists every
submission with a per-question breakdown.

## Tech Stack
- Frontend: Vite + React 18 + TypeScript + React Router + Tailwind v4 + shadcn/ui
- Backend: FastAPI (Python) on port 8001, supervisor-managed
- Storage: JSON files under `/app/submissions/<examId>/<email>__<ts>.json`
  (MongoDB not used — flat-file system intentionally preserved from upstream)

## Architecture
- Supervisor runs `backend` (uvicorn on :8001) and `frontend` (vite on :3000)
- `/app/frontend` is a symlink to `/app` so `yarn start` resolves to the
  project's root `package.json`
- Ingress routes `/api/*` → port 8001, everything else → port 3000
- `vite.config.ts`: port 3000, `host: true`, `allowedHosts: true`; the local
  dev proxy is gated behind `LOCAL_API_PROXY=1`

## API Endpoints (FastAPI / `/app/backend/server.py`)
- `GET  /api/health` → `{ ok: true, dir }`
- `POST /api/submit` → writes JSON file; returns `{ ok, file }`
- `GET  /api/submissions` → returns list (sorted by submittedAt desc)
- `GET  /api/submissions/{file_path}` → returns raw JSON for a file

## Key Frontend Routes
- `/login` — username + access code (≥4 chars), mock auth via sessionStorage
- `/dashboard` — personalized greeting + 5 exam tiles with schedule chips
- `/exam/:examId` — MCQ runner (aptitude / technical / system)
- `/coding/:examId` — Standard coding round runner
- `/dsa` — Unified DSA hybrid test (10 MCQs + 2 standard + 2 advanced coding)
- `/submissions` — Invigilator dashboard (PIN: `xpay-2026`)

## Exam Schedules (Rounds)
| Round | Exam      | Date         | Time                 | Duration       |
|-------|-----------|--------------|----------------------|----------------|
| 1     | Aptitude  | 18 Jun 2026  | 09:00 AM – 11:00 AM  | 2 Hours        |
| 2     | DSA       | 18 Jun 2026  | 02:00 PM – 05:00 PM  | 3 Hours        |
| 3     | Coding    | 18 Jun 2026  | 06:00 PM – 08:30 PM  | 2 Hours 30 Min |
| 4     | Technical | 19 Jun 2026  | 02:00 PM – 03:30 PM  | 1 Hour 30 Min  |
| 5     | System    | 19 Jun 2026  | 08:00 PM – 09:30 PM  | 1 Hour 30 Min  |

## Constraints / Proctoring
- Single window — leaving the page or violating proctoring rules counts
  violations (max 3 → auto-submit)
- Submit button is **locked until half of exam time has elapsed** for all
  exam types (aptitude, technical, system, dsa, coding)
- Camera + microphone permissions required before running phase
- Tab-switch / copy-paste / right-click are monitored
- Aptitude exam shows a floating Scientific Calculator (other exams do not)

## Invigilator Dashboard Features
- PIN gate (`xpay-2026`)
- Search/filter by candidate name / email / examId
- Per-submission detail view with:
  - MCQ breakdown — each question, all options with correct/given highlighted
  - Coding breakdown — language, code, per-test-case pass/fail results
  - Raw JSON viewer + download
  - Score chips (MCQ / coding / duration)

## Implementation Timeline

### Jun 16, 2026 — initial port
- Imported upstream repo, ported Express → FastAPI, supervisor wiring
- Verified login renders, `/api/health` reachable via ingress

### Jun 17, 2026 — content & UX overhaul
- Login UI simplified to Username + Access Code only
- Dashboard greeting: `Welcome, Mr. {username}`
- 5 exam tiles with schedule chips (date / time / duration)
- All 5 rounds updated with fresh question banks:
  - Aptitude: 85 questions across 4 sections + Scientific Calculator
  - DSA: 14-question hybrid (10 MCQs + 2 standard coding + 2 advanced coding)
  - Coding: dedicated coding round
  - Technical: 50 scenario-based MCQs
  - Basic Understanding: 40 questions (replaces "System Understanding")
- Half-time submit gate enforced on every exam runner
- Invigilator `/submissions`: restructured from JSON dump to a candidate
  breakdown UI (MCQ + coding sections, score chips, raw JSON, download)
- Custom XPay favicon

### Jun 17, 2026 — comprehensive QA pass
- `testing_agent_v3_fork` invoked for the first time on the codebase
- Backend pytest suite created at `/app/backend/tests/backend_test.py`
  (10/10 passing — covers health, submit, list, single-file fetch, traversal)
- Frontend issues found + fixed:
  - **Exam.tsx** — Submit-btn tooltip string normalized to
    "Submit unlocks at the half-time mark" (was a dynamic
    `Submit unlocks after Nm` string; now consistent with DsaTest/Coding)
  - **Submissions.tsx** — Coding section + MCQ section now render with an
    empty-state header even when the submission JSON lacks the per-question
    payload (previously the section silently disappeared)

### Jun 17, 2026 — credentials + schedule gate
- **Real credential allow-list** added in `/app/src/lib/credentials.ts`. Only
  the following candidates can sign in (anything else → "Invalid username
  or password."):
  - `himavanthkodi@gmail.com` / `20041007`
  - `h1` / `h2` (test)
- Login placeholders changed to "Enter your username" / "Enter your password"
- **Invigilator PIN rotated** to `xpay-admin-2026` (was `xpay-2026`)
- **Schedule gate** — every exam now has explicit `startAt`/`endAt`
  ISO timestamps (+05:30 IST). The dashboard tile shows live
  "Starts in Hh Mm Ss" / "Open · closes in …" / "Window Closed" chips, and
  the Start button is disabled outside the window. Direct URL navigation
  to `/exam/:id`, `/coding/:id`, `/dsa` is intercepted by a shared
  `ExamWindowGate` component that displays the same countdown.
- **Already-attempted gate** — the dashboard now shows a **Completed**
  badge + disabled "Already submitted" button on tiles the candidate has
  finished. (The existing `phase==="blocked"` screen in the runner pages
  already shows "Already Attempted" with a back-to-dashboard CTA.)

## Backlog / Next Action Items
- **P1** Migrate flat-file `/app/submissions/` storage to MongoDB using the
  platform's `PyObjectId` schema (durability + concurrency)
- **P1** Add real authentication (currently sessionStorage mock). Suggested:
  Emergent-managed Google Auth or JWT custom auth
- **P2** Refactor `/app/src/lib/exams.ts` — split per-exam question banks
  into separate modules (file is ~570 lines and growing)
- **P2** Extract the duplicated half-time gate logic from `Exam.tsx`,
  `DsaTest.tsx`, `Coding.tsx` into a `useHalfTimeGate(totalSec, timeLeft)` hook
- **P2** Add a Pydantic schema for `/api/submit` so malformed payloads are
  rejected early
- **P3** Dev-only `?stubMedia=1` URL flag to bypass `getUserMedia` so the
  running phase can be exercised by automated tests in headless Chromium

## Mocked / Intentional Gaps
- **Auth** — login is a mock gate; no backend verification
- **Database** — flat JSON files in `/app/submissions/` (no MongoDB by design)

## Test Credentials
See `/app/memory/test_credentials.md`
- Candidate: any username + ≥4-char access code
- Invigilator PIN: `xpay-2026`

## Preview URL
https://c8e03c25-228e-4ef7-a645-acd5febc2b61.preview.emergentagent.com
