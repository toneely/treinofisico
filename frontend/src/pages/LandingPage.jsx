import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Dumbbell, Trophy, Users, ShieldCheck, Zap, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const LandingPage = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    if (loadingDemo) return;
    setLoadingDemo(true);
    showToast("Acessando modo demonstração...", "info");
    try {
      const { error } = await signIn("demo@treinofisico.app", "prosperidadefinanceira7");
      if (error) {
        showToast("Erro ao entrar no modo demonstração: " + error.message, "error");
      } else {
        showToast("Bem-vindo ao modo demonstração!", "success");
        navigate("/app");
      }
    } catch (err) {
      showToast("Falha ao autenticar demo.", "error");
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        backgroundImage: "url('/assets/bg-landing.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0a0a0a"
      }}
    >
      {/* Cabeçalho */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-transparent rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo-app.png" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <span className="text-lg sm:text-xl font-black text-white tracking-tight truncate">Treino Físico</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDemoLogin}
              disabled={loadingDemo}
              className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 backdrop-blur-sm text-white text-xs sm:text-sm font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all whitespace-nowrap flex items-center gap-2"
            >
              {loadingDemo && <Loader2 className="animate-spin" size={14} />}
              Experimentar sem Cadastro
            </button>
            <Link
              to={user ? "/app" : "/login"}
              className="px-4 py-2 sm:px-6 sm:py-2.5 bg-white/5 backdrop-blur-sm text-white text-sm sm:text-base font-bold rounded-xl border border-white/20 hover:bg-white/10 transition-all whitespace-nowrap"
            >
              {user ? "Ir para o Painel" : "Entrar / Cadastrar"}
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-none">
              Transforme seu corpo com <br />
              <span style={{ color: "var(--color-primary)" }}>Treinos Inteligentes</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 font-medium">
              Acompanhe sua evolução, personalize suas rotinas e alcance seus objetivos físicos com a plataforma mais completa de musculação e calistenia.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to={user ? "/app" : "/login"}
                className="px-8 py-4 text-lg font-black rounded-2xl shadow-2xl transition-all hover:scale-105"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--text-on-primary)" }}
              >
                {user ? "Continuar Treinando" : "Começar Agora Gratuitamente"}
              </Link>
              <button
                onClick={handleDemoLogin}
                disabled={loadingDemo}
                className="px-8 py-4 text-lg font-black rounded-2xl shadow-2xl transition-all hover:scale-105 bg-white/10 text-white border border-white/20 hover:bg-white/20 flex items-center justify-center gap-2"
              >
                {loadingDemo && <Loader2 className="animate-spin" size={18} />}
                Experimentar sem Cadastro
              </button>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Por que escolher o Treino Físico?
              </h2>
              <p className="text-slate-400 font-medium max-w-xl mx-auto">
                Desenvolvemos uma ferramenta focada em resultados reais, eliminando a complexidade do acompanhamento de treinos.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-[32px] bg-white/5 backdrop-blur-md border border-white/10">
                <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                  <Dumbbell size={28} />
                </div>
                <h3 className="text-xl font-black text-white mb-4">Treino Planejado</h3>
                <p className="text-slate-300 leading-relaxed font-medium">
                  Organize suas séries, repetições e cargas com precisão. O planejamento adequado é o segredo para evitar o platô e continuar evoluindo constantemente na musculação ou calistenia.
                </p>
              </div>

              <div className="p-8 rounded-[32px] bg-white/5 backdrop-blur-md border border-white/10">
                <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mb-6">
                  <Trophy size={28} />
                </div>
                <h3 className="text-xl font-black text-white mb-4">Consistência Física</h3>
                <p className="text-slate-300 leading-relaxed font-medium">
                  Mantenha o histórico completo de suas sessões. Ver sua progressão de cargas ao longo do tempo é o maior motivador para manter a disciplina nos dias mais difíceis.
                </p>
              </div>

              <div className="p-8 rounded-[32px] bg-white/5 backdrop-blur-md border border-white/10">
                <div className="w-14 h-14 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                  <Zap size={28} />
                </div>
                <h3 className="text-xl font-black text-white mb-4">Saúde e Bem-estar</h3>
                <p className="text-slate-300 leading-relaxed font-medium">
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
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Planos que cabem no seu bolso
              </h2>
              <p className="text-slate-400 font-medium">
                Escolha a melhor opção para sua jornada fitness.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Plano Grátis */}
              <div className="bg-white/5 backdrop-blur-md p-10 rounded-[40px] border border-white/10 shadow-xl">
                <h3 className="text-2xl font-black text-white mb-2">Gratuito</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-white">R$ 0</span>
                  <span className="text-slate-500 font-bold">/mês</span>
                </div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-slate-300 font-medium">
                    <CheckCircle2 className="text-green-500" size={20} /> Registro de treinos ilimitado
                  </li>
                  <li className="flex items-center gap-3 text-slate-300 font-medium">
                    <CheckCircle2 className="text-green-500" size={20} /> Histórico de cargas
                  </li>
                  <li className="flex items-center gap-3 text-slate-500 font-medium">
                    <span className="w-5 text-center">•</span> Com anúncios
                  </li>
                </ul>
                <Link
                  to="/login"
                  className="block w-full py-4 text-center bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition-all border border-white/10"
                >
                  Começar Grátis
                </Link>
              </div>

              {/* Plano Premium */}
              <div className="bg-white/10 backdrop-blur-md p-10 rounded-[40px] shadow-2xl relative overflow-hidden border border-white/20">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-950 px-6 py-1 font-black text-xs uppercase tracking-widest rounded-bl-2xl">
                  Recomendado
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Premium</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-black text-white">R$ 5</span>
                  <span className="text-slate-400 font-bold">/mês</span>
                </div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-slate-200 font-medium">
                    <CheckCircle2 className="text-yellow-400" size={20} /> Experiência Sem Anúncios
                  </li>
                  <li className="flex items-center gap-3 text-slate-200 font-medium">
                    <CheckCircle2 className="text-yellow-400" size={20} /> Suporte prioritário
                  </li>
                  <li className="flex items-center gap-3 text-slate-200 font-medium">
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
      <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-transparent rounded-lg overflow-hidden">
                <img src="/logo-app.png" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <span className="font-black text-white">Treino Físico</span>
            </div>

            <div className="flex gap-8">
              <Link to="/privacy" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                Políticas de Privacidade
              </Link>
              <Link to="/terms" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                Termos de Uso
              </Link>
            </div>

            <p className="text-sm text-slate-500 font-medium">
              © {new Date().getFullYear()} Treino Físico. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
