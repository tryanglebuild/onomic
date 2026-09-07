import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The Onomic mark: a solid disc (the "O") with the "n" cut through it in
 * true negative space via an SVG mask — reads as a plain dot at a glance,
 * reveals the letter up close. `currentColor` — set text color on a
 * parent/className to theme it (navy on paper, white on navy, etc).
 */
function Logomark({ className, ...props }: React.ComponentProps<"svg">) {
  const maskId = React.useId();

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={cn("text-navy", className)}
      role="img"
      aria-label="Onomic"
      {...props}
    >
      <mask id={maskId}>
        <rect x="0" y="0" width="120" height="120" fill="white" />
        <path
          className="onomic-mark-n"
          d="M47,80 L47,54 A13,13 0 0 1 73,54 L73,80"
          stroke="black"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          pathLength="100"
        />
      </mask>
      <circle
        className="onomic-mark-o"
        cx="60"
        cy="60"
        r="42"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

export { Logomark };
