// Tiny local Express server.
// - POST /api/send-otp      → generates OTP, sends via Gmail if configured, else prints to terminal
// - POST /api/verify-otp   → verifies OTP (valid for 10 minutes)
// - POST /api/submit       → writes each submission to ./submissions/<examId>/<email>__<timestamp>.json
// - GET  /api/submissions  → lists all saved submissions (for the invigilator dashboard)
// - GET  /api/submissions/:file → returns the full JSON of one submission
//
// OPTIONAL Gmail setup (only needed if you want real email delivery):
//   Create a file called ".env" in the project root with:
//     SMTP_USER=your-gmail@gmail.com
//     SMTP_PASS=your-16-char-app-password
//
//   To get Gmail App Password:
//     1. Go to https://myaccount.google.com/security
//     2. Enable 2-Step Verification
//     3. Search "App passwords" → Create one → copy 16-char password
//
// WITHOUT Gmail setup: OTP is printed in this terminal window.
// The invigilator reads it from terminal and tells the student.

import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SUBMISSIONS_DIR = path.join(ROOT, "submissions");

// Load .env file manually if it exists (no dotenv dependency needed)
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
  console.log("  ✅  Loaded .env file");
}

if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const safe = (s) => String(s ?? "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "unknown";

/* ─────────────────────────────────────────
   OTP store: { email -> { otp, expiresAt } }
───────────────────────────────────────── */
const otpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email, name, otp) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    // No SMTP configured — print OTP to terminal
    console.log("\n" + "═".repeat(50));
    console.log("  📧  OTP FOR: " + email);
    console.log("  👤  NAME:    " + name);
    console.log("  🔑  OTP:     " + otp);
    console.log("  ⏱️   EXPIRES: 10 minutes");
    console.log("═".repeat(50) + "\n");
    return { mode: "terminal" };
  }

  // Gmail SMTP configured — send real email
  const { createTransport } = await import("nodemailer");
  const transporter = createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"XPay Exam Portal" <${user}>`,
    to: email.trim(),
    subject: "Your XPay Exam OTP - " + otp,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#6366f1;margin-bottom:8px">XPay Exam Portal</h2>
        <p>Hi <strong>${name || "Candidate"}</strong>,</p>
        <p>Your One-Time Password (OTP) to access the exam is:</p>
        <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#111;text-align:center;padding:24px 0">${otp}</div>
        <p style="color:#6b7280;font-size:13px">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
        <p style="color:#9ca3af;font-size:11px">If you did not request this OTP, please ignore this email.</p>
      </div>
    `,
  });
  return { mode: "email" };
}

/* POST /api/send-otp */
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email, name } = req.body || {};
    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "A valid email address is required." });
    }

    const otp = generateOtp();
    const key = email.toLowerCase().trim();
    otpStore.set(key, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });

    const result = await sendOtpEmail(email.trim(), name || "Candidate", otp);

    console.log(`✓ OTP generated for ${email} [mode: ${result.mode}]`);

    res.json({
      ok: true,
      mode: result.mode,
      // In terminal mode, send OTP back so the UI can show it (dev/local only)
      ...(result.mode === "terminal" ? { devOtp: otp } : {}),
    });
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

    if (!record) return res.status(400).json({ ok: false, error: "No OTP found for this email. Please go back and request again." });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ ok: false, error: "OTP has expired. Please go back and request a new one." });
    }
    if (record.otp !== otp.trim()) {
      return res.status(400).json({ ok: false, error: "Incorrect OTP. Please try again." });
    }

    otpStore.delete(key);
    console.log(`✓ OTP verified for ${email}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ─────────────────────────────────────────
   Existing submission endpoints
───────────────────────────────────────── */

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
  const smtpReady = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  console.log(`\n  🔵  XPay submissions API: http://localhost:${PORT}`);
  console.log(`  📁  Saving submissions to: ${SUBMISSIONS_DIR}`);
  console.log(`  📧  Email mode: ${smtpReady ? "✅ Gmail SMTP (real emails)" : "🖥️  Terminal (OTP shown here)"}\n`);
});
