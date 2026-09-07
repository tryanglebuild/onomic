import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BalanceCardMock } from "@/components/marketing/balance-card-mock";
import { Logomark } from "@/components/ui/logomark";

/**
 * Shared split-screen shell for the auth flow (login, signup, invite).
 * Left: form content (page-specific). Right: branded panel, fixed content.
 */
export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between p-8 sm:p-12">
        <Link href="/" className="flex items-center gap-2">
          <Logomark className="size-7 text-navy" />
          <span className="font-display text-lg font-medium tracking-tight">
            Onomic
          </span>
        </Link>

        <div className="mx-auto w-full max-w-sm py-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-strong">
            {eyebrow}
          </span>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
            {title}
          </h1>
          <div className="mt-8">{children}</div>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="size-4 text-primary-strong" aria-hidden />
          Os dados de cada família ficam isolados na base de dados.
        </p>
      </div>

      <div className="grain-overlay relative hidden items-center justify-center overflow-hidden bg-navy p-16 lg:flex">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet/20 blur-3xl"
        />
        <div className="relative flex flex-col items-center gap-10">
          <BalanceCardMock />
          <p className="max-w-sm text-center font-display text-xl font-medium leading-snug text-white/90">
            Um único lugar para saber, todos os meses, para onde foi o
            dinheiro da família.
          </p>
        </div>
      </div>
    </div>
  );
}
