"""
XPay Exam Portal - FastAPI backend.

Replicates the original Express server (server/index.js) endpoints:
  - GET  /api/health
  - POST /api/submit
  - GET  /api/submissions
  - GET  /api/submissions/{file_path}  (file path may contain '/')

Submissions are written as JSON files under /app/submissions/<examId>/<email>__<ts>.json
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

ROOT = Path(__file__).resolve().parent.parent  # /app
SUBMISSIONS_DIR = ROOT / "submissions"
SUBMISSIONS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="XPay Exam Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_SAFE_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def safe_name(value: Any) -> str:
    s = _SAFE_RE.sub("_", str(value or ""))[:80]
    return s or "unknown"


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "dir": str(SUBMISSIONS_DIR)}


@app.post("/api/submit")
async def submit(request: Request) -> dict:
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    exam_id = safe_name(body.get("examId"))
    email = safe_name(body.get("candidateEmail"))

    submitted_at_raw = body.get("submittedAt")
    if isinstance(submitted_at_raw, (int, float)):
        dt = datetime.fromtimestamp(submitted_at_raw / 1000.0, tz=timezone.utc)
    else:
        dt = datetime.now(tz=timezone.utc)
    ts = dt.isoformat().replace(":", "-").replace(".", "-")

    target_dir = SUBMISSIONS_DIR / exam_id
    target_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{email}__{ts}.json"
    file_path = target_dir / file_name

    try:
        file_path.write_text(json.dumps(body, indent=2, default=str), encoding="utf-8")
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

    print(f"\u2713 Saved submission: submissions/{exam_id}/{file_name}", flush=True)
    return {"ok": True, "file": f"{exam_id}/{file_name}"}


@app.get("/api/submissions")
async def list_submissions() -> list[dict]:
    out: list[dict] = []
    if not SUBMISSIONS_DIR.exists():
        return out
    for exam_dir in sorted(SUBMISSIONS_DIR.iterdir()):
        if not exam_dir.is_dir():
            continue
        for f in sorted(exam_dir.iterdir()):
            if not f.name.endswith(".json"):
                continue
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except Exception as e:
                print(f"Skipping unreadable file {f.name}: {e}", flush=True)
                continue
            out.append(
                {
                    "file": f"{exam_dir.name}/{f.name}",
                    "kind": data.get("kind"),
                    "examId": data.get("examId"),
                    "candidateEmail": data.get("candidateEmail"),
                    "candidateName": data.get("candidateName"),
                    "submittedAt": data.get("submittedAt"),
                    "totalMarks": data.get("totalMarks"),
                    "totalPossible": data.get("totalPossible"),
                    "score": data.get("score"),
                    "total": data.get("total"),
                    "violations": data.get("violations", 0),
                }
            )
    out.sort(key=lambda x: x.get("submittedAt") or 0, reverse=True)
    return out


@app.get("/api/submissions/{file_path:path}")
async def get_submission(file_path: str):
    rel = file_path.replace("\\", "/")
    if ".." in rel:
        raise HTTPException(status_code=400, detail="Bad path")
    target = (SUBMISSIONS_DIR / rel).resolve()
    try:
        target.relative_to(SUBMISSIONS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Bad path")
    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return PlainTextResponse(target.read_text(encoding="utf-8"), media_type="application/json")
