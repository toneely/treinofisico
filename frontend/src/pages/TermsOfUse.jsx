import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-white p-8 md:p-20">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-10 transition-colors">
          <ArrowLeft size={20} /> Voltar para Home
        </Link>

        <h1 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Termos de Uso</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600 font-medium leading-relaxed">
          <p>
            Ao acessar o aplicativo <strong>Treino Físico</strong>, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">1. Uso da Licença</h2>
          <p>
            É concedida permissão para baixar temporariamente uma cópia dos materiais no aplicativo Treino Físico, apenas para visualização transitória pessoal e não comercial.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">2. Isenção de Responsabilidade</h2>
          <p>
            Os materiais no Treino Físico são fornecidos 'como estão'. O aplicativo não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias.
          </p>
          <p>
            <strong>Aviso Médico:</strong> O Treino Físico não substitui a orientação de um profissional de educação física ou médico. Recomendamos consultar um especialista antes de iniciar qualquer rotina de exercícios.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">3. Assinaturas e Pagamentos</h2>
          <p>
            O plano Premium é uma assinatura recorrente que oferece uma experiência sem anúncios. Os pagamentos são processados via Mercado Pago e podem ser cancelados a qualquer momento pelo usuário.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">4. Limitações</h2>
          <p>
            Em nenhum caso o Treino Físico ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucros ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar o aplicativo.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">5. Revisões e Erratas</h2>
          <p>
            Os materiais exibidos no aplicativo podem incluir erros técnicos, tipográficos ou fotográficos. O Treino Físico não garante que qualquer material em seu site seja preciso, completo ou atual.
          </p>

          <p className="pt-10 text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
