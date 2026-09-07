import Link from "next/link";
import {
  ArrowRight,
  Landmark,
  LineChart,
  Sparkles,
  Repeat,
  FileSpreadsheet,
  Target,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BalanceCardMock } from "@/components/marketing/balance-card-mock";

const PILLARS = [
  {
    icon: Landmark,
    tone: "primary" as const,
    title: "Finanças pessoais e familiares",
    description:
      "Contas partilhadas por workspace, categorias, transações recorrentes e importação de extratos — com cada família a ver só os seus dados.",
  },
  {
    icon: LineChart,
    tone: "sky" as const,
    title: "Investimentos",
    description:
      "Acompanhe carteiras e cripto com o Opportunity Score e o Risk Score, apoiados por dados de mercado em tempo real — a IA interpreta, nunca decide por si.",
  },
  {
    icon: Sparkles,
    tone: "violet" as const,
    title: "Conselheiro financeiro (em breve)",
    description:
      "Uma camada de IA que junta os dois lados — pessoal e investimento — para sugerir ajustes ao orçamento com base no que já está a acontecer na sua conta.",
  },
];

const FEATURES = [
  {
    icon: Repeat,
    title: "Recorrências automáticas",
    description: "Renda, subscrições e salário lançados sozinhos, no dia certo, todos os meses.",
  },
  {
    icon: FileSpreadsheet,
    title: "Importação de extratos",
    description: "Carregue um CSV do seu banco e deixe a categorização automática tratar do resto.",
  },
  {
    icon: Target,
    title: "Vaults de poupança",
    description: "Separe dinheiro para um objetivo concreto sem abrir uma conta nova para isso.",
  },
  {
    icon: Trophy,
    title: "Desafios financeiros",
    description: "Metas com regras claras, a solo ou em família, para criar o hábito de poupar.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Crie o seu workspace",
    description: "Sozinho ou em família — os dados de cada workspace ficam isolados dos restantes, sempre.",
  },
  {
    number: "02",
    title: "Ligue as suas contas",
    description: "Lançe transações à mão, importe um extrato, ou deixe as recorrências tratarem do previsível.",
  },
  {
    number: "03",
    title: "Veja o que a IA encontra",
    description: "Categorias sugeridas, desvios ao orçamento e um resumo mensal — sem promessas de bola de cristal.",
  },
];

export function LandingPage() {
  return (
    <>
      <SiteNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <Container className="grid gap-16 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
            <div>
              <Badge variant="primary">Contas pessoais, família e investimentos</Badge>
              <h1 className="mt-6 text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                O dinheiro da sua família, finalmente num só lugar.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                Onomic junta orçamento pessoal, gestão familiar e
                investimentos numa aplicação com categorização automática por
                IA e metas visuais — para saber, todos os meses, para onde
                foi o dinheiro e para onde vai a seguir.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Começar gratuitamente
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#produto">Ver como funciona</a>
                </Button>
              </div>
              <p className="mt-6 flex items-center gap-2 text-xs font-medium text-muted">
                <ShieldCheck className="size-4 text-primary-strong" aria-hidden />
                Isolamento de dados ao nível da base de dados, por família — não apenas na interface.
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <BalanceCardMock />
            </div>
          </Container>
        </section>

        {/* Pillars */}
        <section id="produto" className="border-b border-border bg-surface">
          <Container className="py-20">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-strong">
                O que é o Onomic
              </span>
              <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
                Três frentes, um único histórico financeiro.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {PILLARS.map((pillar) => (
                <Card key={pillar.title} className="border-border">
                  <CardHeader>
                    <span
                      className={
                        pillar.tone === "primary"
                          ? "flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink"
                          : pillar.tone === "sky"
                            ? "flex size-10 items-center justify-center rounded-full bg-sky-soft text-sky"
                            : "flex size-10 items-center justify-center rounded-full bg-violet-soft text-violet"
                      }
                    >
                      <pillar.icon className="size-5" aria-hidden />
                    </span>
                    <CardTitle className="mt-3">{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{pillar.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Feature grid */}
        <section id="investimentos" className="border-b border-border">
          <Container className="py-20">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-strong">
                  Sob o capô
                </span>
                <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
                  O trabalho repetitivo fica com a aplicação.
                </h2>
                <p className="mt-4 max-w-md text-ink-soft leading-relaxed">
                  Registar cada despesa à mão cansa. O Onomic combina entrada
                  manual, recorrências, importação de extratos e
                  categorização automática — escolha o método, ou use os
                  quatro ao mesmo tempo.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="rounded-lg border border-border bg-surface p-5">
                    <feature.icon className="size-5 text-primary-strong" aria-hidden />
                    <h3 className="mt-3 font-display text-base font-medium">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="border-b border-border bg-navy text-white">
          <Container className="grain-overlay py-20">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-soft">
              Como funciona
            </span>
            <h2 className="mt-3 max-w-lg text-3xl font-medium tracking-tight sm:text-4xl">
              Três passos para uma visão real do seu dinheiro.
            </h2>

            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number}>
                  <span className="font-display text-3xl font-medium text-white/25">
                    {step.number}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{step.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Principles */}
        <section className="border-b border-border">
          <Container className="py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-strong">
                O nosso princípio
              </span>
              <p className="mt-5 font-display text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
                A IA interpreta os seus dados. Nunca é a fonte da verdade
                sobre eles — o extrato da sua conta é.
              </p>
              <p className="mt-4 text-ink-soft">
                Toda a categorização e todo o score de investimento pode ser
                revisto e corrigido. Sem números que ninguém consegue
                explicar.
              </p>
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section>
          <Container className="py-20">
            <div className="grain-overlay flex flex-col items-center gap-6 rounded-xl bg-primary-ink px-8 py-16 text-center text-white">
              <h2 className="max-w-lg text-3xl font-medium tracking-tight sm:text-4xl">
                Comece a organizar o dinheiro da sua família hoje.
              </h2>
              <p className="max-w-md text-white/70">
                Grátis para começar. Sem cartão de crédito, sem ligação ao
                banco obrigatória.
              </p>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link href="/signup">
                  Criar a minha conta
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
