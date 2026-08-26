import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownContent = `Política de Privacidade – Treino Físico
Esta Política de Privacidade descreve como o aplicativo Treino Físico coleta, utiliza, armazena e protege as informações e dados pessoais dos usuários, em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e as diretrizes do programa Google AdSense.

1. Coleta de Informações e Dados Pessoais
Coletamos informações fornecidas diretamente por você para viabilizar a prestação dos nossos serviços:

Dados de Cadastro: Nome completo e endereço de e-mail (fornecidos via login social ou cadastro manual no sistema).

Dados de Utilização: Histórico de rotinas de exercícios, registros de cargas, repetições, blocos de treinos concluídos e dados de evolução física coletados de forma estritamente consentida.

2. Finalidade do Uso dos Dados (Bases Legais)
O tratamento dos seus dados pessoais fundamenta-se no consentimento do usuário e na execução do contrato de prestação de serviços (Termos de Uso), sendo utilizado exclusivamente para:

Identificar o usuário, autenticar o acesso e sincronizar o histórico de exercícios entre múltiplos dispositivos de forma personalizada.

Gerenciar e validar o status da assinatura Premium (comunicação integrada com intermediadores de pagamento).

Aprimorar os algoritmos de sugestões de treinos e inteligência da plataforma com base nas métricas de uso geral.

3. Cookies e Anúncios de Terceiros (Diretrizes AdSense)
Para o funcionamento da versão gratuita, o Treino Físico exibe publicidade fornecida por parceiros:

Google AdSense: O Google, como fornecedor terceiro, utiliza cookies (como o cookie DART) para veicular anúncios com base nas visitas que o usuário faz a este ou a outros sites na Internet.

Controle do Usuário: Os usuários podem desativar a publicidade personalizada acessando diretamente as Configurações de Anúncios do Google (https://www.google.com/settings/ads). Alternativamente, o uso de cookies por terceiros para publicidade personalizada pode ser gerenciado no site About Ads (https://www.aboutads.info).

4. Compartilhamento e Segurança dos Dados
Seus dados de treino e informações pessoais são considerados confidenciais. Não vendemos, alugamos ou compartilhamos suas informações com terceiros para fins comerciais.

Infraestrutura: Os dados são armazenados em nuvem utilizando a infraestrutura segura do Supabase, contando com criptografia e controles estritos de acesso.

Embora utilizemos medidas técnicas e administrativas avançadas para proteger os dados armazenados, nenhum método de transmissão eletrônica pela Internet é 100% infalível.

5. Direitos do Titular (LGPD) e Exclusão de Dados
Em conformidade com o artigo 18 da LGPD, o usuário possui total controle sobre seus dados e pode, a qualquer momento:

Confirmar a existência de tratamento e acessar seus dados cadastrais.

Solicitar a correção de dados incompletos ou desatualizados.

Revogação e Exclusão: Solicitar a exclusão definitiva de sua conta e de todo o histórico associado diretamente através da tela de configurações do perfil no aplicativo, ou mediante requisição formal ao suporte técnico da plataforma.

6. Contato e Responsável pelo Tratamento (Controlador)
O controlador responsável pelo tratamento dos dados pessoais deste aplicativo é a empresa TONE ELY CARVALHO MENDES, devidamente inscrita no CNPJ/MF sob o nº 57.793.463/0001-75. Para dúvidas, esclarecimentos ou requisições sobre a privacidade dos seus dados, o usuário pode entrar em contato diretamente através do e-mail oficial de suporte: toneely.gestor@gmail.com.`;

const PrivacyPolicy = () => {
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

        <h1 className="text-4xl font-black text-white mb-8 tracking-tight">Políticas de Privacidade</h1>

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

export default PrivacyPolicy;
