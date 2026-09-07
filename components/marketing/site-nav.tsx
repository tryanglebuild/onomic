import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logomark } from "@/components/ui/logomark";

const LINKS = [
  { href: "#produto", label: "Produto" },
  { href: "#investimentos", label: "Investimentos" },
  { href: "#como-funciona", label: "Como funciona" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-paper/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logomark className="size-7 text-navy" />
          <span className="font-display text-lg font-medium tracking-tight">
            Onomic
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
