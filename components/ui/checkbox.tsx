import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {
  label: React.ReactNode;
}

function Checkbox({ className, id, label, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-ink-soft">
      <input type="checkbox" id={id} className={cn("peer sr-only", className)} {...props} />
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-0.5 flex size-4 shrink-0 rounded border border-border-strong bg-surface transition-colors",
          "peer-checked:border-primary peer-checked:bg-primary",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper",
          "after:absolute after:left-[5px] after:top-[1px] after:h-2 after:w-1 after:rotate-45 after:border-r-2 after:border-b-2 after:border-white after:opacity-0 after:content-['']",
          "peer-checked:after:opacity-100"
        )}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export { Checkbox };
