import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { supabase } from "../supabaseClient";
import ExerciseManager from "../components/ExerciseManager";
import BlockConfigurator from "../components/BlockConfigurator";
import WorkoutManager from "../components/WorkoutManager";
import LoadingScreen from "../components/LoadingScreen";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("onboarding");
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (activeTab === "users") {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("nome");
      if (!error) setUsers(data);
    } else if (activeTab === "billing") {
      const { data, error } = await supabase
        .from("transacoes_financeiras")
        .select("*")
        .order("data_transacao", { ascending: false });
      if (!error) setTransactions(data);
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const filteredUsers = users.filter(
    (u) =>
      u.nome?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const getUserStatus = (user) => {
    return calculateSubscriptionStatus(user.status_assinatura, user.data_vencimento).status;
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("transacoes_financeiras").insert([
      {
        ...formData,
        valor: parseFloat(formData.valor),
      },
    ]);

    if (!error) {
      setIsModalOpen(false);
      setFormData({
        tipo: "receita",
        valor: "",
        descricao: "",
        data_transacao: new Date().toISOString().split("T")[0],
      });
      fetchData();
    }
  };

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.tipo === "receita") acc.receitas += t.valor;
      else acc.custos += t.valor;
      acc.saldo = acc.receitas - acc.custos;
      return acc;
    },
    { receitas: 0, custos: 0, saldo: 0 }
  );

  if (loading && activeTab === "onboarding")
    return <LoadingScreen message="Carregando Admin..." />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-8">
        <Link
          to="/inicio"
          className="text-slate-500 flex items-center gap-1 mb-4 hover: transition w-fit"
        >
          <ChevronLeft size={20} /> Voltar para Início
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Painel Administrativo
        </h1>
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <TabButton
          active={activeTab === "onboarding"}
          onClick={() => setActiveTab("onboarding")}
          icon={<Sparkles size={16} />}
          label="Onboarding"
        />
        <TabButton
          active={activeTab === "users"}
          onClick={() => setActiveTab("users")}
          icon={<Users size={16} />}
          label="Usuários"
        />
        <TabButton
          active={activeTab === "billing"}
          onClick={() => setActiveTab("billing")}
          icon={<CreditCard size={16} />}
          label="Financeiro"
        />
      </div>

      <main className="animate-in fade-in duration-500">
        {activeTab === "onboarding" && (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit mb-8">
              <button
                onClick={() => setSubTab("workouts")}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
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
                <div className="mb-6">
                  <h2 className="text-xl font-black  uppercase tracking-widest flex items-center gap-2">
                    <LayoutGrid
                      style={{ color: "var(--color-primary)" }}
                      size={24}
                    />{" "}
                    Categorias de Treino Padrão
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Defina os treinos que serão copiados para novos usuários.
                  </p>
                </div>
                <WorkoutManager overrideUserId={moldeUserId} />
              </section>
            )}

            {subTab === "exercises" && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6">
                  <h2 className="text-xl font-black  uppercase tracking-widest flex items-center gap-2">
                    <Dumbbell
                      style={{ color: "var(--color-primary)" }}
                      size={24}
                    />{" "}
                    Catálogo de Exercícios Padrão
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Biblioteca Global de exercícios disponíveis para todos os
                    usuários.
                  </p>
                </div>
                <ExerciseManager targetTable="exercicios_padrao" />
              </section>
            )}

            {subTab === "blocks" && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6">
                  <h2 className="text-xl font-black  uppercase tracking-widest flex items-center gap-2">
                    <Settings
                      style={{ color: "var(--color-primary)" }}
                      size={24}
                    />{" "}
                    Estrutura de Blocos (Molde)
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Configure as séries e repetições padrão.
                  </p>
                </div>
                <BlockConfigurator overrideUserId={moldeUserId} />
              </section>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar usuário por nome ou email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-bottom border-slate-100">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                        Usuário
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((user) => {
                      const status = getUserStatus(user);
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">
                              {user.nome || "Sem Nome"}
                            </div>
                            <div className="text-sm text-slate-500">
                              {user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                status === "Premium"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : status === "Em Atraso"
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-orange-500 transition-colors">
                              <ArrowRight size={20} />
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

        {activeTab === "billing" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                  <TrendingUp size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Receitas
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  R$ {totals.receitas.toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-red-500 mb-1">
                  <TrendingDown size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Custos
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  R$ {totals.custos.toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 text-blue-500 mb-1">
                  <Wallet size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Saldo
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  R$ {totals.saldo.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
                Histórico de Transações
              </h3>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                <Plus size={16} /> Novo Registro
              </button>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-bottom border-slate-100">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                        Data
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">
                        Descrição
                      </th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-right">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(t.data_transacao).toLocaleDateString(
                            "pt-BR"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">
                            {t.descricao}
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                            {t.tipo}
                          </div>
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-bold ${
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-6">
              Novo Registro
            </h2>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: "receita" })}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-4 bg-orange-500 text-white rounded-[24px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                Salvar Registro
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
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
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
