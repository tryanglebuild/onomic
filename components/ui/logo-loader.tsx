import { cn } from "@/lib/utils";
import { Logomark } from "@/components/ui/logomark";

/**
 * Loading indicator built from the Onomic mark itself: the "O" draws in,
 * then the "n", then both hold and fade before looping. Pure CSS
 * (keyframes in globals.css) — no JS, degrades to a static mark under
 * prefers-reduced-motion.
 */
function LogoLoader({ className, label = "A carregar" }: { className?: string; label?: string }) {
  return (
    <div role="status" className={cn("inline-flex", className)}>
      <Logomark className="onomic-mark-loading size-10 text-navy" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { LogoLoader };
