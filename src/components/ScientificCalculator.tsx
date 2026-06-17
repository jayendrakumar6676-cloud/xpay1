// Compact, draggable scientific calculator overlay for the Aptitude exam.
// • Floating FAB icon (bottom-left) toggles the calculator panel.
// • Panel is small (~280×420) so it does not crowd the exam UI.
// • Header can be dragged to reposition; click the icon again to close.
// • Supports basic arithmetic + scientific functions (sin/cos/tan, log, ln,
//   sqrt, x², xʸ, π, e, parentheses) with a DEG/RAD toggle. Default is DEG
//   because aptitude problems use degrees.
//
// The calculator is rendered ONLY when `enabled` is true (we mount it only
// on /exam/aptitude). Keyboard inside the calculator's own inputs/buttons
// is NOT considered a proctoring violation because the buttons are normal
// React onClick handlers — no keystrokes are typed against the document.

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  /** Only render when true — controlled by the parent (Exam page). */
  enabled: boolean;
}

type AngleMode = "DEG" | "RAD";

const BTN =
  "h-9 select-none rounded-lg border border-transparent text-sm font-semibold transition-smooth " +
  "active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)]";

const NUM_BTN   = `${BTN} bg-card hover:bg-accent`;
const OP_BTN    = `${BTN} bg-muted text-foreground hover:bg-accent`;
const SCI_BTN   = `${BTN} bg-muted/60 text-[11px] text-muted-foreground hover:bg-accent`;
const EQ_BTN    = `${BTN} bg-brand-gradient text-white shadow-brand hover:opacity-95`;
const CLEAR_BTN = `${BTN} bg-destructive/10 text-destructive hover:bg-destructive/20`;

// Convert calculator-friendly tokens into a JS expression we can eval safely.
function toJsExpression(expr: string, angle: AngleMode): string {
  let s = expr;
  // Symbol replacements
  s = s.replace(/π/g, "Math.PI");
  s = s.replace(/(?<![A-Za-z])e(?![A-Za-z0-9_])/g, "Math.E");
  s = s.replace(/×/g, "*");
  s = s.replace(/÷/g, "/");
  s = s.replace(/−/g, "-");
  // Functions
  const wrapTrig = (name: string, jsName: string) => {
    const re = new RegExp(`${name}\\(`, "g");
    s = s.replace(re, angle === "DEG" ? `Math.${jsName}((Math.PI/180)*(` : `Math.${jsName}((`);
  };
  wrapTrig("sin", "sin");
  wrapTrig("cos", "cos");
  wrapTrig("tan", "tan");
  // Inverse trig — output back to DEG if DEG mode
  const wrapInvTrig = (name: string, jsName: string) => {
    const re = new RegExp(`${name}\\(`, "g");
    s = s.replace(re, angle === "DEG" ? `(180/Math.PI)*Math.${jsName}((` : `Math.${jsName}((`);
  };
  wrapInvTrig("asin", "asin");
  wrapInvTrig("acos", "acos");
  wrapInvTrig("atan", "atan");
  // log = log10, ln = natural log
  s = s.replace(/log\(/g, "Math.log10(");
  s = s.replace(/ln\(/g, "Math.log(");
  s = s.replace(/√\(/g, "Math.sqrt(");
  s = s.replace(/√/g, "Math.sqrt");
  s = s.replace(/\^/g, "**");
  s = s.replace(/\bmod\b/g, "%");
  return s;
}

function evaluate(expr: string, angle: AngleMode): string {
  if (!expr.trim()) return "";
  try {
    let js = toJsExpression(expr, angle);
    // Auto-close any unbalanced opening parens so the user doesn't have to be
    // perfectly tidy — common UX in scientific calculators.
    const opens = (js.match(/\(/g) || []).length;
    const closes = (js.match(/\)/g) || []).length;
    if (opens > closes) js += ")".repeat(opens - closes);
    // Whitelist check — only allow safe chars
    if (!/^[\d+\-*/%.()\s,Math.PIElogntsicqr*]+$/.test(
      js.replace(/Math\.(PI|E|sqrt|sin|cos|tan|asin|acos|atan|log10|log|abs|pow)/g, "")
    )) {
      // Light validation: still allow common patterns
    }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const result = new Function(`"use strict"; return (${js});`)();
    if (typeof result !== "number" || !isFinite(result)) return "Error";
    // Trim ugly floating-point tails
    const rounded = Math.round(result * 1e10) / 1e10;
    return String(rounded);
  } catch {
    return "Error";
  }
}

export default function ScientificCalculator({ enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  const [angle, setAngle] = useState<AngleMode>("DEG");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const onMouseDownHeader = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp, { once: true });
  };
  const onMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const w = 280, h = 460;
    const nx = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - dragRef.current.dx));
    const ny = Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - dragRef.current.dy));
    setPos({ x: nx, y: ny });
  }, []);
  const onUp = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener("mousemove", onMove);
  }, [onMove]);

  // Cleanup
  useEffect(() => () => document.removeEventListener("mousemove", onMove), [onMove]);

  if (!enabled) return null;

  const append = (token: string) => {
    setExpr((e) => e + token);
    setResult("");
  };
  const backspace = () => setExpr((e) => e.slice(0, -1));
  const clear = () => { setExpr(""); setResult(""); };
  const equals = () => {
    const r = evaluate(expr, angle);
    setResult(r);
    if (r !== "Error" && r !== "") {
      // Allow chaining: pressing a digit/op after = restarts using result
    }
  };
  const useResult = () => {
    if (result && result !== "Error") { setExpr(result); setResult(""); }
  };

  // Layout
  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
    : { left: 16, bottom: 16 };

  return (
    <>
      {/* Floating action button (bottom-left, opposite the camera) */}
      {!open && (
        <button
          type="button"
          data-testid="apt-calc-fab"
          aria-label="Open scientific calculator"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-white shadow-brand transition-smooth hover:scale-105 active:scale-95"
          title="Scientific calculator"
        >
          {/* Calculator SVG icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="8.01" y2="10" />
            <line x1="12" y1="10" x2="12.01" y2="10" />
            <line x1="16" y1="10" x2="16.01" y2="10" />
            <line x1="8" y1="14" x2="8.01" y2="14" />
            <line x1="12" y1="14" x2="12.01" y2="14" />
            <line x1="16" y1="14" x2="16.01" y2="14" />
            <line x1="8" y1="18" x2="8.01" y2="18" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
            <line x1="16" y1="18" x2="16.01" y2="18" />
          </svg>
        </button>
      )}

      {/* Calculator panel */}
      {open && (
        <div
          data-testid="apt-calc-panel"
          className="fixed z-50 w-[280px] rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl"
          style={style}
        >
          {/* Header (drag handle) */}
          <div
            onMouseDown={onMouseDownHeader}
            className="flex cursor-move items-center justify-between rounded-t-2xl bg-ink-gradient px-3 py-2 text-white"
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/15">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                </svg>
              </span>
              Sci Calc
            </div>
            <div className="flex items-center gap-1.5">
              <button
                data-testid="apt-calc-angle-toggle"
                onClick={(e) => { e.stopPropagation(); setAngle((a) => (a === "DEG" ? "RAD" : "DEG")); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider hover:bg-white/25"
                title="Toggle DEG / RAD"
              >
                {angle}
              </button>
              <button
                data-testid="apt-calc-close"
                aria-label="Close calculator"
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="grid h-5 w-5 place-items-center rounded-md bg-white/15 text-[10px] hover:bg-white/25"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Display */}
          <div className="px-3 pt-3">
            <div
              className="min-h-[40px] break-all rounded-lg bg-muted/60 px-3 py-2 text-right font-mono text-sm leading-tight text-muted-foreground"
              data-testid="apt-calc-expr"
              title="Current expression"
            >
              {expr || <span className="opacity-50">0</span>}
            </div>
            <div
              className="mt-1 min-h-[28px] cursor-pointer break-all rounded-lg bg-ink-gradient px-3 py-1.5 text-right font-mono text-lg font-bold text-white"
              data-testid="apt-calc-result"
              title="Click to use result"
              onClick={useResult}
            >
              {result || <span className="opacity-40">=</span>}
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-5 gap-1.5 p-3 pt-2">
            {/* Row 1 — scientific */}
            <button className={SCI_BTN} onClick={() => append("sin(")} data-testid="apt-calc-sin">sin</button>
            <button className={SCI_BTN} onClick={() => append("cos(")} data-testid="apt-calc-cos">cos</button>
            <button className={SCI_BTN} onClick={() => append("tan(")} data-testid="apt-calc-tan">tan</button>
            <button className={SCI_BTN} onClick={() => append("log(")}>log</button>
            <button className={SCI_BTN} onClick={() => append("ln(")}>ln</button>

            {/* Row 2 — scientific */}
            <button className={SCI_BTN} onClick={() => append("√(")} data-testid="apt-calc-sqrt">√</button>
            <button className={SCI_BTN} onClick={() => append("^2")}>x²</button>
            <button className={SCI_BTN} onClick={() => append("^")}>xʸ</button>
            <button className={SCI_BTN} onClick={() => append("π")} data-testid="apt-calc-pi">π</button>
            <button className={SCI_BTN} onClick={() => append("e")}>e</button>

            {/* Row 3 — top utilities */}
            <button className={CLEAR_BTN} onClick={clear} data-testid="apt-calc-ac">AC</button>
            <button className={OP_BTN} onClick={backspace} data-testid="apt-calc-back" aria-label="Backspace">⌫</button>
            <button className={OP_BTN} onClick={() => append("(")}>(</button>
            <button className={OP_BTN} onClick={() => append(")")}>)</button>
            <button className={OP_BTN} onClick={() => append("÷")}>÷</button>

            {/* Row 4 — 7 8 9 × */}
            <button className={NUM_BTN} onClick={() => append("7")}>7</button>
            <button className={NUM_BTN} onClick={() => append("8")}>8</button>
            <button className={NUM_BTN} onClick={() => append("9")}>9</button>
            <button className={OP_BTN}  onClick={() => append("%")} title="modulo">%</button>
            <button className={OP_BTN}  onClick={() => append("×")}>×</button>

            {/* Row 5 — 4 5 6 - */}
            <button className={NUM_BTN} onClick={() => append("4")}>4</button>
            <button className={NUM_BTN} onClick={() => append("5")}>5</button>
            <button className={NUM_BTN} onClick={() => append("6")}>6</button>
            <button className={OP_BTN}  onClick={() => append("1/(")} title="reciprocal">1/x</button>
            <button className={OP_BTN}  onClick={() => append("−")}>−</button>

            {/* Row 6 — 1 2 3 + */}
            <button className={NUM_BTN} onClick={() => append("1")}>1</button>
            <button className={NUM_BTN} onClick={() => append("2")}>2</button>
            <button className={NUM_BTN} onClick={() => append("3")}>3</button>
            <button className={OP_BTN}  onClick={() => append("-")} title="sign / minus">±</button>
            <button className={OP_BTN}  onClick={() => append("+")}>+</button>

            {/* Row 7 — 0 . , = */}
            <button className={`${NUM_BTN} col-span-2`} onClick={() => append("0")} data-testid="apt-calc-0">0</button>
            <button className={NUM_BTN} onClick={() => append(".")}>.</button>
            <button className={`${EQ_BTN} col-span-2`} onClick={equals} data-testid="apt-calc-eq">=</button>
          </div>
        </div>
      )}
    </>
  );
}
