import { useState, useEffect, useCallback } from "react";
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
  Clock,
  MessageSquare,
  Layers
} from "lucide-react";

const AdminUserDashboard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
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
  });

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setTabErrors({
      user: false,
      stats: false,
      financeiro: false,
      treinos: false,
      evolucao: false,
    });

    // 1. Fetch User Base Data
    try {
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      setUser(userData);
      setFormData({
        nome: userData.nome || "",
        email: userData.email || "",
        status_assinatura: userData.status_assinatura || "free",
        data_vencimento: userData.data_vencimento ? userData.data_vencimento.split("T")[0] : "",
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      setTabErrors(prev => ({ ...prev, user: true }));
    }

    // 2. Fetch Stats
    try {
      const { count, error: countError } = await supabase
        .from("historico_cargas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) throw countError;

      const { data: lastW, error: lastError } = await supabase
        .from("historico_cargas")
        .select("data_treino")
        .eq("user_id", userId)
        .order("data_treino", { ascending: false })
        .limit(1);

      if (lastError) throw lastError;

      setStats({
        totalWorkouts: count || 0,
        lastWorkout: lastW?.[0]?.data_treino || null,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      setTabErrors(prev => ({ ...prev, stats: true }));
    }

    // 3. Tab-specific data
    if (activeTab === "financeiro") {
      try {
        const { data: trans, error: transError } = await supabase
          .from("transacoes_financeiras")
          .select("*")
          .eq("usuario_id", userId)
          .order("data_transacao", { ascending: false });
        if (transError) throw transError;
        setTransactions(trans || []);
      } catch (error) {
        console.error("Error fetching financeiro:", error);
        setTabErrors(prev => ({ ...prev, financeiro: true }));
      }
    } else if (activeTab === "treinos") {
      try {
        // Fetch blocks template for reference
        const { data: blocksTemplate } = await supabase
          .from("blocos_treino")
          .select("exercicio_id, numero_bloco, letra_treino")
          .eq("user_id", userId);

        const { data: history, error: historyError } = await supabase
          .from("historico_cargas")
          .select("*, exercicios(nome)")
          .eq("user_id", userId)
          .order("data_treino", { ascending: false });
        if (historyError) throw historyError;

        // Group by Session (letra_treino + data_treino rounded to minute)
        const sessions = (history || []).reduce((acc, curr) => {
          const date = new Date(curr.data_treino);
          const dateStr = date.toLocaleDateString('pt-BR');
          const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const key = `${curr.letra_treino}_${dateStr}_${timeStr}`;

          if (!acc[key]) {
            acc[key] = {
              id: key,
              letra: curr.letra_treino,
              data: curr.data_treino,
              displayDate: dateStr,
              time: timeStr,
              blocks: {}
            };
          }

          // Find block number for this exercise in this workout letter
          const templateMatch = (blocksTemplate || []).find(
            t => t.exercicio_id === curr.exercicio_id && t.letra_treino === curr.letra_treino
          );
          const blockNum = templateMatch?.numero_bloco || 999; // 999 for miscellaneous

          if (!acc[key].blocks[blockNum]) {
            acc[key].blocks[blockNum] = {
              numero: blockNum,
              items: []
            };
          }
          acc[key].blocks[blockNum].items.push(curr);
          return acc;
        }, {});

        // Convert sessions object to array and blocks object to sorted array
        const sessionsArray = Object.values(sessions).map(session => ({
          ...session,
          blocks: Object.values(session.blocks).sort((a, b) => a.numero - b.numero)
        }));

        setWorkoutHistory(sessionsArray);
      } catch (error) {
        console.error("Error fetching treinos:", error);
        setTabErrors(prev => ({ ...prev, treinos: true }));
      }
    } else if (activeTab === "evolucao") {
      try {
        const { data: meas, error: measError } = await supabase
          .from("historico_medidas")
          .select("*, tipos_medida(nome, unidade)")
          .eq("user_id", userId)
          .order("data_medida", { ascending: false });
        if (measError) throw measError;
        setMeasurements(meas || []);
      } catch (error) {
        console.error("Error fetching evolucao:", error);
        setTabErrors(prev => ({ ...prev, evolucao: true }));
      }
    }

    setLoading(false);
  }, [userId, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUserData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUserData]);

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          nome: formData.nome,
          status_assinatura: formData.status_assinatura,
          data_vencimento: formData.data_vencimento || null,
        })
        .eq("id", userId);

      if (error) throw error;
      showToast("Perfil atualizado!", "success");
    } catch (error) {
      showToast("Erro ao salvar: " + error.message, "error");
    }
  };

  const markExclusionPending = async (id) => {
    try {
      const { error } = await supabase
        .from("historico_cargas")
        .update({ exclusao_pendente: true })
        .eq("id", id);

      if (error) throw error;
      showToast("Solicitação de exclusão enviada para aprovação do usuário", "info");

      setWorkoutHistory(prev => prev.map(session => ({
        ...session,
        blocks: session.blocks.map(block => ({
          ...block,
          items: block.items.map(item => item.id === id ? { ...item, exclusao_pendente: true } : item)
        }))
      })));
    } catch (error) {
      showToast("Erro: " + error.message, "error");
    }
  };

  const updateWorkoutRecord = async (item, field, val) => {
    try {
      setWorkoutHistory(prev => prev.map(session => ({
        ...session,
        blocks: session.blocks.map(block => ({
          ...block,
          items: block.items.map(h => h.id === item.id ? { ...h, [field]: val } : h)
        }))
      })));

      const { error } = await supabase
        .from("historico_cargas")
        .update({ [field]: val })
        .eq("id", item.id);
      if (error) throw error;
    } catch (error) {
      showToast("Erro ao salvar: " + error.message, "error");
    }
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
      if (part === "mins") {
        arr[sIdx] = (parseInt(val) || 0) * 60 + secs;
      } else if (part === "secs") {
        arr[sIdx] = mins * 60 + (parseInt(val) || 0);
      }
      updatedFields.tempo_execucao_segundos = arr;
    }

    try {
      setWorkoutHistory(prev => prev.map(session => ({
        ...session,
        blocks: session.blocks.map(block => ({
          ...block,
          items: block.items.map(h => h.id === item.id ? { ...h, ...updatedFields } : h)
        }))
      })));

      const { error } = await supabase
        .from("historico_cargas")
        .update(updatedFields)
        .eq("id", item.id);
      if (error) throw error;
    } catch (error) {
      showToast("Erro ao salvar: " + error.message, "error");
    }
  };

  if (loading && !user) return <LoadingScreen message="Carregando Dashboard..." />;

  const subStatus = calculateSubscriptionStatus(user?.status_assinatura, user?.data_vencimento);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Fixed Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate("/admin")} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition">
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate leading-tight">
                {tabErrors.user ? "Usuário Indisponível" : (user?.nome || "Carregando...")}
              </h1>
              <p className="text-xs text-slate-500 truncate">{tabErrors.user ? "Dados protegidos ou erro na consulta" : user?.email}</p>
            </div>
            {!tabErrors.user && (
              <div className="flex flex-col items-end">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                  subStatus.status === "Premium" ? "bg-emerald-100 text-emerald-600" :
                  subStatus.status === "Em Atraso" ? "bg-amber-100 text-amber-600" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {subStatus.status}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Total Treinos" value={tabErrors.stats ? "!" : stats.totalWorkouts} />
            <StatCard
              label="Último Treino"
              value={tabErrors.stats ? "Erro" : (stats.lastWorkout ? new Date(stats.lastWorkout).toLocaleDateString('pt-BR') : '-')}
            />
            <StatCard label="Início" value={tabErrors.user ? "Erro" : (user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-')} />
          </div>
        </div>
      </header>

      {/* Navigation Pills */}
      <nav className="p-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 max-w-4xl mx-auto">
          <TabButton active={activeTab === "gestao"} onClick={() => setActiveTab("gestao")} icon={<Settings size={14}/>} label="Gestão" />
          <TabButton active={activeTab === "treinos"} onClick={() => setActiveTab("treinos")} icon={<Dumbbell size={14}/>} label="Treinos" />
          <TabButton active={activeTab === "financeiro"} onClick={() => setActiveTab("financeiro")} icon={<CreditCard size={14}/>} label="Financeiro" />
          <TabButton active={activeTab === "evolucao"} onClick={() => setActiveTab("evolucao")} icon={<TrendingUp size={14}/>} label="Evolução" />
          <TabButton active={activeTab === "suporte"} onClick={() => setActiveTab("suporte")} icon={<MessageSquare size={14}/>} label="Suporte" />
        </div>
      </nav>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        {activeTab === "gestao" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {tabErrors.user ? (
               <ErrorFallback />
            ) : (
            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
               <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status</label>
                  <select
                    value={formData.status_assinatura}
                    onChange={e => setFormData({...formData, status_assinatura: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="grace_period">Grace Period</option>
                  </select>
                 </div>
                 <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none"
                  />
                 </div>
               </div>

               {user?.solicitou_exclusao && (
                 <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                    <div>
                      <p className="text-xs font-bold text-red-600">Solicitação de Exclusão Ativa</p>
                      <p className="text-[10px] text-red-500">O usuário solicitou o encerramento da conta via aplicativo.</p>
                    </div>
                 </div>
               )}

               <button
                onClick={handleSaveProfile}
                className="w-full py-3 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
               >
                 <Save size={16} /> Salvar Alterações
               </button>
            </section>
            )}
          </div>
        )}

        {activeTab === "treinos" && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
             {tabErrors.treinos ? (
               <ErrorFallback />
             ) : (
               <>
             {workoutHistory.map((session) => (
               <div key={session.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="px-4 py-2 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <span className="font-black text-sm uppercase">Treino {session.letra}</span>
                       <span className="text-[8px] opacity-60 font-bold uppercase">{session.displayDate} às {session.time}</span>
                    </div>
                 </div>
                 <div className="p-3 space-y-6">
                    {session.blocks.map((block) => (
                      <div key={block.numero} className="space-y-3">
                         <div className="flex items-center gap-2 px-1">
                            <Layers size={12} className="text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                               {block.items.length > 1 ? `Conjugado ${block.numero}` : `Bloco ${block.numero}`}
                            </span>
                            <div className="h-[1px] flex-1 bg-slate-100"></div>
                         </div>

                         <div className="space-y-4">
                           {block.items.map((item) => (
                             <div key={item.id} className="pl-2 border-l-2 border-slate-100 ml-1">
                                <div className="flex justify-between items-start mb-2">
                                   <div className="flex-1">
                                      <p className="text-xs font-bold text-slate-800 leading-tight">{item.exercicios?.nome}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                         <input
                                           type="number"
                                           value={item.series_executadas || 0}
                                           onChange={e => updateWorkoutRecord(item, 'series_executadas', parseInt(e.target.value))}
                                           className="w-8 text-[10px] font-bold bg-slate-50 border-none p-0 focus:ring-0 text-center"
                                         />
                                         <span className="text-[8px] font-black text-slate-400 uppercase">Séries</span>
                                      </div>
                                   </div>
                                   <button
                                     onClick={() => markExclusionPending(item.id)}
                                     className={`p-1.5 rounded-lg transition-colors ${item.exclusao_pendente ? 'text-amber-500' : 'text-slate-200 hover:text-red-500 hover:bg-red-50'}`}
                                     disabled={item.exclusao_pendente}
                                   >
                                     <Trash2 size={14} />
                                   </button>
                                </div>

                                <div className="grid grid-cols-4 gap-1.5">
                                   {Array.from({ length: item.series_executadas || 0 }).map((_, i) => (
                                     <div key={i} className="bg-slate-50 rounded-xl p-1.5 flex flex-col items-center border border-slate-100">
                                        <span className="text-[7px] font-black text-slate-300 uppercase mb-0.5">S{i+1}</span>
                                        <div className="flex flex-col items-center gap-1 w-full">
                                           <div className="flex items-center gap-0.5">
                                              <input
                                               type="number"
                                               value={item.carga?.[i] || 0}
                                               onChange={e => updateSeriesValue(item, 'load', i, e.target.value)}
                                               className="bg-transparent w-7 text-center font-black text-[10px] outline-none"
                                              />
                                              <span className="text-[6px] font-bold text-slate-400 uppercase">kg</span>
                                           </div>
                                           <div className="flex items-center gap-0.5">
                                              <input
                                               type="number"
                                               value={item.repeticoes?.[i] || 0}
                                               onChange={e => updateSeriesValue(item, 'reps', i, e.target.value)}
                                               className="bg-transparent w-6 text-center font-bold text-[9px] outline-none text-orange-500"
                                              />
                                              <span className="text-[6px] font-bold text-orange-500/60 uppercase">r</span>
                                           </div>
                                           <div className="flex items-center gap-0.5 pt-1 border-t border-slate-200/50 w-full justify-center">
                                              <Clock size={6} className="text-slate-300" />
                                              <input
                                                type="number"
                                                value={Math.floor((item.tempo_execucao_segundos?.[i] || 0) / 60)}
                                                onChange={e => updateSeriesValue(item, 'exec', i, e.target.value, 'mins')}
                                                className="bg-transparent w-4 text-center text-[8px] font-bold outline-none"
                                              />
                                              <span className="text-[6px] text-slate-300">:</span>
                                              <input
                                                type="number"
                                                value={(item.tempo_execucao_segundos?.[i] || 0) % 60}
                                                onChange={e => updateSeriesValue(item, 'exec', i, e.target.value, 'secs')}
                                                className="bg-transparent w-4 text-center text-[8px] font-bold outline-none"
                                              />
                                           </div>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
             ))}
             {workoutHistory.length === 0 && (
               <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
                  <Dumbbell className="mx-auto text-slate-200 mb-2" size={32} />
                  <p className="text-sm font-bold text-slate-400">Nenhum treino registrado</p>
               </div>
             )}
               </>
             )}
          </div>
        )}

        {activeTab === "financeiro" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
            {tabErrors.financeiro ? (
               <ErrorFallback />
            ) : (
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-100">
                   <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Data</th>
                   <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Ref</th>
                   <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 text-right">Valor</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {transactions.map(t => (
                   <tr key={t.id} className="text-xs">
                     <td className="px-3 py-2 text-slate-400">{new Date(t.data_transacao).toLocaleDateString('pt-BR')}</td>
                     <td className="px-3 py-2 font-medium">{t.descricao}</td>
                     <td className={`px-3 py-2 text-right font-bold ${t.tipo === "receita" ? "text-emerald-500" : "text-red-500"}`}>
                       {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toFixed(2)}
                     </td>
                   </tr>
                 ))}
                 {transactions.length === 0 && (
                   <tr><td colSpan="3" className="px-3 py-8 text-center text-slate-400 text-xs italic">Nenhuma transação encontrada</td></tr>
                 )}
               </tbody>
             </table>
            )}
          </div>
        )}

        {activeTab === "evolucao" && (
           <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
             {tabErrors.evolucao ? (
               <ErrorFallback />
             ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Data</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400">Medida</th>
                    <th className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {measurements.map(m => (
                    <tr key={m.id} className="text-xs">
                      <td className="px-3 py-2 text-slate-400">{new Date(m.data_medida).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-2 font-medium">{m.tipos_medida?.nome}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-600">{m.valor} {m.tipos_medida?.unidade}</td>
                    </tr>
                  ))}
                  {measurements.length === 0 && (
                    <tr><td colSpan="3" className="px-3 py-8 text-center text-slate-400 text-xs italic">Sem registros de medidas</td></tr>
                  )}
                </tbody>
              </table>
             )}
           </div>
        )}

        {activeTab === "suporte" && (
          <div className="p-10 text-center space-y-3 animate-in zoom-in-95 duration-300">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <MessageSquare size={32} />
             </div>
             <p className="text-sm font-bold text-slate-400">Histórico de Chamados - Em Breve</p>
          </div>
        )}
      </main>
    </div>
  );
};

const ErrorFallback = () => (
  <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-in zoom-in-95 duration-300">
    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
      <AlertTriangle size={24} />
    </div>
    <p className="text-sm font-bold text-slate-600">Dados não disponíveis ou protegidos por privacidade</p>
    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight font-black">Restrição de Acesso Backend ativa</p>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center">
    <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5 tracking-tight">{label}</span>
    <span className="text-xs font-bold text-slate-800">{value}</span>
  </div>
);

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
      active ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "bg-white text-slate-400 border border-slate-200"
    }`}
  >
    {icon}
    {label}
  </button>
);

export default AdminUserDashboard;
