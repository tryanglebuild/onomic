import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/marketing/legal-page-shell'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o Onomic recolhe, usa e protege os seus dados.',
}

export default function PrivacyPage() {
  return (
    <LegalPageShell eyebrow="Legal" title="Política de Privacidade" updated="7 de setembro de 2026">
      <h2>1. Quem trata os seus dados</h2>
      <p>
        O Onomic é o responsável pelo tratamento dos dados recolhidos
        através da plataforma. Para qualquer questão sobre esta política ou
        sobre os seus dados, contacte{' '}
        <a href="mailto:privacidade@onomic.app">privacidade@onomic.app</a>.
      </p>

      <h2>2. Que dados recolhemos</h2>
      <p>Recolhemos os dados que nos fornece diretamente e os que resultam do uso da plataforma:</p>
      <ul>
        <li><strong>Conta:</strong> nome, email, palavra-passe (encriptada) e, opcionalmente, data de nascimento;</li>
        <li><strong>Financeiros:</strong> transações, categorias, orçamentos, extratos importados e regras de recorrência que registe;</li>
        <li><strong>Investimentos:</strong> carteiras, watchlists e preferências de acompanhamento de ativos;</li>
        <li><strong>Workspace:</strong> a que famílias pertence, o seu papel (dono/membro) e convites enviados ou recebidos;</li>
        <li><strong>Uso da plataforma:</strong> registos técnicos de acesso e sessão, para segurança e resolução de problemas.</li>
      </ul>

      <h2>3. Para que usamos os seus dados</h2>
      <ul>
        <li>Prestar o serviço: mostrar os seus saldos, transações, metas e investimentos;</li>
        <li>Categorização automática de transações e cálculo de scores de investimento, com apoio de inteligência artificial;</li>
        <li>Segurança: prevenir acessos indevidos e isolar os dados de cada workspace dos restantes;</li>
        <li>Comunicações essenciais: confirmação de conta, convites, alertas de segurança;</li>
        <li>Melhoria do produto, sempre com dados agregados ou anonimizados sempre que possível.</li>
      </ul>
      <p>
        Nunca vendemos os seus dados a terceiros nem os usamos para
        publicidade.
      </p>

      <h2>4. A data de nascimento é opcional</h2>
      <p>
        Pedimos a data de nascimento apenas para personalizar a experiência
        e para eventual verificação de idade mínima em funcionalidades
        futuras. Pode criar conta sem a fornecer.
      </p>

      <h2>5. Isolamento de dados por família</h2>
      <p>
        Os dados de cada workspace (pessoal ou familiar) ficam isolados ao
        nível da base de dados — um membro de uma família nunca consegue
        aceder aos dados de outro workspace, mesmo que exista uma falha na
        interface. Este isolamento é reforçado, não apenas visual.
      </p>

      <h2>6. Com quem partilhamos dados</h2>
      <p>Usamos os seguintes prestadores de serviço para operar o Onomic, todos vinculados por contratos de proteção de dados:</p>
      <ul>
        <li><strong>Supabase</strong> — alojamento da base de dados, autenticação e armazenamento;</li>
        <li><strong>OpenRouter</strong> — processamento de IA para categorização de transações e análise de investimentos. Recebe apenas os dados estritamente necessários para gerar a sugestão, nunca a sua identidade completa;</li>
        <li><strong>CoinGecko</strong> — dados de mercado de criptoativos, sem qualquer dado pessoal seu envolvido.</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        Usamos apenas cookies estritamente necessários, para manter a sua
        sessão autenticada. Não usamos cookies de publicidade nem de
        rastreamento de terceiros.
      </p>

      <h2>8. Quanto tempo guardamos os seus dados</h2>
      <p>
        Mantemos os seus dados enquanto a conta estiver ativa. Se encerrar
        a conta, os dados são eliminados ou anonimizados dentro de um
        prazo razoável, exceto quando a lei exigir retenção por período
        mais longo.
      </p>

      <h2>9. Os seus direitos</h2>
      <p>Ao abrigo do RGPD, tem direito a:</p>
      <ul>
        <li>Aceder aos dados que temos sobre si;</li>
        <li>Corrigir dados incorretos ou desatualizados;</li>
        <li>Pedir a eliminação da sua conta e dos seus dados;</li>
        <li>Exportar os seus dados num formato estruturado;</li>
        <li>Opor-se a determinados tratamentos ou retirar o consentimento dado.</li>
      </ul>
      <p>
        Para exercer qualquer um destes direitos, contacte{' '}
        <a href="mailto:privacidade@onomic.app">privacidade@onomic.app</a>.
        Tem também o direito de apresentar reclamação junto da Comissão
        Nacional de Proteção de Dados (CNPD).
      </p>

      <h2>10. Segurança</h2>
      <p>
        Os dados são encriptados em trânsito, o acesso à base de dados é
        controlado por regras de isolamento por workspace, e as
        palavras-passe nunca são guardadas em texto simples.
      </p>

      <h2>11. Alterações a esta política</h2>
      <p>
        Podemos atualizar esta política à medida que o produto evolui.
        Alterações materiais serão comunicadas por email ou através da
        plataforma antes de entrarem em vigor.
      </p>
    </LegalPageShell>
  )
}
