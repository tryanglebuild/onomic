import type { Metadata } from 'next'
import { LegalPageShell } from '@/components/marketing/legal-page-shell'

export const metadata: Metadata = {
  title: 'Termos e Condições',
  description: 'Termos e condições de utilização da plataforma Onomic.',
}

export default function TermsPage() {
  return (
    <LegalPageShell eyebrow="Legal" title="Termos e Condições" updated="7 de setembro de 2026">
      <h2>1. Aceitação dos termos</h2>
      <p>
        Ao criar uma conta no Onomic, aceita estes Termos e Condições e a
        nossa <a href="/privacy">Política de Privacidade</a>. Se não
        concordar com algum dos pontos abaixo, não deve utilizar a
        plataforma.
      </p>

      <h2>2. O que é o Onomic</h2>
      <p>
        O Onomic é uma plataforma de gestão financeira pessoal e familiar,
        com registo manual e automático de transações, categorização
        assistida por inteligência artificial, acompanhamento de
        investimentos e ferramentas de poupança (vaults e desafios). O
        produto está em desenvolvimento ativo — algumas funcionalidades
        descritas na plataforma podem ainda estar em fase beta.
      </p>

      <h2>3. A sua conta</h2>
      <p>
        É responsável por manter a confidencialidade da sua palavra-passe e
        por toda a atividade realizada através da sua conta. Deve ter pelo
        menos 18 anos para criar uma conta. Se criar um workspace familiar,
        é também responsável por gerir corretamente quem convida e remove
        como membro.
      </p>

      <h2>4. Categorização e pontuações por inteligência artificial</h2>
      <p>
        As sugestões de categorização de transações, os scores de
        investimento e qualquer outra análise gerada por IA são
        <strong> apoios à decisão, não aconselhamento financeiro</strong>.
        A IA interpreta os seus próprios dados — nunca é a fonte de
        verdade sobre eles. O extrato da sua conta prevalece sempre sobre
        qualquer categorização automática, e pode corrigir qualquer
        sugestão a qualquer momento.
      </p>

      <h2>5. Utilização aceitável</h2>
      <p>Ao usar o Onomic, compromete-se a não:</p>
      <ul>
        <li>Aceder ou tentar aceder a dados de outros utilizadores ou de outra família;</li>
        <li>Utilizar a plataforma para atividades ilegais, incluindo branqueamento de capitais;</li>
        <li>Tentar contornar os mecanismos de segurança ou isolamento de dados;</li>
        <li>Revender ou sublicenciar o acesso à plataforma sem autorização.</li>
      </ul>

      <h2>6. Dados importados de terceiros</h2>
      <p>
        Se importar extratos bancários (CSV) ou ligar contas externas, é
        responsável por garantir que tem o direito de partilhar essa
        informação connosco. Tratamos esses dados apenas para lhe prestar o
        serviço, conforme descrito na <a href="/privacy">Política de Privacidade</a>.
      </p>

      <h2>7. Disponibilidade do serviço</h2>
      <p>
        Fazemos os possíveis para manter o Onomic disponível, mas não
        garantimos funcionamento ininterrupto. Podemos suspender ou alterar
        funcionalidades para manutenção, segurança ou melhoria do produto,
        avisando com antecedência razoável sempre que a alteração seja
        significativa.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        O Onomic é fornecido &ldquo;tal como está&rdquo;. Não somos responsáveis por
        decisões financeiras ou de investimento tomadas com base nas
        análises da plataforma, nem por perdas resultantes de erros de
        importação, indisponibilidade do serviço ou de dados fornecidos
        incorretamente pelo utilizador.
      </p>

      <h2>9. Encerramento de conta</h2>
      <p>
        Pode encerrar a sua conta a qualquer momento a partir das
        definições. Podemos suspender ou encerrar contas que violem estes
        termos, notificando o utilizador sempre que possível.
      </p>

      <h2>10. Alterações a estes termos</h2>
      <p>
        Podemos atualizar estes termos à medida que o produto evolui.
        Alterações materiais serão comunicadas por email ou através da
        plataforma antes de entrarem em vigor.
      </p>

      <h2>11. Lei aplicável</h2>
      <p>
        Estes termos regem-se pela lei portuguesa. Qualquer litígio será
        submetido aos tribunais competentes em Portugal.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Dúvidas sobre estes termos podem ser enviadas para{' '}
        <a href="mailto:legal@onomic.app">legal@onomic.app</a>.
      </p>
    </LegalPageShell>
  )
}
