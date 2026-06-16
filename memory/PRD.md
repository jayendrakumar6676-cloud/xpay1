# XPay Exam Portal — PRD

## Original Problem Statement
Import the GitHub project `https://github.com/jayendrakumar6676-cloud/mindmeld-proctor`
(XPay Exam Portal) completely and get it running. Further changes will be
provided by the user later.

## Project Overview
A self-contained proctored exam application (originally designed for local laptop
use). Students log in, take MCQ exams (Aptitude / DSA / System / Technical) or
Coding rounds with proctoring violations tracking. Submissions are stored as
JSON files on the host. An invigilator dashboard at `/submissions` (PIN-gated)
lists all submissions.

## Tech Stack
- Frontend: Vite + React 18 + TypeScript + React Router + Tailwind v4 + shadcn/ui
- Backend: FastAPI (Python) — replaces the original Express server to fit the
  Emergent supervisor layout (port 8001). Filesystem-only persistence
  (no MongoDB usage).
- Storage: JSON files under `/app/submissions/<examId>/<email>__<ts>.json`

## Architecture in this environment
- Supervisor runs `backend` (uvicorn on :8001) and `frontend` (yarn start = `vite --host 0.0.0.0 --port 3000`).
- `/app/frontend` is a symlink to `/app` so `yarn start` resolves to the project's `package.json`.
- `/app/backend/server.py` (FastAPI) re-implements the original Express endpoints:
  - GET  `/api/health`
  - POST `/api/submit`
  - GET  `/api/submissions`
  - GET  `/api/submissions/{file_path}`
- Ingress routes `/api/*` → port 8001, everything else → port 3000.
- `vite.config.ts` updated: port 3000, `host: true`, `allowedHosts: true`;
  proxy retained behind `LOCAL_API_PROXY=1` env flag for local laptop dev.

## Key Routes (frontend)
- `/login` — student / invigilator entry
- `/dashboard` — exam list
- `/exam/:examId`, `/coding/:examId`, `/screen/:examId`
- `/submissions` — invigilator dashboard (PIN: `xpay-2026`)

## What's been implemented (Jun 16, 2026)
- Imported the upstream GitHub repository into `/app` (already present as git remote `origin`).
- Created FastAPI backend mirroring the Express endpoints (filesystem storage).
- Wired the Vite frontend to run via supervisor on port 3000 with host check disabled.
- Installed Node + Python dependencies.
- Verified login page renders and `/api/health` is reachable through ingress.

## Backlog / Next Action Items
- Awaiting user-requested changes to the imported project.
- Optional: convert filesystem persistence to MongoDB if user wants cross-pod
  durability in the Emergent preview environment.
- Optional: SMTP-based candidate notifications (env vars exist in `.env.example`).

## Notes
- The original Express server (`server/index.js`) is preserved but unused in the
  preview environment.
- `scripts/dev.js` / `scripts/start.js` are also preserved for local Windows use.
- Production preview URL: https://c8e03c25-228e-4ef7-a645-acd5febc2b61.preview.emergentagent.com
