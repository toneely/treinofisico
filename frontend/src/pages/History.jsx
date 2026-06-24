import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileDown,
  Activity,
  Clock,
  Dumbbell,
  History as HistoryIcon,
  User as UserIcon,
  Trash2,
  Edit2,
  Plus,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { exportHistoryToPDF } from "../utils/pdfExport";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import AdBannerPlaceholder from "../components/ui/AdBannerPlaceholder";

const History = () => {
  const { showToast } = useToast();
  const { user: authUser, isPremium } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [extraActivities, setExtraActivities] = useState([]);
  const [workoutsMetadata, setWorkoutsMetadata] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  // Export Filter States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    workoutType: "all",
  });
  const [isExporting, setIsExporting] = useState(false);

  // CRUD States
  const [isEditing, setIsEditing] = useState(null);
  const [showAddForm, setShowAddForm] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [formData, setFormData] = useState({});

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const parseTime = (timeStr) => {
    if (!timeStr || !timeStr.includes(":")) return 0;
    const [mins, secs] = timeStr.split(":").map(Number);
    return mins * 60 + (secs || 0);
  };

  useEffect(() => {
    fetchHistory();
    fetchUser();
    fetchExercises();
    fetchWorkoutsMetadata();
  }, [currentDate]);

  const fetchWorkoutsMetadata = async () => {
    const { data } = await supabase.from("treinos").select("letra");
    setWorkoutsMetadata(data || []);
  };

  const fetchUser = async () => {
    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    setUserData(
      data || {
        id: authUser.id,
        nome: authUser.user_metadata?.full_name || authUser.email,
      },
    );
  };

  const fetchExercises = async () => {
    const { data } = await supabase
      .from("exercicios")
      .select("*")
      .order("nome");
    setExercises(data || []);
  };

  const fetchHistory = async () => {
    setLoading(true);
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    ).toISOString();
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,
      59,
      59,
    ).toISOString();

    const { data: loads, error: errorLoads } = await supabase
      .from("historico_cargas")
      .select("*, exercicios(*)")
      .eq("user_id", authUser.id)
      .gte("data_treino", startOfMonth)
      .lte("data_treino", endOfMonth)
      .order("data_treino", { ascending: false });

    const { data: extras, error: errorExtras } = await supabase
      .from("registro_atividades")
      .select("*")
      .eq("user_id", authUser.id)
      .gte("data", startOfMonth)
      .lte("data", endOfMonth)
      .order("data", { ascending: false });

    if (errorLoads)
      showToast("Erro ao buscar cargas: " + errorLoads.message, "error");
    if (errorExtras)
      showToast("Erro ao buscar atividades: " + errorExtras.message, "error");

    setHistory(loads || []);
    setExtraActivities(extras || []);
    setLoading(false);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  ).getDay();
  const daysInMonth = getDaysInMonth(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDayActivities = (day) => {
    if (!day) return [];
    const workouts = history.filter(
      (h) => new Date(h.data_treino).getDate() === day,
    );
    const extras = extraActivities.filter(
      (e) => new Date(e.data).getDate() === day,
    );

    const groupedWorkouts = workouts.reduce((acc, curr) => {
      const timeKey = new Date(curr.data_treino).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const key = `${curr.letra_treino}_${timeKey}`;
      if (!acc[key]) {
        const meta = workoutsMetadata.find(
          (m) => m.letra === curr.letra_treino,
        );
        acc[key] = {
          type: "workout",
          letra: curr.letra_treino,
          time: timeKey,
          fullDate: curr.data_treino,
          items: [],
          isCoringa: meta ? meta.letra : false,
        };
      }
      acc[key].items.push(curr);
      return acc;
    }, {});

    return [
      ...Object.values(groupedWorkouts),
      ...extras.map((e) => ({
        type: "extra",
        id: e.id,
        nome: e.nome_atividade,
        time: new Date(e.data).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        fullDate: e.data,
      })),
    ].sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  };

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );

  const handleDeleteWorkout = async (letra, date) => {
    if (
      window.confirm(
        `Excluir todo o Treino ${letra} registrado em ${new Date(date).toLocaleString()}?`,
      )
    ) {
      const { error } = await supabase
        .from("historico_cargas")
        .delete()
        .eq("letra_treino", letra)
        .eq("data_treino", date)
        .eq("user_id", authUser.id);
      if (error) showToast("Erro ao excluir: " + error.message, "error");
      else {
        showToast("Treino removido do histórico", "success");
        fetchHistory();
      }
    }
  };

  const handleDeleteExercise = async (id) => {
    if (window.confirm("Excluir este registro de exercício?")) {
      const { error } = await supabase
        .from("historico_cargas")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id);
      if (error) showToast("Erro ao excluir: " + error.message, "error");
      else {
        showToast("Exercício removido", "success");
        fetchHistory();
      }
    }
  };

  const handleDeleteExtra = async (id) => {
    if (window.confirm("Excluir esta atividade?")) {
      const { error } = await supabase
        .from("registro_atividades")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id);
      if (error) showToast("Erro ao excluir: " + error.message, "error");
      else {
        showToast("Atividade removida", "success");
        fetchHistory();
      }
    }
  };

  const handleAddWorkoutRecord = async (e) => {
    e.preventDefault();
    const cargaVal =
      typeof formData.carga === "string" && formData.carga.includes(",")
        ? formData.carga.split(",").map((v) => parseFloat(v.trim()))
        : [parseFloat(formData.carga)];
    const repsVal =
      typeof formData.reps === "string" && formData.reps.includes(",")
        ? formData.reps.split(",").map((v) => parseInt(v.trim()))
        : [parseInt(formData.reps)];

    const { error } = await supabase.from("historico_cargas").insert([
      {
        user_id: authUser.id,
        exercicio_id: formData.exercicio_id,
        carga: cargaVal,
        repeticoes: repsVal,
        series_executadas: parseInt(formData.series),
        letra_treino: formData.letra || "A",
        data_treino: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          selectedDay,
          10,
          0,
        ).toISOString(),
      },
    ]);

    if (error) showToast("Erro ao adicionar: " + error.message, "error");
    else {
      showToast("Registro adicionado!", "success");
      setShowAddForm(null);
      fetchHistory();
    }
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    let error;
    if (isEditing.type === "workout") {
      const cargaVal =
        typeof formData.carga === "string" && formData.carga.includes(",")
          ? formData.carga
              .split(",")
              .map((v) => (v.trim() === "" ? null : parseFloat(v.trim())))
          : [formData.carga === "" ? null : parseFloat(formData.carga)];
      const repsVal =
        typeof formData.reps === "string" && formData.reps.includes(",")
          ? formData.reps
              .split(",")
              .map((v) => (v.trim() === "" ? null : parseInt(v.trim())))
          : [formData.reps === "" ? null : parseInt(formData.reps)];

      const { error: err } = await supabase
        .from("historico_cargas")
        .update({
          carga: cargaVal,
          repeticoes: repsVal,
          series_executadas: parseInt(formData.series),
        })
        .eq("id", isEditing.item.id)
        .eq("user_id", authUser.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from("registro_atividades")
        .update({ nome_atividade: formData.nome })
        .eq("id", isEditing.item.id)
        .eq("user_id", authUser.id);
      error = err;
    }

    if (error) showToast("Erro ao atualizar: " + error.message, "error");
    else {
      showToast("Registro atualizado!", "success");
      setIsEditing(null);
      fetchHistory();
    }
  };

  const updateHistorySeriesValue = async (
    item,
    type,
    sIdx,
    val,
    part = "all",
  ) => {
    const updatedFields = {};
    let value;

    if (type === "exec" || type === "rest") {
      const currentArr =
        type === "exec"
          ? [...(item.tempo_execucao_segundos || [])]
          : [...(item.tempo_descanso_segundos || [])];
      const currentSeconds = currentArr[sIdx] || 0;
      const mins = Math.floor(currentSeconds / 60);
      const secs = currentSeconds % 60;

      if (part === "mins") {
        value = (parseInt(val) || 0) * 60 + secs;
      } else if (part === "secs") {
        value = mins * 60 + (parseInt(val) || 0);
      } else {
        value =
          val === ""
            ? null
            : typeof val === "string" && val.includes(":")
              ? parseTime(val)
              : parseInt(val);
      }
    } else if (type === "load") {
      value = val === "" ? null : parseFloat(val);
    } else {
      value = val === "" ? null : parseInt(val);
    }

    if (type === "load") {
      const arr = Array.isArray(item.carga)
        ? [...item.carga]
        : [item.carga_utilizada];
      arr[sIdx] = value;
      updatedFields.carga = arr;
    } else if (type === "reps") {
      const arr = Array.isArray(item.repeticoes)
        ? [...item.repeticoes]
        : [item.repeticoes_feitas];
      arr[sIdx] = value;
      updatedFields.repeticoes = arr;
    } else if (type === "exec") {
      const arr = [...(item.tempo_execucao_segundos || [])];
      arr[sIdx] = value;
      updatedFields.tempo_execucao_segundos = arr;
    } else if (type === "rest") {
      const arr = [...(item.tempo_descanso_segundos || [])];
      arr[sIdx] = value;
      updatedFields.tempo_descanso_segundos = arr;
    }

    setHistory((prev) =>
      prev.map((h) => (h.id === item.id ? { ...h, ...updatedFields } : h)),
    );

    const { error } = await supabase
      .from("historico_cargas")
      .update(updatedFields)
      .eq("id", item.id)
      .eq("user_id", authUser.id);

    if (error) {
      showToast("Erro ao atualizar: " + error.message, "error");
      fetchHistory();
    }
  };

  const handleAddExtraRecord = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("registro_atividades").insert([
      {
        user_id: authUser.id,
        nome_atividade: formData.nome || userData.atividade_alternativa,
        data: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          selectedDay,
          19,
          0,
        ).toISOString(),
      },
    ]);

    if (error) showToast("Erro ao adicionar: " + error.message, "error");
    else {
      showToast("Atividade registrada!", "success");
      setShowAddForm(null);
      fetchHistory();
    }
  };

  const inheritLastData = async (exercicioId) => {
    const { data } = await supabase
      .from("historico_cargas")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("exercicio_id", exercicioId)
      .order("data_treino", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setFormData((prev) => ({
        ...prev,
        carga: Array.isArray(data[0].carga)
          ? data[0].carga[data[0].carga.length - 1]
          : data[0].carga_utilizada,
        reps: Array.isArray(data[0].repeticoes)
          ? data[0].repeticoes[data[0].repeticoes.length - 1]
          : data[0].repeticoes_feitas,
        series: data[0].series_executadas || 3,
      }));
      showToast("Dados herdados da última execução!", "info");
    }
  };

  const handleGenerateFilteredPDF = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from("historico_cargas")
        .select("*, exercicios(*)")
        .eq("user_id", authUser.id)
        .order("data_treino", { ascending: false });

      if (exportFilters.startDate) {
        query = query.gte("data_treino", `${exportFilters.startDate}T00:00:00`);
      }
      if (exportFilters.endDate) {
        query = query.lte("data_treino", `${exportFilters.endDate}T23:59:59`);
      }
      if (exportFilters.workoutType !== "all") {
        query = query.eq("letra_treino", exportFilters.workoutType);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        showToast("Nenhum treino encontrado para este período", "info");
        return;
      }

      exportHistoryToPDF(userData, data);
      setShowExportModal(false);
      showToast("PDF gerado com sucesso!", "success");
    } catch (err) {
      showToast("Erro ao exportar PDF: " + err.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="p-6 max-w-md mx-auto"
      style={{ paddingBottom: isPremium ? "96px" : "164px" }}
    >
      <header className="mb-6 flex justify-between items-center">
        <Link
          to="/inicio"
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:opacity-70 transition"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold ">Histórico</h1>
        <button
          onClick={() => setShowExportModal(true)}
          className="p-2 rounded-xl shadow-lg transition-all active:scale-95"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--text-on-primary)",
          }}
        >
          <FileDown size={18} />
        </button>
      </header>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold  flex items-center gap-2">
            <CalendarIcon size={18} style={{ color: "var(--color-primary)" }} />
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d) => (
            <span
              key={d}
              className="text-[10px] font-black text-slate-300 uppercase"
            >
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const activities = getDayActivities(day);
            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative ${
                  !day
                    ? "invisible"
                    : selectedDay === day
                      ? ""
                      : "text-slate-400 hover:bg-slate-50"
                }`}
                style={
                  selectedDay === day
                    ? {
                        backgroundColor: "var(--color-primary)",
                        color: "var(--text-on-primary)",
                      }
                    : {}
                }
              >
                {day}
                {day && (
                  <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-wrap content-start p-0.5 pointer-events-none overflow-hidden">
                    {activities.map((act, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 m-0.5 rounded-sm flex items-center justify-center text-[6px] font-black text-white shadow-sm"
                        style={{
                          backgroundColor:
                            act.type === "extra"
                              ? "var(--color-secondary)"
                              : "var(--color-primary)",
                        }}
                      >
                        {act.type === "extra" ? (
                          <Activity size={6} />
                        ) : (
                          act.letra
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Dia {selectedDay} de {monthNames[currentDate.getMonth()]}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddForm("workout");
                  setFormData({ exercicio_id: exercises[0]?.id });
                }}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 text-slate-600"
              >
                <Plus size={14} /> Treino
              </button>
              <button
                onClick={() => {
                  setShowAddForm("extra");
                  setFormData({ nome: userData.atividade_alternativa });
                }}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 text-slate-600"
              >
                <Plus size={14} /> Extra
              </button>
            </div>
          </div>

          {showAddForm && (
            <div
              className="bg-white p-4 rounded-2xl border-2 shadow-xl animate-in zoom-in-95 duration-200"
              style={{ borderColor: "var(--color-primary)" }}
            >
              <div className="flex justify-between items-center mb-4">
                <h4
                  className="font-bold"
                  style={{ color: "var(--color-primary)" }}
                >
                  {showAddForm === "workout"
                    ? "Adicionar Exercício"
                    : "Registrar Atividade"}
                </h4>
                <button onClick={() => setShowAddForm(null)}>
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={
                  showAddForm === "workout"
                    ? handleAddWorkoutRecord
                    : handleAddExtraRecord
                }
                className="space-y-3"
              >
                {showAddForm === "workout" ? (
                  <>
                    <select
                      value={formData.exercicio_id}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          exercicio_id: e.target.value,
                        });
                        inheritLastData(e.target.value);
                      }}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold outline-none"
                    >
                      {exercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.nome}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Carga"
                        value={formData.carga || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, carga: e.target.value })
                        }
                        className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Reps"
                        value={formData.reps || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, reps: e.target.value })
                        }
                        className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Séries"
                        value={formData.series || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, series: e.target.value })
                        }
                        className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold"
                      />
                    </div>
                  </>
                ) : (
                  <input
                    type="text"
                    placeholder="Nome da Atividade"
                    value={formData.nome || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold outline-none"
                  />
                )}
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl font-bold shadow-md transition-all active:scale-95"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }}
                >
                  Salvar Registro
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {getDayActivities(selectedDay).map((act, idx) => (
              <div key={idx} className="space-y-2">
                {act.type === "workout" ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div
                      className="px-4 py-2 flex justify-between items-center"
                      style={{
                        backgroundColor: "var(--color-primary)"
                          ? "var(--color-primary)"
                          : "#1e293b",
                        color: "white",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg">
                          TREINO {act.letra}
                        </span>
                        <span className="text-[10px] opacity-70 uppercase font-bold tracking-tighter">
                          às {act.time}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteWorkout(act.letra, act.fullDate)
                        }
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-3 space-y-3">
                      {act.items.map((item, i) => (
                        <div
                          key={i}
                          className="border-b border-slate-50 last:border-0 pb-3 last:pb-0 group"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="text-sm font-bold ">
                                {item.exercicios.nome}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                Total: {item.series_executadas} séries
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-lg font-mono font-black"
                                style={{ color: "var(--color-primary)" }}
                              >
                                {Array.isArray(item.carga)
                                  ? item.carga[item.carga.length - 1]
                                  : item.carga_utilizada || 0}
                                kg
                              </span>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => {
                                    setIsEditing({ type: "workout", item });
                                    setFormData({
                                      carga: Array.isArray(item.carga)
                                        ? item.carga.join(", ")
                                        : item.carga_utilizada || 0,
                                      reps: Array.isArray(item.repeticoes)
                                        ? item.repeticoes.join(", ")
                                        : item.repeticoes_feitas || 0,
                                      series: item.series_executadas,
                                    });
                                  }}
                                  className="p-1 text-slate-300 transition-colors"
                                  style={{ color: "var(--color-primary)" }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteExercise(item.id)}
                                  className="p-1 text-slate-300 hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            {(item.tempo_execucao_segundos || []).map(
                              (t, sIdx) => {
                                const rest = (item.tempo_descanso_segundos ||
                                  [])[sIdx];
                                const load = Array.isArray(item.carga)
                                  ? item.carga[sIdx]
                                  : item.carga_utilizada;
                                const reps = Array.isArray(item.repeticoes)
                                  ? item.repeticoes[sIdx]
                                  : item.repeticoes_feitas;
                                return (
                                  <div
                                    key={sIdx}
                                    className="bg-slate-50 rounded-2xl p-2.5 flex flex-col items-center border border-slate-100"
                                  >
                                    <span className="text-[8px] font-black text-slate-300 uppercase mb-1">
                                      S{sIdx + 1}
                                    </span>
                                    <div className="flex flex-col items-center mb-2">
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          value={load || ""}
                                          placeholder="-"
                                          onChange={(e) =>
                                            updateHistorySeriesValue(
                                              item,
                                              "load",
                                              sIdx,
                                              e.target.value,
                                            )
                                          }
                                          className="bg-transparent w-8 text-center font-black text-[11px] outline-none  placeholder:text-slate-300"
                                        />
                                        <span className="text-[8px] font-bold text-slate-400">
                                          kg
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          value={reps || ""}
                                          placeholder="-"
                                          onChange={(e) =>
                                            updateHistorySeriesValue(
                                              item,
                                              "reps",
                                              sIdx,
                                              e.target.value,
                                            )
                                          }
                                          className="bg-transparent w-6 text-center font-bold text-[10px] outline-none placeholder:text-slate-300"
                                          style={{
                                            color: "var(--color-primary)",
                                          }}
                                        />
                                        <span
                                          className="text-[7px] font-bold uppercase"
                                          style={{
                                            color: "var(--color-primary)",
                                            opacity: 0.6,
                                          }}
                                        >
                                          reps
                                        </span>
                                      </div>
                                    </div>
                                    <div className="w-full pt-2 border-t border-slate-200/50 flex flex-col items-center gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <Clock
                                          size={8}
                                          className="text-slate-300"
                                        />
                                        <div className="flex items-center gap-0.5">
                                          <input
                                            type="number"
                                            value={
                                              t !== null && t !== undefined
                                                ? Math.floor(t / 60)
                                                : ""
                                            }
                                            placeholder="0"
                                            onChange={(e) =>
                                              updateHistorySeriesValue(
                                                item,
                                                "exec",
                                                sIdx,
                                                e.target.value,
                                                "mins",
                                              )
                                            }
                                            onFocus={(e) => e.target.select()}
                                            className="bg-transparent w-4 text-right font-mono font-bold text-[9px] outline-none text-slate-500 placeholder:text-slate-300"
                                          />
                                          <span className="text-[9px] font-bold opacity-30">
                                            :
                                          </span>
                                          <input
                                            type="number"
                                            value={
                                              t !== null && t !== undefined
                                                ? String(t % 60).padStart(
                                                    2,
                                                    "0",
                                                  )
                                                : ""
                                            }
                                            placeholder="00"
                                            onChange={(e) =>
                                              updateHistorySeriesValue(
                                                item,
                                                "exec",
                                                sIdx,
                                                e.target.value,
                                                "secs",
                                              )
                                            }
                                            onFocus={(e) => e.target.select()}
                                            className="bg-transparent w-5 text-left font-mono font-bold text-[9px] outline-none text-slate-500 placeholder:text-slate-300"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <input
                                          type="number"
                                          value={
                                            rest !== null && rest !== undefined
                                              ? Math.floor(rest / 60)
                                              : ""
                                          }
                                          placeholder="0"
                                          onChange={(e) =>
                                            updateHistorySeriesValue(
                                              item,
                                              "rest",
                                              sIdx,
                                              e.target.value,
                                              "mins",
                                            )
                                          }
                                          onFocus={(e) => e.target.select()}
                                          className="bg-transparent w-4 text-right font-mono font-bold text-[8px] outline-none placeholder:text-slate-300"
                                        />
                                        <span className="text-[8px] font-bold opacity-30">
                                          :
                                        </span>
                                        <input
                                          type="number"
                                          value={
                                            rest !== null && rest !== undefined
                                              ? String(rest % 60).padStart(
                                                  2,
                                                  "0",
                                                )
                                              : ""
                                          }
                                          placeholder="00"
                                          onChange={(e) =>
                                            updateHistorySeriesValue(
                                              item,
                                              "rest",
                                              sIdx,
                                              e.target.value,
                                              "secs",
                                            )
                                          }
                                          onFocus={(e) => e.target.select()}
                                          className="bg-transparent w-5 text-left font-mono font-bold text-[8px] outline-none placeholder:text-slate-300"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl p-4 flex justify-between items-center text-white shadow-lg"
                    style={{ backgroundColor: "var(--color-secondary)", color: "var(--text-on-secondary)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Activity size={20} />
                      </div>
                      <div>
                        <p className="font-black text-lg leading-tight">
                          {act.nome}
                        </p>
                        <p className="text-[10px] opacity-70 uppercase font-bold">
                          Atividade Alternativa • {act.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setIsEditing({ type: "extra", item: act });
                          setFormData({ nome: act.nome });
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteExtra(act.id)}
                        className="p-2 hover:bg-white/10 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {getDayActivities(selectedDay).length === 0 && (
              <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                <Activity className="mx-auto mb-2 opacity-20" size={40} />
                <p className="text-sm font-medium">
                  Nenhum registro para este dia.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Filter Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold ">Exportar PDF</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase opacity-50 mb-1 block">
                  Período
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={exportFilters.startDate}
                    onChange={(e) =>
                      setExportFilters({
                        ...exportFilters,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none"
                  />
                  <input
                    type="date"
                    value={exportFilters.endDate}
                    onChange={(e) =>
                      setExportFilters({
                        ...exportFilters,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase opacity-50 mb-1 block">
                  Tipo de Treino
                </label>
                <select
                  value={exportFilters.workoutType}
                  onChange={(e) =>
                    setExportFilters({
                      ...exportFilters,
                      workoutType: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none appearance-none outline-none"
                >
                  <option value="all">Todos os Treinos</option>
                  {workoutsMetadata.map((w) => (
                    <option key={w.letra} value={w.letra}>
                      Treino {w.letra}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGenerateFilteredPDF}
                disabled={isExporting}
                className="w-full py-4 rounded-2xl font-bold shadow-lg mt-4 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--text-on-primary)",
                }}
              >
                {isExporting ? (
                  <RotateCcw size={18} className="animate-spin" />
                ) : (
                  <FileDown size={18} />
                )}
                {isExporting ? "Processando..." : "Gerar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold  mb-6">Editar Registro</h2>
            <form onSubmit={handleUpdateRecord} className="space-y-4">
              {isEditing.type === "workout" ? (
                <>
                  <p className="text-sm font-bold text-slate-500">
                    {isEditing.item.exercicios.nome}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase opacity-50">
                        Carga (kg)
                      </label>
                      <input
                        type="text"
                        value={formData.carga}
                        onChange={(e) =>
                          setFormData({ ...formData, carga: e.target.value })
                        }
                        className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg outline-none focus:ring-2"
                        style={{
                          color: "var(--text-on-gestao)",
                          "--tw-ring-color": "var(--color-primary)",
                        }}
                      />
                      <p className="text-[8px] mt-1 text-slate-400 font-bold uppercase">
                        Separe por vírgula para várias séries
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase opacity-50">
                          Repetições
                        </label>
                        <input
                          type="text"
                          value={formData.reps}
                          onChange={(e) =>
                            setFormData({ ...formData, reps: e.target.value })
                          }
                          className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg outline-none focus:ring-2"
                          style={{
                            color: "var(--text-on-gestao)",
                            "--tw-ring-color": "var(--color-primary)",
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase opacity-50">
                          Séries
                        </label>
                        <input
                          type="number"
                          value={formData.series}
                          onChange={(e) =>
                            setFormData({ ...formData, series: e.target.value })
                          }
                          className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg outline-none focus:ring-2"
                          style={{
                            color: "var(--text-on-gestao)",
                            "--tw-ring-color": "var(--color-primary)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[10px] font-bold uppercase opacity-50">
                    Nome da Atividade
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg outline-none focus:ring-2"
                    style={{
                      color: "var(--text-on-gestao)",
                      "--tw-ring-color": "var(--color-primary)",
                    }}
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold transition-all hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
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

      {!isPremium && <AdBannerPlaceholder />}

      {/* Footer Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center z-50">
        <Link
          to="/inicio"
          className="text-slate-400 hover:opacity-80 flex flex-col items-center gap-1"
        >
          <Dumbbell size={24} />
          <span className="text-[10px] font-bold uppercase">Treinos</span>
        </Link>
        <Link
          to="/historico"
          className="flex flex-col items-center gap-1"
          style={{ color: "var(--color-primary-safe)" }}
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

export default History;
