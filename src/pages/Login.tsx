import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, ShieldCheck, Loader2, Terminal } from "lucide-react";

type Step = "form" | "otp";

export default function LoginPage() {
  const navigate = useNavigate();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp]           = useState("");
  const [devOtp, setDevOtp]     = useState(""); // shown on screen when no SMTP

  const [step, setStep]       = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [mode, setMode]       = useState<"email" | "terminal" | "">("")

  /* ── Step 1: validate & request OTP ── */
  const onRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name.trim())                    { setErr("Please enter your full name."); return; }
    if (!email.trim() || !email.includes("@")) { setErr("Please enter a valid email address."); return; }
    if (password.length < 4)             { setErr("Access code must be at least 4 characters."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to send OTP");
      setMode(data.mode);
      if (data.devOtp) setDevOtp(data.devOtp); // terminal mode
      setStep("otp");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: verify OTP ── */
  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (otp.length !== 6) { setErr("Enter the complete 6-digit OTP."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/verify-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Invalid or expired OTP");

      sessionStorage.setItem(
        "xpay-candidate",
        JSON.stringify({ name: name.trim(), email: email.trim(), loginAt: Date.now() })
      );
      navigate("/dashboard");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => { setStep("form"); setOtp(""); setErr(""); setDevOtp(""); setMode(""); };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-gradient opacity-30 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand-gradient opacity-25 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 grid min-h-screen place-items-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo className="h-14" />
            <h1 className="mt-6 text-3xl font-bold tracking-tight">
              <span className="text-brand-gradient">Exam Portal</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === "form" ? "Sign in to start your secure assessment." : "Verify your identity to continue."}
            </p>
          </div>

          {/* ── STEP 1: Login Form ── */}
          {step === "form" && (
            <form onSubmit={onRequestOtp} className="glass rounded-2xl p-8 shadow-brand">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Access Code</Label>
                  <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                </div>

                {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

                <Button type="submit" disabled={loading} className="h-11 w-full bg-brand-gradient text-white font-semibold transition-smooth hover:opacity-95 hover:shadow-brand border-0">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  {loading ? "Sending OTP…" : "Send OTP & Continue"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  By signing in you agree to the exam integrity policy.
                </p>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === "otp" && (
            <form onSubmit={onVerifyOtp} className="glass rounded-2xl p-8 shadow-brand">
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient/20">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-sm font-medium">OTP Generated!</p>
                  <p className="text-xs text-muted-foreground">
                    {mode === "email"
                      ? `A 6-digit OTP has been sent to ${email}. Check your inbox.`
                      : `No email configured. Check the terminal/server window for your OTP.`}
                  </p>
                </div>

                {/* Terminal mode: show OTP directly on screen */}
                {mode === "terminal" && devOtp && (
                  <div className="rounded-xl border border-yellow-400/40 bg-yellow-50/10 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Terminal className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-600">Dev Mode — OTP visible (no email setup)</span>
                    </div>
                    <p className="text-3xl font-bold tracking-[0.4em] text-yellow-600">{devOtp}</p>
                    <p className="text-xs text-muted-foreground mt-1">Enter this OTP below to continue</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="block text-center">Enter 6-digit OTP</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive text-center">{err}</p>}

                <Button type="submit" disabled={loading || otp.length !== 6} className="h-11 w-full bg-brand-gradient text-white font-semibold transition-smooth hover:opacity-95 hover:shadow-brand border-0">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {loading ? "Verifying…" : "Verify & Enter Exam"}
                </Button>

                <button type="button" onClick={goBack} className="w-full text-center text-xs text-muted-foreground hover:underline">
                  ← Back to login
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Invigilator? <Link to="/submissions" className="font-medium text-foreground underline-offset-4 hover:underline">Open dashboard</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
