import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { calculateSubscriptionStatus } from "../utils/subscriptionUtils";
import {
  ChevronLeft,
  Dumbbell,
  LayoutGrid,
  Settings,
  Users,
  CreditCard,
  Sparkles,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  X,
  AlertTriangle,
  Loader2,
  Save,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import ExerciseManager from "../components/ExerciseManager";
import BlockConfigurator from "../components/BlockConfigurator";
import WorkoutManager from "../components/WorkoutManager";
import LoadingScreen from "../components/LoadingScreen";

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("onboarding");
  const [appSettings, setAppSettings] = useState({ subscription_price: 29.90 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [subTab, setSubTab] = useState("workouts");
  // moldeUserId set to null represents global templates (where user_id is NULL)
  const [moldeUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "receita",
    valor: "",
    descricao: "",
    data_transacao: new Date().toISOString().split("T")[0],
  });

  const fetchUsersData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("usuarios")
        .select("*")
        .order("nome");

      if (usersError) throw usersError;

      // Fetch session counts from historico_cargas - Strictly using user_id and sessao_treino_id
      const { data: sessionData, error: sessionError } = await supabase
        .from("historico_cargas")
        .select("user_id, sessao_treino_id")
        .not("user_id", "is", null);

      if (sessionError) throw sessionError;

      const sessionCounts = (sessionData || []).reduce((acc, curr) => {
        if (!curr.sessao_treino_id) return acc;
        const uid = curr.user_id;
        if (!acc[uid]) acc[uid] = new Set();
        acc[uid].add(curr.sessao_treino_id);
        return acc;
      }, {});

      const usersWithCounts = (usersData || []).map((u) => ({
        ...u,
        real_workout_count: sessionCounts[u.id]?.size || 0,
      }));
      setUsers(usersWithCounts);
    } catch (err) {
      console.error("Admin: Error fetching users data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transacoes_financeiras")
        .select("*")
        .order("data_transacao", { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Admin: Error fetching billing data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAppSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("config_app")
        .select("*")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setAppSettings(data);
    } catch (err) {
      console.error("Admin: Error fetching app settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "users") {
        fetchUsersData();
      } else if (activeTab === "billing") {
        fetchBillingData();
      } else if (activeTab === "settings") {
        fetchAppSettings();
      } else {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, fetchUsersData, fetchBillingData, fetchAppSettings]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.nome?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
    );
  }, [users, userSearch]);

  const getUserStatus = useCallback((user) => {
    return calculateSubscriptionStatus(user.status_assinatura, user.data_vencimento).status;
  }, []);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("transacoes_financeiras").insert([
        {
          ...formData,
          valor: parseFloat(formData.valor),
        },
      ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        tipo: "receita",
        valor: "",
        descricao: "",
        data_transacao: new Date().toISOString().split("T")[0],
      });
      fetchBillingData();
    } catch (err) {
      console.error("Error adding transaction:", err);
    }
  };

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.tipo === "receita") acc.receitas += t.valor;
        else acc.custos += t.valor;
        acc.saldo = acc.receitas - acc.custos;
        return acc;
      },
      { receitas: 0, custos: 0, saldo: 0 }
    );
  }, [transactions]);

  if (loading && activeTab === "onboarding")
    return <LoadingScreen message="Carregando Admin..." />;

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("config_app")
        .upsert({ id: appSettings.id || 1, subscription_price: parseFloat(appSettings.subscription_price) });

      if (error) throw error;
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-3 max-w-6xl mx-auto text-sm">
      <header className="mb-3">
        <Link
          to="/inicio"
          className="text-slate-500 flex items-center gap-1 mb-1 hover: transition w-fit text-xs"
        >
          <ChevronLeft size={14} /> Voltar
        </Link>
        <h1 className="text-lg font-bold tracking-tight">
          Painel Administrativo
        </h1>
      </header>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        <TabButton
          active={activeTab === "onboarding"}
          onClick={() => setActiveTab("onboarding")}
          icon={<Sparkles size={14} />}
          label="Onboarding"
        />
        <TabButton
          active={activeTab === "users"}
          onClick={() => setActiveTab("users")}
          icon={<Users size={14} />}
          label="Usuários"
        />
        <TabButton
          active={activeTab === "billing"}
          onClick={() => setActiveTab("billing")}
          icon={<CreditCard size={14} />}
          label="Financeiro"
        />
        <TabButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          icon={<Settings size={14} />}
          label="Configurações"
        />
      </div>

      <main className="animate-in fade-in duration-500">
        {activeTab === "onboarding" && (
          <div className="space-y-4">
            <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg w-fit mb-4">
              <button
                onClick={() => setSubTab("workouts")}
                className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all"
                style={
                  subTab === "workouts"
                    ? {
                        backgroundColor: "white",
                        color: "var(--color-primary)",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }
                    : { color: "#64748b" }
                }
              >
                Treinos Padrão
              </button>
              <button
                onClick={() => setSubTab("blocks")}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                style={
                  subTab === "blocks"
                    ? {
                        backgroundColor: "white",
                        color: "var(--color-primary)",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }
                    : { color: "#64748b" }
                }
              >
                Blocos Padrão
              </button>
              <button
                onClick={() => setSubTab("exercises")}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                style={
                  subTab === "exercises"
                    ? {
                        backgroundColor: "white",
                        color: "var(--color-primary)",
                        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      }
                    : { color: "#64748b" }
                }
              >
                Exercícios Globais
              </button>
            </div>

            {subTab === "workouts" && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="mb-3">
                  <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-1">
                    <LayoutGrid
                      style={{ color: "var(--color-primary)" }}
                      size={18}
                    />{" "}
                    Treinos Padrão
                  </h2>
                </div>
                <WorkoutManager overrideUserId={moldeUserId} isCompact={true} />
              </section>
            )}

            {subTab === "exercises" && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="mb-3">
                  <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-1">
                    <Dumbbell
                      style={{ color: "var(--color-primary)" }}
                      size={18}
                    />{" "}
                    Exercícios Globais
                  </h2>
                </div>
                <ExerciseManager targetTable="exercicios_padrao" isCompact={true} />
              </section>
            )}

            {subTab === "blocks" && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="mb-3">
                  <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-1">
                    <Settings
                      style={{ color: "var(--color-primary)" }}
                      size={18}
                    />{" "}
                    Estrutura de Blocos
                  </h2>
                </div>
                <BlockConfigurator overrideUserId={moldeUserId} isCompact={true} />
              </section>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-3 animate-in fade-in duration-500">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Buscar usuário..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm text-xs"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400">
                        Usuário
                      </th>
                      <th className="px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400">
                        Engajamento
                      </th>
                      <th className="px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400">
                        Financeiro
                      </th>
                      <th className="px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400 text-right">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((user) => {
                      const status = getUserStatus(user);
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-1">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-slate-900 text-sm">
                                {user.nome || "Sem Nome"}
                              </span>
                              {user.solicitou_exclusao && (
                                <AlertTriangle size={14} className="text-red-500" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight">
                              {user.email}
                            </div>
                          </td>
                          <td className="px-3 py-1">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`w-fit px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tight ${
                                  status === "Premium"
                                    ? "bg-emerald-100 text-emerald-600"
                                    : status === "Em Atraso"
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {status}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                Treinos: {user.real_workout_count || 0}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-1 text-[10px] text-slate-500">
                            {status === "Premium" || status === "Em Atraso" ? (
                              <div className="flex flex-col">
                                <span>Vence:</span>
                                <span className="font-medium">
                                  {user.data_vencimento
                                    ? new Date(user.data_vencimento).toLocaleDateString("pt-BR")
                                    : "-"}
                                </span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-1 text-right">
                            <button
                              onClick={() => navigate(`/admin/user/${user.id}`)}
                              className="p-1 text-slate-400 hover:text-orange-500 transition-colors"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-2 mb-4">
                <Settings style={{ color: "var(--color-primary)" }} size={18} />
                Parâmetros do Sistema
              </h2>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-sm">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-tight text-slate-400 block mb-1">
                    Valor da Assinatura (Mensal)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={appSettings.subscription_price}
                      onChange={(e) => setAppSettings({ ...appSettings, subscription_price: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase tracking-tight shadow-md shadow-orange-500/20 active:scale-95 transition-all text-xs flex items-center gap-2"
                >
                  {savingSettings ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Salvar Alterações
                </button>
              </form>
            </section>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-3 animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1 text-emerald-500 mb-0.5">
                  <TrendingUp size={12} />
                  <span className="text-[8px] font-black uppercase tracking-tight">
                    Receitas
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 leading-tight">
                  R$ {totals.receitas.toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1 text-red-500 mb-0.5">
                  <TrendingDown size={12} />
                  <span className="text-[8px] font-black uppercase tracking-tight">
                    Custos
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 leading-tight">
                  R$ {totals.custos.toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-1 text-blue-500 mb-0.5">
                  <Wallet size={12} />
                  <span className="text-[8px] font-black uppercase tracking-tight">
                    Saldo
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 leading-tight">
                  R$ {totals.saldo.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-black uppercase tracking-tight text-slate-400">
                Histórico
              </h3>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                <Plus size={12} /> Novo
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400">
                        Data
                      </th>
                      <th className="px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400">
                        Descrição
                      </th>
                      <th className="px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400 text-right">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-1.5 text-[10px] text-slate-400">
                          {new Date(t.data_transacao).toLocaleDateString(
                            "pt-BR"
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="font-bold text-slate-900 text-xs">
                            {t.descricao}
                          </div>
                          <div className="text-[8px] font-black uppercase tracking-tight opacity-40">
                            {t.tipo}
                          </div>
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-bold text-xs ${
                            t.tipo === "receita"
                              ? "text-emerald-500"
                              : "text-red-500"
                          }`}
                        >
                          {t.tipo === "receita" ? "+" : "-"} R${" "}
                          {t.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-bold text-slate-900 mb-4">
              Novo Registro
            </h2>

            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div>
                <label className="text-[8px] font-black uppercase tracking-tight text-slate-400 block mb-1">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: "receita" })}
                    className={`py-1 rounded text-[8px] font-black uppercase tracking-tight transition-all ${
                      formData.tipo === "receita"
                        ? "bg-white text-emerald-500 shadow-sm"
                        : "text-slate-400"
                    }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: "despesa" })}
                    className={`py-1 rounded text-[8px] font-black uppercase tracking-tight transition-all ${
                      formData.tipo === "despesa"
                        ? "bg-white text-red-500 shadow-sm"
                        : "text-slate-400"
                    }`}
                  >
                    Despesa
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black uppercase tracking-tight text-slate-400 block mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black uppercase tracking-tight text-slate-400 block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor}
                    onChange={(e) =>
                      setFormData({ ...formData, valor: e.target.value })
                    }
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase tracking-tight text-slate-400 block mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_transacao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        data_transacao: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-orange-500 text-white rounded-xl font-black uppercase tracking-tight shadow-md shadow-orange-500/20 active:scale-95 transition-all text-xs"
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
      active ? "shadow-md" : "bg-white text-slate-500 border border-slate-200"
    }`}
    style={
      active
        ? {
            backgroundColor: "var(--color-primary)",
            color: "var(--text-on-primary)",
          }
        : {}
    }
  >
    {icon}
    {label}
  </button>
);

export default Admin;
