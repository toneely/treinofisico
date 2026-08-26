import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownContent = `Termos de Uso – Treino Físico
Bem-vindo ao Treino Físico. Ao acessar ou utilizar nossa plataforma, você concorda em cumprir e vincular-se aos seguintes Termos de Uso. Este aplicativo é operado e mantido pela empresa TONE ELY CARVALHO MENDES, inscrita no CNPJ/MF sob o nº 57.793.463/0001-75.

1. Objeto e Funcionalidades
O Treino Físico é uma plataforma digital voltada ao gerenciamento de rotinas de treinos, controle de cargas, repetições e acompanhamento de evolução física.

2. Planos, Assinaturas e Publicidade
Plano Gratuito: Oferece recursos de registro ilimitado e histórico. Para sustentar a viabilidade da plataforma, este plano exibe anúncios automáticos intermediados pelo Google AdSense.

Plano Premium (R$ 5,00/mês): Remove integralmente as publicidades da interface e concede acesso a recursos avançados exclusivos. O processamento dos pagamentos é realizado por gateways de pagamento integrados e seguros.

Cancelamento: A assinatura mensal pode ser cancelada pelo usuário a qualquer momento diretamente pelas configurações de perfil do aplicativo.

3. Isenção de Responsabilidade Médica e Física
Orientação Profissional: O Treino Físico é uma ferramenta de suporte, organização e registro de treinos. O aplicativo não substitui o acompanhamento e a orientação de profissionais de Educação Física, Personal Trainers ou Médicos.

Responsabilidade do Usuário: A execução dos exercícios, a escolha das cargas e a intensidade dos treinos são de inteira responsabilidade do usuário. A plataforma não se responsabiliza por lesões, acidentes ou problemas de saúde decorrentes da prática inadequada das atividades.

4. Propriedade Intelectual e Uso Aceitável
Todo o código-fonte, design, identidade visual e algoritmos do Treino Físico pertencem à empresa proprietária. É proibida qualquer tentativa de engenharia reversa, cópia não autorizada ou uso fraudulento das APIs de inteligência do sistema.

5. Modificações dos Termos
Reservamo-nos o direito de alterar estes termos a qualquer momento para refletir melhorias técnicas ou updates regulatórios. O uso continuado do aplicativo após as alterações constituirá aceitação dos novos termos.

Para suporte técnico ou dúvidas legais, entre em contato via e-mail: toneely.gestor@gmail.com.`;

const TermsOfUse = () => {
  return (
    <div
      className="min-h-screen p-8 md:p-20"
      style={{
        backgroundImage: "url('/assets/bg-landing.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0a0a0a"
      }}
    >
      <div className="max-w-3xl mx-auto bg-black/40 backdrop-blur-xl p-8 md:p-12 rounded-[40px] border border-white/10 shadow-2xl">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white font-bold mb-10 transition-colors">
          <ArrowLeft size={20} /> Voltar para Home
        </Link>

        <h1 className="text-4xl font-black text-white mb-8 tracking-tight">Termos de Uso</h1>

        <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed">
          <div id="main-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({node, ...props}) => <h2 className="text-2xl font-black text-white mt-10 mb-4" {...props} />,
                p: ({node, ...props}) => <p className="mb-4" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-4" {...props} />,
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>

          <p className="pt-10 text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
