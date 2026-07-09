import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useToast } from "../context/ToastContext";
import LoadingScreen from "../components/LoadingScreen";
import { calculateSubscriptionStatus } from "../utils/subscriptionUtils";
import {
  ChevronLeft,
  Dumbbell,
  CreditCard,
  TrendingUp,
  Settings,
  AlertTriangle,
  Save,
  Trash2,
  Layers
} from "lucide-react";

const AdminUserDashboard = () => {
  // 1. Hook and Param Shielding
  const params = useParams();
  const userId = params?.userId;
  const navigate = useNavigate();
  const { showToast } = useToast();

  // 2. State Initialization
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("gestao");
  const [transactions, setTransactions] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [stats, setStats] = useState({ totalWorkouts: 0, lastWorkout: null });
  const [tabErrors, setTabErrors] = useState({
    user: false,
    stats: false,
    financeiro: false,
    treinos: false,
    evolucao: false,
  });

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    status_assinatura: "free",
    data_vencimento: "",
    testador_pagamento: false,
  });

  // 3. Defensive Fetch Logic
  const fetchUserData = useCallback(async () => {
    if (!userId) {
      console.error("AdminUserDashboard: userId is missing from URL params");
      setTabErrors(prev => ({ ...prev, user: true }));
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log(`AdminUserDashboard: Initializing fetch for user ${userId}`);

    try {
      // Clear errors on retry
      setTabErrors({ user: false, stats: false, financeiro: false, treinos: false, evolucao: false });

      // Fetch User Base Data
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("AdminUserDashboard: Supabase error fetching user:", userError);
        throw userError;
      }

      setUser(userData || null);
      if (userData) {
        setFormData({
          nome: userData.nome || "",
          email: userData.email || "",
          status_assinatura: userData.status_assinatura || "free",
          data_vencimento: userData.data_vencimento ? userData.data_vencimento.split("T")[0] : "",
          testador_pagamento: userData.testador_pagamento || false,
        });
      }
    } catch (err) {
      console.error("AdminUserDashboard: Critical fetch failure:", err);
      setTabErrors(prev => ({ ...prev, user: true }));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Secondary fetch for stats and tab-specific data
  const fetchExtraData = useCallback(async () => {
    if (!userId || !user) return;

    // Stats
    try {
      const { data: sessaoData, error: sessaoError } = await supabase
        .from("historico_cargas")
        .select("sessao_treino_id")
        .eq("user_id", userId);

      const uniqueSessions = new Set(
        (sessaoData || [])
          .map((s) => s.sessao_treino_id)
          .filter(Boolean)
      ).size;

      const { data: lastW, error: lastError } = await supabase
        .from("historico_cargas")
        .select("data_treino")
        .eq("user_id", userId)
        .order("data_treino", { ascending: false })
        .limit(1);

      if (!sessaoError && !lastError) {
        setStats({
          totalWorkouts: uniqueSessions,
          lastWorkout: lastW?.[0]?.data_treino || null,
        });
      }
    } catch (e) {
      console.warn("Stats fetch failed", e);
    }

    // Tab specific
    if (activeTab === "financeiro") {
      const { data } = await supabase.from("transacoes_financeiras").select("*").eq("usuario_id", userId).order("data_transacao", { ascending: false });
      setTransactions(data || []);
    } else if (activeTab === "treinos") {
      const { data: blocksTemplate } = await supabase
        .from("blocos_treino")
        .select("exercicio_id, numero_bloco, letra_treino")
        .eq("user_id", userId);
      const { data: history } = await supabase
        .from("historico_cargas")
        .select("*, exercicios(nome)")
        .eq("user_id", userId)
        .order("data_treino", { ascending: false });

      if (history && history.length > 0) {
        // Grouping Algorithm Shielding - Now using sessao_treino_id as primary key
        const sessions = (history || []).reduce((acc, curr) => {
          try {
            const date = new Date(curr.data_treino);
            const dateStr = date.toLocaleDateString("pt-BR");
            const timeStr = date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Fallback key if sessao_treino_id is missing (legacy data)
            const key =
              curr.sessao_treino_id ||
              `${curr.letra_treino || "?"}_${dateStr}_${timeStr}`;

            if (!acc[key]) {
              acc[key] = {
                id: key,
                letra: curr.letra_treino,
                data: curr.data_treino,
                displayDate: dateStr,
                time: timeStr,
                blocks: {},
              };
            }

            const templateMatch = (blocksTemplate || []).find(
              (t) =>
                t.exercicio_id === curr.exercicio_id &&
                t.letra_treino === curr.letra_treino
            );
            const blockNum = templateMatch?.numero_bloco || 999;

            if (!acc[key].blocks[blockNum]) {
              acc[key].blocks[blockNum] = { numero: blockNum, items: [] };
            }
            acc[key].blocks[blockNum].items.push(curr);
          } catch (e) {
            console.error("Grouping error for item", curr.id, e);
          }
          return acc;
        }, {});

        setWorkoutHistory(
          Object.values(sessions).map((s) => ({
            ...s,
            blocks: Object.values(s.blocks || {}).sort(
              (a, b) => a.numero - b.numero
            ),
          }))
        );
      } else {
        setWorkoutHistory([]);
      }
    } else if (activeTab === "evolucao") {
      const { data } = await supabase.from("historico_medidas").select("*, tipos_medida(nome, unidade)").eq("user_id", userId).order("data_medida", { ascending: false });
      setMeasurements(data || []);
    }
  }, [userId, user?.id, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUserData(), 0);
    return () => clearTimeout(timer);
  }, [fetchUserData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExtraData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchExtraData]);

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from("usuarios").update({
        nome: formData.nome,
        status_assinatura: formData.status_assinatura,
        data_vencimento: formData.data_vencimento || null,
        testador_pagamento: formData.testador_pagamento,
      }).eq("id", userId);
      if (error) throw error;
      showToast("Perfil atualizado!", "success");
      fetchUserData(); // Refresh data
    } catch (error) { showToast("Erro ao salvar: " + error.message, "error"); }
  };

  const markExclusionPending = async (id) => {
    try {
      const { error } = await supabase.from("historico_cargas").update({ exclusao_pendente: true }).eq("id", id);
      if (error) throw error;
      showToast("Solicitação enviada", "info");
      setWorkoutHistory(prev => prev.map(session => ({
        ...session,
        blocks: session.blocks?.map(block => ({
          ...block,
          items: block.items?.map(item => item.id === id ? { ...item, exclusao_pendente: true } : item)
        }))
      })));
    } catch (error) { showToast("Erro: " + error.message, "error"); }
  };

  const updateWorkoutRecord = async (item, field, val) => {
    try {
      setWorkoutHistory(prev => prev.map(session => ({
        ...session,
        blocks: session.blocks?.map(block => ({
          ...block,
          items: block.items?.map(h => h.id === item.id ? { ...h, [field]: val } : h)
        }))
      })));
      const { error } = await supabase.from("historico_cargas").update({ [field]: val }).eq("id", item.id);
      if (error) throw error;
    } catch (error) { showToast("Erro ao salvar: " + error.message, "error"); }
  };

  const updateSeriesValue = async (item, type, sIdx, val, part = "all") => {
    const updatedFields = {};
    if (type === "load") {
      const arr = [...(item.carga || [])];
      arr[sIdx] = val === "" ? null : parseFloat(val);
      updatedFields.carga = arr;
    } else if (type === "reps") {
      const arr = [...(item.repeticoes || [])];
      arr[sIdx] = val === "" ? null : parseInt(val);
      updatedFields.repeticoes = arr;
    } else if (type === "exec") {
      const arr = [...(item.tempo_execucao_segundos || [])];
      const currentVal = arr[sIdx] || 0;
      const mins = Math.floor(currentVal / 60);
      const secs = currentVal % 60;
      if (part === "mins") arr[sIdx] = (parseInt(val) || 0) * 60 + secs;
      else if (part === "secs") arr[sIdx] = mins * 60 + (parseInt(val) || 0);
      updatedFields.tempo_execucao_segundos = arr;
    }

    try {
      setWorkoutHistory(prev => prev.map(session => ({
        ...session,
        blocks: session.blocks?.map(block => ({
          ...block,
          items: block.items?.map(h => h.id === item.id ? { ...h, ...updatedFields } : h)
        }))
      })));
      const { error } = await supabase.from("historico_cargas").update(updatedFields).eq("id", item.id);
      if (error) throw error;
    } catch (error) { showToast("Erro ao salvar: " + error.message, "error"); }
  };

  // 4. Render Shields
  const subStatus = useMemo(() => {
    return calculateSubscriptionStatus(user?.status_assinatura, user?.data_vencimento);
  }, [user?.status_assinatura, user?.data_vencimento]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-bold mb-2">Erro de Navegação</h2>
          <p className="text-sm text-slate-500 mb-6">ID de usuário inválido.</p>
          <button onClick={() => navigate("/admin")} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold">Voltar</button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingScreen message="Sincronizando Dashboard..." />;

  if (tabErrors.user || !user) return <div className="p-10"><ErrorFallback /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/admin")} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition"><ChevronLeft size={20} /></button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate leading-tight">{user?.nome || "Sem Nome"}</h1>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                subStatus.status === "Premium" ? "bg-emerald-100 text-emerald-600" :
                subStatus.status === "Em Atraso" ? "bg-amber-100 text-amber-600" :
                "bg-slate-100 text-slate-500"
              }`}>{subStatus.status}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Treinos" value={stats.totalWorkouts} />
            <StatCard label="Último" value={stats.lastWorkout ? new Date(stats.lastWorkout).toLocaleDateString('pt-BR') : '-'} />
            <StatCard label="Membro" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'} />
          </div>
        </div>
      </header>

      <nav className="p-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 max-w-4xl mx-auto">
          <TabButton active={activeTab === "gestao"} onClick={() => setActiveTab("gestao")} icon={<Settings size={14}/>} label="Gestão" />
          <TabButton active={activeTab === "treinos"} onClick={() => setActiveTab("treinos")} icon={<Dumbbell size={14}/>} label="Treinos" />
          <TabButton active={activeTab === "financeiro"} onClick={() => setActiveTab("financeiro")} icon={<CreditCard size={14}/>} label="Financeiro" />
          <TabButton active={activeTab === "evolucao"} onClick={() => setActiveTab("evolucao")} icon={<TrendingUp size={14}/>} label="Evolução" />
        </div>
      </nav>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        {activeTab === "gestao" && (
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome</label>
              <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500/20"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status</label>
                <select value={formData.status_assinatura} onChange={e => setFormData({...formData, status_assinatura: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none">
                  <option value="free">Free</option><option value="premium">Premium</option><option value="grace_period">Grace Period</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Vencimento</label>
                <input type="date" value={formData.data_vencimento} onChange={e => setFormData({...formData, data_vencimento: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none"/>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-500">Testador de Pagamentos</span>
                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tight">Habilita botões Sandbox MP no Perfil</span>
              </div>
              <button
                onClick={() => setFormData({...formData, testador_pagamento: !formData.testador_pagamento})}
                className={`w-10 h-5 rounded-full transition-all duration-300 flex items-center px-1 ${formData.testador_pagamento ? "bg-orange-500 justify-end" : "bg-slate-300 justify-start"}`}
              >
                <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
              </button>
            </div>

            {user?.solicitou_exclusao && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                <div><p className="text-xs font-bold text-red-600">Exclusão Solicitada</p><p className="text-[10px] text-red-500">Usuário solicitou encerramento via App.</p></div>
              </div>
            )}
            <button onClick={handleSaveProfile} className="w-full py-3 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={16} /> Salvar Alterações</button>
          </section>
        )}

        {activeTab === "treinos" && (
          <div className="space-y-4">
            {workoutHistory.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-slate-100"><p className="text-sm font-bold text-slate-400">Sem treinos</p></div>
            ) : (
              workoutHistory.map(session => (
                <div key={session.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-2 bg-slate-900 text-white flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span>Treino {session.letra}</span><span>{session.displayDate} às {session.time}</span>
                  </div>
                  <div className="p-3 space-y-4">
                    {session.blocks?.map(block => (
                      <div key={block.numero} className="space-y-2">
                        <div className="flex items-center gap-2 px-1 text-[8px] font-black uppercase text-slate-400 tracking-widest">
                          <Layers size={10} className="text-orange-500" /> {block.items?.length > 1 ? `Conjugado ${block.numero}` : `Bloco ${block.numero}`}
                        </div>
                        {block.items?.map(item => (
                          <div key={item.id} className="pl-2 border-l-2 border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs font-bold text-slate-800">{item.exercicios?.nome}</p>
                              <div className="flex items-center gap-2">
                                <input type="number" value={item.series_executadas || 0} onChange={e => updateWorkoutRecord(item, 'series_executadas', parseInt(e.target.value))} className="w-8 text-[10px] font-bold bg-slate-50 border-none p-0 text-center focus:ring-0"/>
                                <button onClick={() => markExclusionPending(item.id)} className={`p-1.5 rounded-lg ${item.exclusao_pendente ? 'text-amber-500' : 'text-slate-200 hover:text-red-500'}`} disabled={item.exclusao_pendente}><Trash2 size={12} /></button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {Array.from({ length: item.series_executadas || 0 }).map((_, i) => (
                                <div key={i} className="bg-slate-50 rounded-lg p-1 text-center border border-slate-100">
                                  <span className="text-[6px] font-black text-slate-300 block">S{i+1}</span>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <div className="flex items-center justify-center text-[9px] font-black"><input type="number" value={item.carga?.[i] || 0} onChange={e => updateSeriesValue(item, 'load', i, e.target.value)} className="bg-transparent w-6 text-center outline-none"/><span className="text-[6px] opacity-40">kg</span></div>
                                    <div className="flex items-center justify-center text-[9px] font-bold text-orange-500"><input type="number" value={item.repeticoes?.[i] || 0} onChange={e => updateSeriesValue(item, 'reps', i, e.target.value)} className="bg-transparent w-6 text-center outline-none"/><span className="text-[6px] opacity-40">r</span></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "financeiro" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead className="bg-slate-50 border-b border-slate-100"><tr className="text-slate-400 font-black uppercase">
                <th className="px-3 py-2">Data</th><th className="px-3 py-2">Ref</th><th className="px-3 py-2 text-right">Valor</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">{transactions.map(t => (
                <tr key={t.id} className="font-medium">
                  <td className="px-3 py-2 text-slate-400">{new Date(t.data_transacao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-2">{t.descricao}</td>
                  <td className={`px-3 py-2 text-right font-bold ${t.tipo === "receita" ? "text-emerald-500" : "text-red-500"}`}>{t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toFixed(2)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {activeTab === "evolucao" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead className="bg-slate-50 border-b border-slate-100"><tr className="text-slate-400 font-black uppercase">
                <th className="px-3 py-2">Data</th><th className="px-3 py-2">Medida</th><th className="px-3 py-2 text-right">Valor</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">{measurements.map(m => (
                <tr key={m.id} className="font-medium">
                  <td className="px-3 py-2 text-slate-400">{new Date(m.data_medida).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-2">{m.tipos_medida?.nome}</td>
                  <td className="px-3 py-2 text-right font-bold text-blue-600">{m.valor} {m.tipos_medida?.unidade}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

const ErrorFallback = () => (
  <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
    <AlertTriangle className="mx-auto text-amber-500 mb-2" size={24} />
    <p className="text-sm font-bold text-slate-600">Acesso Restrito</p>
    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Dados protegidos pelo backend</p>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
    <span className="text-[7px] font-black uppercase text-slate-400 mb-0.5">{label}</span>
    <span className="text-[10px] font-bold text-slate-800">{value}</span>
  </div>
);

const TabButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
    active ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-white text-slate-400 border border-slate-200"
  }`}>{icon}{label}</button>
);

export default AdminUserDashboard;
