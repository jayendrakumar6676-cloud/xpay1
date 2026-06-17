import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateCredentials } from "@/lib/credentials";

/**
 * Candidate login — validates against an allow-list of (username, password)
 * pairs declared in `@/lib/credentials`. Invalid combinations are rejected
 * with a single generic error message.
 */
function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const matched = validateCredentials(username, password);
    if (!matched) {
      setErr("Invalid username or password.");
      return;
    }
    const id = slugify(matched.username) || matched.username;
    sessionStorage.setItem(
      "xpay-candidate",
      JSON.stringify({
        username: matched.displayName,
        // backwards-compat fields (other pages still read these)
        name: matched.displayName,
        email: matched.username.includes("@") ? matched.username : `${id}@xpay.local`,
        loginAt: Date.now(),
      })
    );
    navigate("/dashboard");
  };

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
              Sign in to start your secure assessment.
            </p>
          </div>

          <form onSubmit={onSubmit} className="glass rounded-2xl p-8 shadow-brand">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  data-testid="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-testid="login-access-code"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>

              {err && <p data-testid="login-error" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

              <Button
                type="submit"
                data-testid="login-submit"
                className="h-11 w-full bg-brand-gradient text-white font-semibold transition-smooth hover:opacity-95 hover:shadow-brand border-0"
              >
                Sign in & Continue
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By signing in you agree to the exam integrity policy.
              </p>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Invigilator? <Link to="/submissions" className="font-medium text-foreground underline-offset-4 hover:underline">Open dashboard</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
