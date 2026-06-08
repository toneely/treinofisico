import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Scale,
  Ruler,
  Zap,
  Dumbbell,
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Calendar,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from "recharts";

const BodyEvolution = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [measurementTypes, setMeasurementTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [formData, setFormData] = useState({
    tipo_medida_id: null,
    valor: "",
    data_medida: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: types } = await supabase
      .from("tipos_medida")
      .select("*")
      .order("ordem");

    const { data: measures } = await supabase
      .from("historico_medidas")
      .select("*")
      .eq("user_id", user.id)
      .order("data_medida", { ascending: true });

    setMeasurementTypes(types || []);
    setHistory(measures || []);
    setLoading(false);
  };

  const handleOpenAdd = (type) => {
    const lastValue =
      history
        .filter((h) => h.tipo_medida_id === type.id)
        .slice(-1)[0]?.valor || "";

    setFormData({
      tipo_medida_id: type.id,
      valor: lastValue,
      data_medida: new Date().toISOString().split("T")[0],
    });
    setSelectedMeasurement(type);
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("historico_medidas").insert([
      {
        user_id: user.id,
        tipo_medida_id: formData.tipo_medida_id,
        valor: parseFloat(formData.valor),
        data_medida: new Date(formData.data_medida).toISOString(),
      },
    ]);

    if (error) {
      showToast("Erro ao salvar: " + error.message, "error");
    } else {
      showToast("Medida registrada!", "success");
      setShowAddModal(false);
      fetchData();
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-400">
        <Loader2 className="animate-spin mx-auto mb-2" /> Carregando evolução...
      </div>
    );

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-2 gap-4">
        {measurementTypes.map((type) => {
          const typeHistory = history.filter((h) => h.tipo_medida_id === type.id);
          const last = typeHistory[typeHistory.length - 1];
          const prev = typeHistory[typeHistory.length - 2];
          const delta = last && prev ? (last.valor - prev.valor).toFixed(1) : null;
          const isGood =
            delta !== null &&
            ((type.objetivo_diminuir && delta < 0) ||
              (!type.objetivo_diminuir && delta > 0));
          const isNeutral = delta == 0;

          return (
            <div
              key={type.id}
              className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group active:scale-95 transition-all cursor-pointer"
              onClick={() => {
                setSelectedMeasurement(type);
                setShowDetailModal(true);
              }}
            >
              {/* Sparkline Background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none -bottom-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={typeHistory.slice(-5)} margin={{ top: 40, right: 0, left: 0, bottom: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <IconRenderer name={type.icone} size={20} />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAdd(type);
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-slate-50"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                  {type.nome}
                </h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800">
                    {last?.valor || "--"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {type.unidade}
                  </span>
                </div>

                {delta !== null && (
                  <div
                    className={`flex items-center gap-1 mt-1 text-[10px] font-black ${isNeutral ? "text-slate-400" : isGood ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {delta > 0 ? (
                      <TrendingUp size={10} />
                    ) : (
                      <TrendingDown size={10} />
                    )}
                    {Math.abs(delta)} {type.unidade}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus size={20} style={{ color: "var(--color-primary)" }} />
              Registrar {selectedMeasurement?.nome}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Valor ({selectedMeasurement?.unidade})
                </label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  onFocus={(e) => e.target.select()}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold text-xl transition-all"
                  style={{ "--tw-ring-color": "var(--color-primary)" }}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Data
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    type="date"
                    value={formData.data_medida}
                    onChange={(e) =>
                      setFormData({ ...formData, data_medida: e.target.value })
                    }
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold transition-all"
                    style={{ "--tw-ring-color": "var(--color-primary)" }}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-2xl font-black shadow-lg transition-all"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  {selectedMeasurement?.nome}
                </h2>
                <p className="text-sm text-slate-400">
                  Histórico de evolução corporal
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 bg-slate-50 rounded-full text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="h-64 w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history.filter(
                    (h) => h.tipo_medida_id === selectedMeasurement?.id,
                  )}
                >
                  <XAxis
                    dataKey="data_medida"
                    tickFormatter={(str) =>
                      new Date(str).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    }
                    fontSize={10}
                    tick={{ fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    fontSize={10}
                    tick={{ fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    labelFormatter={(str) => new Date(str).toLocaleDateString("pt-BR")}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--color-primary)"
                    strokeWidth={4}
                    dot={{
                      fill: "var(--color-primary)",
                      strokeWidth: 2,
                      r: 4,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Registros Recentes
              </h3>
              <div className="space-y-2">
                {history
                  .filter((h) => h.tipo_medida_id === selectedMeasurement?.id)
                  .reverse()
                  .map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-slate-300" />
                        <span className="text-sm font-bold text-slate-600">
                          {new Date(h.data_medida).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span className="text-lg font-black text-slate-800">
                        {h.valor} {selectedMeasurement?.unidade}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IconRenderer = ({ name, size }) => {
  switch (name) {
    case "Scale":
      return <Scale size={size} />;
    case "Ruler":
      return <Ruler size={size} />;
    case "Zap":
      return <Zap size={size} />;
    case "Dumbbell":
      return <Dumbbell size={size} />;
    default:
      return <Scale size={size} />;
  }
};

export default BodyEvolution;
