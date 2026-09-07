"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const WORD = "Onomic";
const RESTING_LENGTH = 2; // "On" — the resting state of the wordmark

const HOLD_SHORT_MS = 700;
const TYPE_STEP_MS = 140;
const HOLD_FULL_MS = 900;
const ERASE_STEP_MS = 110;

type Phase = "hold-short" | "typing" | "hold-full" | "erasing";

/**
 * Full word "Onomic" types itself out letter by letter, holds, then erases
 * back down to "On", holds, and repeats — a page-loading treatment built
 * from the wordmark itself. Renders a static "Onomic" under
 * prefers-reduced-motion.
 */
function OnomicTypingLoader({ className, label = "A carregar" }: { className?: string; label?: string }) {
  const [length, setLength] = useState(RESTING_LENGTH);
  const [phase, setPhase] = useState<Phase>("hold-short");
  // Starts false on both server and first client render (avoids a hydration
  // mismatch), then syncs to the real value right after mount.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from a browser API on mount, not a state ping-pong
    setReducedMotion(query.matches);
    const listener = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let delay = HOLD_SHORT_MS;
    if (phase === "typing") delay = TYPE_STEP_MS;
    if (phase === "hold-full") delay = HOLD_FULL_MS;
    if (phase === "erasing") delay = ERASE_STEP_MS;

    const timeout = setTimeout(() => {
      if (phase === "hold-short") {
        setPhase("typing");
        setLength((n) => n + 1);
        return;
      }
      if (phase === "typing") {
        if (length + 1 >= WORD.length) {
          setLength(WORD.length);
          setPhase("hold-full");
        } else {
          setLength((n) => n + 1);
        }
        return;
      }
      if (phase === "hold-full") {
        setPhase("erasing");
        setLength((n) => n - 1);
        return;
      }
      if (phase === "erasing") {
        if (length - 1 <= RESTING_LENGTH) {
          setLength(RESTING_LENGTH);
          setPhase("hold-short");
        } else {
          setLength((n) => n - 1);
        }
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [phase, length, reducedMotion]);

  const visible = reducedMotion ? WORD : WORD.slice(0, length);

  return (
    <div role="status" className={cn("inline-flex items-center", className)}>
      <span aria-hidden="true" className="flex items-baseline font-display text-3xl font-medium tracking-tight text-navy">
        {visible}
        {!reducedMotion && (
          <span className="ml-0.5 h-[0.85em] w-[2px] animate-[onomic-cursor-blink_1s_steps(1)_infinite] bg-navy" />
        )}
      </span>
      <span className="sr-only">{label} Onomic</span>
    </div>
  );
}

export { OnomicTypingLoader };
