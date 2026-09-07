import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  weight: "variable",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://onomic.app"),
  title: {
    default: "Onomic — Clareza financeira para a sua família",
    template: "%s — Onomic",
  },
  description:
    "Onomic junta contas pessoais, orçamento familiar e investimentos num único espaço, com metas visuais e categorização automática por IA.",
  openGraph: {
    title: "Onomic — Clareza financeira para a sua família",
    description:
      "Contas pessoais, orçamento familiar e investimentos num único espaço, com metas visuais e categorização automática por IA.",
    url: "https://onomic.app",
    siteName: "Onomic",
    locale: "pt_PT",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-PT"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
