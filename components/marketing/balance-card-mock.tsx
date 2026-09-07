import { Wallet, TrendingUp, Sparkles } from "lucide-react";

const BARS = [38, 52, 44, 68, 58, 80, 71];

/** Signature hero visual — a stylised balance card, not a screenshot. Reused wherever the product needs a quick "this is what it feels like" cue. */
export function BalanceCardMock() {
  return (
    <div className="relative">
      <div className="grain-overlay relative w-full max-w-sm rounded-xl border border-white/10 bg-gradient-to-br from-navy-soft to-navy p-6 shadow-lifted">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            <Wallet className="size-3.5" aria-hidden />
            Família Oliveira
          </span>
          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary-soft">
            +4,2% este mês
          </span>
        </div>

        <p className="mt-6 font-display text-4xl font-medium tracking-tight text-white">
          8.420,50&nbsp;€
        </p>
        <p className="mt-1 text-sm text-white/50">Saldo combinado das contas</p>

        <div className="mt-6 flex items-end gap-1.5">
          {BARS.map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-white/15"
              style={{ height: `${height}px` }}
              aria-hidden
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="flex items-center gap-1.5 text-xs text-white/60">
            <Sparkles className="size-3.5 text-violet" aria-hidden />
            &ldquo;Restaurantes&rdquo; — categorizado por IA
          </span>
          <span className="text-xs font-semibold text-white/80">-24,90&nbsp;€</span>
        </div>
      </div>

      <div className="absolute -bottom-6 -left-6 hidden w-52 rounded-lg border border-border bg-surface p-4 shadow-lifted sm:block">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-strong">
          <TrendingUp className="size-3.5" aria-hidden />
          Vault &ldquo;Férias 2026&rdquo;
        </span>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full w-[64%] rounded-full bg-primary" />
        </div>
        <p className="mt-2 text-xs text-muted">1.280&nbsp;€ de 2.000&nbsp;€</p>
      </div>
    </div>
  );
}
