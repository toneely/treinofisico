import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white p-8 md:p-20">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-10 transition-colors">
          <ArrowLeft size={20} /> Voltar para Home
        </Link>

        <h1 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Políticas de Privacidade</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600 font-medium leading-relaxed">
          <p>
            Esta Política de Privacidade descreve como o aplicativo <strong>Treino Físico</strong> coleta, usa e protege as informações dos usuários.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">1. Coleta de Informações</h2>
          <p>
            Coletamos informações básicas como e-mail e nome (fornecidos via login social ou cadastro manual) para identificar sua conta e salvar seu progresso de treinos de forma personalizada.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">2. Uso dos Dados</h2>
          <p>
            Seus dados são utilizados exclusivamente para:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Sincronizar seu histórico de exercícios entre dispositivos.</li>
            <li>Gerenciar sua assinatura Premium, se aplicável.</li>
            <li>Melhorar as funcionalidades do aplicativo com base no uso geral.</li>
          </ul>

          <h2 className="text-2xl font-black text-slate-800 mt-10">3. Cookies e Anúncios</h2>
          <p>
            Utilizamos serviços de terceiros, como o Google AdSense, que podem usar cookies para exibir anúncios personalizados com base em suas visitas anteriores. Você pode optar por sair da publicidade personalizada acessando as Configurações de Anúncios do Google.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">4. Segurança</h2>
          <p>
            Implementamos medidas de segurança para proteger suas informações pessoais. No entanto, nenhum método de transmissão pela Internet ou armazenamento eletrônico é 100% seguro.
          </p>

          <h2 className="text-2xl font-black text-slate-800 mt-10">5. Seus Direitos</h2>
          <p>
            Você pode, a qualquer momento, solicitar a exclusão de sua conta e de todos os dados associados através das configurações do perfil no aplicativo.
          </p>

          <p className="pt-10 text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
