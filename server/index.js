// Tiny local Express server.
// - POST /api/send-otp      → generates OTP and sends it to Gmail
// - POST /api/verify-otp   → verifies OTP (valid for 5 minutes)
// - POST /api/submit       → writes each submission to ./submissions/<examId>/<email>__<timestamp>.json
// - GET  /api/submissions  → lists all saved submissions (for the invigilator dashboard)
// - GET  /api/submissions/:file → returns the full JSON of one submission
//
// All data lives on YOUR laptop, inside the ./submissions folder.
// Stop with Ctrl+C.
//
// SETUP: Create a .env file or set these environment variables:
//   SMTP_USER=your-gmail@gmail.com
//   SMTP_PASS=your-gmail-app-password   (Google App Password, NOT your account password)
//
// To get a Gmail App Password:
//   1. Go to https://myaccount.google.com/security
//   2. Enable 2-Step Verification
//   3. Search for "App passwords" → Create one → copy the 16-char password

import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransport } from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SUBMISSIONS_DIR = path.join(ROOT, "submissions");

if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const safe = (s) => String(s ?? "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "unknown";

/* ──────────────────────────────────────────
   OTP store: { email -> { otp, expiresAt } }
────────────────────────────────────────── */
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Configure Nodemailer with Gmail SMTP
function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS environment variables are not set. See server/index.js comments for setup instructions.");
  }
  return createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/* POST /api/send-otp */
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email, name } = req.body || {};
    if (!email || !email.includes("@gmail.com")) {
      return res.status(400).json({ ok: false, error: "A valid Gmail address is required." });
    }

    const otp = generateOtp();
    otpStore.set(email.toLowerCase().trim(), { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });

    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"XPay Exam Portal" <${process.env.SMTP_USER}>`,
      to: email.trim(),
      subject: "Your XPay Exam OTP",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#6366f1;margin-bottom:8px">XPay Exam Portal</h2>
          <p>Hi <strong>${name || "Candidate"}</strong>,</p>
          <p>Your One-Time Password (OTP) to access the exam is:</p>
          <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#111;text-align:center;padding:24px 0">${otp}</div>
          <p style="color:#6b7280;font-size:13px">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
          <p style="color:#9ca3af;font-size:11px">If you did not request this OTP, please ignore this email.</p>
        </div>
      `,
    });

    console.log(`✓ OTP sent to ${email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to send OTP:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* POST /api/verify-otp */
app.post("/api/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ ok: false, error: "Email and OTP are required." });

    const key = email.toLowerCase().trim();
    const record = otpStore.get(key);

    if (!record) return res.status(400).json({ ok: false, error: "No OTP requested for this email. Please go back and request again." });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ ok: false, error: "OTP has expired. Please go back and request a new one." });
    }
    if (record.otp !== otp.trim()) {
      return res.status(400).json({ ok: false, error: "Incorrect OTP. Please try again." });
    }

    otpStore.delete(key); // one-time use
    console.log(`✓ OTP verified for ${email}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ──────────────────────────────────────────
   Existing submission endpoints
────────────────────────────────────────── */

app.get("/api/health", (_req, res) => res.json({ ok: true, dir: SUBMISSIONS_DIR }));

app.post("/api/submit", (req, res) => {
  try {
    const body = req.body || {};
    const examId = safe(body.examId);
    const email = safe(body.candidateEmail);
    const ts = new Date(body.submittedAt || Date.now()).toISOString().replace(/[:.]/g, "-");
    const dir = path.join(SUBMISSIONS_DIR, examId);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${email}__${ts}.json`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf8");
    console.log(`✓ Saved submission: submissions/${examId}/${fileName}`);
    res.json({ ok: true, file: path.join(examId, fileName) });
  } catch (err) {
    console.error("Failed to save submission:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/submissions", (_req, res) => {
  try {
    const out = [];
    if (!fs.existsSync(SUBMISSIONS_DIR)) return res.json(out);
    for (const examId of fs.readdirSync(SUBMISSIONS_DIR)) {
      const dir = path.join(SUBMISSIONS_DIR, examId);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
          out.push({
            file: path.join(examId, f),
            kind: data.kind,
            examId: data.examId,
            candidateEmail: data.candidateEmail,
            candidateName: data.candidateName,
            submittedAt: data.submittedAt,
            totalMarks: data.totalMarks,
            totalPossible: data.totalPossible,
            score: data.score,
            total: data.total,
            violations: data.violations ?? 0,
          });
        } catch (e) {
          console.warn("Skipping unreadable file", f, e.message);
        }
      }
    }
    out.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/submissions/:file(*)", (req, res) => {
  try {
    const rel = req.params.file.replace(/\\/g, "/");
    if (rel.includes("..")) return res.status(400).json({ error: "Bad path" });
    const filePath = path.join(SUBMISSIONS_DIR, rel);
    if (!filePath.startsWith(SUBMISSIONS_DIR)) return res.status(400).json({ error: "Bad path" });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
    res.type("application/json").send(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`\n  🔵  XPay submissions API: http://localhost:${PORT}`);
  console.log(`  📁  Saving submissions to: ${SUBMISSIONS_DIR}\n`);
});
