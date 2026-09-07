import * as React from "react";
import { cn } from "@/lib/utils";

/** Generic page-width wrapper. Reused by every section — never re-declare max-width/padding ad hoc. */
function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6 lg:px-8", className)} {...props} />
  );
}

export { Container };
