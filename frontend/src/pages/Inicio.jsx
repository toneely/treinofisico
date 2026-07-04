import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Dumbbell,
  List,
  RotateCcw,
  Bike,
  Shield,
  Check,
  ChevronRight,
  Settings,
  History as HistoryIcon,
  User as UserIcon,
  Play,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import BodyEvolution from "../components/BodyEvolution";
import AdBanner from "../components/ui/AdBanner";
import LoadingScreen from "../components/LoadingScreen";

const WorkoutCard = ({ title, subtitle, icon, onClick, variant }) => {
  const getStyles = () => {
    switch (variant) {
      case "indigo":
        return {
          card: "bg-white border-slate-200 ",
          iconBg: "shadow-sm",
          iconStyle: {
            backgroundColor: "var(--color-secondary)",
            color: "var(--text-on-secondary)",
          },
          chevron: "opacity-50",
        };
      default:
        return {
          card: "bg-white border-slate-200 ",
          iconBg: "bg-slate-50",
          iconStyle: { color: "var(--color-primary)" },
          chevron: "text-slate-300",
        };
    }
  };

  const styles = getStyles();

  return (
    <button
      onClick={onClick}
      className={`w-full p-5 rounded-3xl shadow-sm border flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98] text-left ${styles.card}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${styles.iconBg}`}
          style={styles.iconStyle}
        >
          {icon}
        </div>
        <div>
          <h4
            className="font-bold text-lg"
            style={{ color: "var(--text-on-gestao)" }}
          >
            {title}
          </h4>
          <p className="text-sm opacity-60 font-medium">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className={styles.chevron} size={20} />
    </button>
  );
};

const Inicio = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: authUser, profile, isPremium } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [savedTraining, setSavedTraining] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("treinos");

  useEffect(() => {
    if (authUser) {
      fetchWorkouts();
      checkSavedTraining();
    }
  }, [authUser]);

  const checkSavedTraining = () => {
    const saved = localStorage.getItem("active_training_session");
    if (saved) {
      try {
        setSavedTraining(JSON.parse(saved));
      } catch (error) {
        localStorage.removeItem("active_training_session");
      }
    }
  };

  const fetchWorkouts = async () => {
    if (!authUser?.id) return;

    setLoading(true);
    const { data: workoutsData } = await supabase
      .from("treinos")
      .select("*")
      .eq("user_id", authUser.id)
      .not("nome", "ilike", "Livre%")
      .not("letra", "ilike", "Livre%")
      .order("ordem_exibicao", { ascending: true })
      .order("letra", { ascending: true });

    if (workoutsData && workoutsData.length > 0) {
      setWorkouts(workoutsData);
      setLoading(false);
    } else if (workoutsData && workoutsData.length === 0) {
      // New user? Clone global templates
      console.log("Nenhum treino encontrado para o usuário, iniciando onboarding...");
      await cloneGlobalWorkouts(authUser.id);
    } else {
      setLoading(false);
    }
  };

  const cloneGlobalWorkouts = async (targetUserId) => {
    try {
      // 1. Fetch global templates
      const { data: globalTreinos } = await supabase
        .from("treinos")
        .select("*")
        .is("user_id", null);

      if (!globalTreinos || globalTreinos.length === 0) {
        setLoading(false);
        return;
      }

      const { data: globalBlocos } = await supabase
        .from("blocos_treino")
        .select("*")
        .is("user_id", null);

      // 2. Clone treinos
      const userTreinos = globalTreinos.map(({ id, created_at, ...rest }) => ({
        ...rest,
        user_id: targetUserId,
      }));

      const { error: tError } = await supabase.from("treinos").insert(userTreinos);
      if (tError) throw tError;

      // 3. Clone blocos
      if (globalBlocos && globalBlocos.length > 0) {
        const userBlocos = globalBlocos.map(({ id, created_at, ...rest }) => ({
          ...rest,
          user_id: targetUserId,
        }));
        const { error: bError } = await supabase.from("blocos_treino").insert(userBlocos);
        if (bError) throw bError;
      }

      // 4. Final fetch to update UI
      const { data: finalWorkouts } = await supabase
        .from("treinos")
        .select("*")
        .eq("user_id", targetUserId)
        .order("ordem_exibicao", { ascending: true })
        .order("letra", { ascending: true });

      setWorkouts(finalWorkouts || []);
    } catch (err) {
      console.error("Erro ao clonar treinos padrão:", err);
      showToast("Não foi possível carregar os treinos padrão.", "error");
    } finally {
      setLoading(false);
    }
  };

  const startTraining = (letra) => {
    navigate(`/treino/${letra}`);
  };

  const recordActivity = async () => {
    setIsRecording(true);
    const { error } = await supabase.from("registro_atividades").insert([
      {
        user_id: authUser.id,
        nome_atividade: atividadeAlt,
        data: new Date().toISOString(),
      },
    ]);
    setIsRecording(false);
    if (error) {
      showToast("Erro ao registrar atividade: " + error.message, "error");
    } else {
      showToast(`${atividadeAlt} registrada com sucesso!`, "success");
      setShowActivityModal(false);
    }
  };

  if (loading) return <LoadingScreen message="Carregando painel..." />;

  // Display Name Priority: public.usuarios (nome) > Email prefix > 'Atleta'
  const displayName = profile?.nome || authUser?.email?.split("@")[0] || "Atleta";
  const atividadeAlt = profile?.atividade_alternativa || "Capoeira";

  return (
    <div
      className="p-6 max-w-md mx-auto min-h-screen flex flex-col"
      style={{ paddingBottom: isPremium ? "80px" : "148px" }}
    >
      <header className="mb-8">
        <div className="flex items-center gap-2.5 mb-6">
          <img src="/logo-app.png" alt="Logo" className="w-10 h-10 object-contain" />
          <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-on-gestao)" }}>
            Treino Físico
          </h2>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-black leading-tight" style={{ color: "var(--text-on-gestao)" }}>
                Olá, {displayName.split(" ")[0]}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Pronto para superar limites?</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-full mb-8">
        <button
          onClick={() => setActiveTab("treinos")}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          style={
            activeTab === "treinos"
              ? {
                  backgroundColor: "white",
                  color: "var(--color-primary)",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                }
              : { color: "#64748b" }
          }
        >
          Treinos
        </button>
        <button
          onClick={() => setActiveTab("evolucao")}
          className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          style={
            activeTab === "evolucao"
              ? {
                  backgroundColor: "white",
                  color: "var(--color-primary)",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                }
              : { color: "#64748b" }
          }
        >
          Evolução
        </button>
      </div>

      {activeTab === "treinos" ? (
        <div className="animate-in fade-in duration-500">
          {savedTraining && (
            <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
              <button
                onClick={() =>
                  navigate(`/treino/${savedTraining.letra}?resume=true`)
                }
                className="w-full p-6 rounded-[32px] shadow-xl flex items-center justify-between group active:scale-95 transition-all"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--text-on-primary)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                    <Play fill="currentColor" size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-lg leading-tight uppercase">
                      Continuar Treino
                    </h4>
                    <p className="text-xs font-bold opacity-70 uppercase tracking-widest">
                      Treino {savedTraining.letra} Interrompido
                    </p>
                  </div>
                </div>
                <ChevronRight className="opacity-50 group-hover:opacity-100" />
              </button>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              Treinos Disponíveis
            </h3>

            <WorkoutCard
              title="Treino Livre"
              subtitle="Iniciar treino em branco"
              icon={<Play size={24} />}
              onClick={() => startTraining("LIVRE")}
              variant="indigo"
            />

            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                title={workout.nome}
                subtitle={workout.subtitulo}
                icon={
                  workout.letra === "A" ? (
                    <Dumbbell />
                  ) : workout.letra === "B" ? (
                    <List />
                  ) : workout.letra === "C" ? (
                    <RotateCcw />
                  ) : (
                    <Bike />
                  )
                }
                onClick={() => startTraining(workout.letra)}
              />
            ))}

            <WorkoutCard
              title={atividadeAlt}
              subtitle="Registrar atividade de hoje"
              icon={<Shield size={24} />}
              onClick={() => setShowActivityModal(true)}
              variant="indigo"
            />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500">
          <BodyEvolution />
        </div>
      )}

      {showActivityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--text-on-primary)",
              }}
            >
              <Shield size={32} />
            </div>
            <h2 className="text-xl font-bold  text-center mb-2">
              Registrar Atividade
            </h2>
            <p className="text-slate-500 text-center text-sm mb-8">
              Deseja registrar a execução de <strong>{atividadeAlt}</strong>{" "}
              hoje no seu histórico?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowActivityModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
              >
                Não
              </button>
              <button
                onClick={recordActivity}
                disabled={isRecording}
                className="flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--text-on-primary)",
                }}
              >
                {isRecording ? (
                  "..."
                ) : (
                  <>
                    <Check size={18} /> Sim
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdBanner isPremium={isPremium} />

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center z-50">
        <Link
          to="/inicio"
          className="flex flex-col items-center gap-1"
          style={{ color: "var(--color-primary-safe)" }}
        >
          <Dumbbell size={24} />
          <span className="text-[10px] font-bold uppercase">Treinos</span>
        </Link>
        <Link
          to="/historico"
          className="text-slate-400 hover:opacity-80 flex flex-col items-center gap-1"
        >
          <HistoryIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </Link>
        <Link
          to="/perfil"
          className="text-slate-400 hover:opacity-80 flex flex-col items-center gap-1"
        >
          <UserIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Perfil</span>
        </Link>
      </nav>
    </div>
  );
};

export default Inicio;
