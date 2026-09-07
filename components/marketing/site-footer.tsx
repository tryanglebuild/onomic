import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logomark } from "@/components/ui/logomark";

const COLUMNS = [
  {
    title: "Produto",
    links: [
      { href: "#produto", label: "Finanças da família" },
      { href: "#investimentos", label: "Investimentos" },
      { href: "#produto", label: "Vaults e desafios" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "#", label: "Sobre" },
      { href: "#", label: "Segurança" },
      { href: "#", label: "Contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Termos" },
      { href: "/privacy", label: "Privacidade" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-navy text-white/70">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <Logomark className="size-7 text-white" />
            <span className="font-display text-lg font-medium text-white">Onomic</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Contas pessoais e familiares, investimentos e um plano claro para
            o dinheiro — num único espaço, com os dados sempre isolados por
            família.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Onomic. Todos os direitos reservados.</p>
        <p>Feito em Portugal.</p>
      </Container>
    </footer>
  );
}
