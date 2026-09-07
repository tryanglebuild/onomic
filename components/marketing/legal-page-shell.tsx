import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Container } from "@/components/ui/container";

/** Shared shell for /terms and /privacy — nav + footer + article typography. */
function LegalPageShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Container className="max-w-3xl py-16 lg:py-20">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-strong">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted">Última atualização: {updated}</p>

          <div
            className={[
              "mt-10 max-w-none",
              "[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-medium [&_h2]:mt-10 [&_h2]:mb-3",
              "[&_h2:first-child]:mt-0",
              "[&_p]:text-ink-soft [&_p]:leading-relaxed [&_p]:mb-4",
              "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-soft [&_ul]:leading-relaxed",
              "[&_li]:mb-1.5",
              "[&_strong]:text-ink [&_strong]:font-semibold",
              "[&_a]:text-primary-strong [&_a]:font-medium [&_a]:hover:underline",
            ].join(" ")}
          >
            {children}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

export { LegalPageShell };
