import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Dumbbell, Trophy, Users, ShieldCheck, Zap } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-md overflow-hidden">
              <img src="/logo-app.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tight">Treino Físico</span>
          </div>
          <Link
            to="/login"
            className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Entrar / Cadastrar
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tighter leading-none">
              Transforme seu corpo com <br />
              <span style={{ color: "var(--color-primary)" }}>Treinos Inteligentes</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 font-medium">
              Acompanhe sua evolução, personalize suas rotinas e alcance seus objetivos físicos com a plataforma mais completa de musculação e calistenia.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/login"
                className="px-8 py-4 text-lg font-black rounded-2xl shadow-2xl transition-all hover:scale-105"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
              >
                Começar Agora Gratuitamente
              </Link>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                Por que escolher o Treino Físico?
              </h2>
              <p className="text-slate-500 font-medium max-w-xl mx-auto">
                Desenvolvemos uma ferramenta focada em resultados reais, eliminando a complexidade do acompanhamento de treinos.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Dumbbell size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">Treino Planejado</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Organize suas séries, repetições e cargas com precisão. O planejamento adequado é o segredo para evitar o platô e continuar evoluindo constantemente na musculação ou calistenia.
                </p>
              </div>

              <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
                  <Trophy size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">Consistência Física</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Mantenha o histórico completo de suas sessões. Ver sua progressão de cargas ao longo do tempo é o maior motivador para manter a disciplina nos dias mais difíceis.
                </p>
              </div>

              <div className="p-8 rounded-[32px] bg-slate-50 border border-slate-100">
                <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <Zap size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">Saúde e Bem-estar</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  Praticar exercícios físicos regularmente melhora a saúde cardiovascular, fortalece os ossos e reduz o estresse, proporcionando uma qualidade de vida superior.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                Planos que cabem no seu bolso
              </h2>
              <p className="text-slate-500 font-medium">
                Escolha a melhor opção para sua jornada fitness.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Plano Grátis */}
              <div className="bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-xl">
                <h3 className="text-2xl font-black text-slate-900 mb-2">Gratuito</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-slate-900">R$ 0</span>
                  <span className="text-slate-400 font-bold">/mês</span>
                </div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-slate-600 font-medium">
                    <CheckCircle2 className="text-green-500" size={20} /> Registro de treinos ilimitado
                  </li>
                  <li className="flex items-center gap-3 text-slate-600 font-medium">
                    <CheckCircle2 className="text-green-500" size={20} /> Histórico de cargas
                  </li>
                  <li className="flex items-center gap-3 text-slate-400 font-medium">
                    <span className="w-5 text-center">•</span> Com anúncios
                  </li>
                </ul>
                <Link
                  to="/login"
                  className="block w-full py-4 text-center bg-slate-100 text-slate-900 font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Começar Grátis
                </Link>
              </div>

              {/* Plano Premium */}
              <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-950 px-6 py-1 font-black text-xs uppercase tracking-widest rounded-bl-2xl">
                  Recomendado
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Premium</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-white">R$ 5</span>
                  <span className="text-slate-500 font-bold">/mês</span>
                </div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-slate-300 font-medium">
                    <CheckCircle2 className="text-yellow-400" size={20} /> Experiência Sem Anúncios
                  </li>
                  <li className="flex items-center gap-3 text-slate-300 font-medium">
                    <CheckCircle2 className="text-yellow-400" size={20} /> Suporte prioritário
                  </li>
                  <li className="flex items-center gap-3 text-slate-300 font-medium">
                    <CheckCircle2 className="text-yellow-400" size={20} /> Todas as funções Pro
                  </li>
                </ul>
                <Link
                  to="/login"
                  className="block w-full py-4 text-center font-black rounded-2xl transition-all hover:scale-105 shadow-lg shadow-blue-900/20"
                  style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
                >
                  Assinar Premium
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100">
                <img src="/logo-app.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-black text-slate-800">Treino Físico</span>
            </div>

            <div className="flex gap-8">
              <Link to="/privacy" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                Políticas de Privacidade
              </Link>
              <Link to="/terms" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                Termos de Uso
              </Link>
            </div>

            <p className="text-sm text-slate-400 font-medium">
              © {new Date().getFullYear()} Treino Físico. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
